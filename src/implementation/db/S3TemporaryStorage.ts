import { Readable } from 'stream';

import {
    ITemporaryFileStorage,
    IUser,
    ITemporaryFile,
    Permission
} from '../../types';
import { ReadStream } from 'fs';
import { validateFilename } from './S3Utils';
import Logger from '../../helpers/Logger';
import H5pError from '../../helpers/H5pError';

const log = new Logger('S3TemporaryStorage');

export default class S3TemporaryStorage implements ITemporaryFileStorage {
    constructor(
        private s3: AWS.S3,
        private options: {
            getPermissions?: (
                userId: string,
                filename?: string
            ) => Promise<Permission[]>;
            /**
             * The ACL to use for uploaded content files. Defaults to private.
             */
            s3Acl?: string;
            /**
             * The bucket to upload to and download from. (required)
             */
            s3Bucket: string;
        }
    ) {}
    async deleteFile(filename: string, userId: string): Promise<void> {
        log.debug(`Deleting file "${filename}" from temporary storage.`);
        if (
            !(await this.getUserPermissions(userId, filename)).includes(
                Permission.Edit
            )
        ) {
            log.error(
                `User tried to delete a file from a temporary storage without proper permissions.`
            );
            throw new H5pError(
                's3-temporary-storage:missing-write-permission',
                {},
                403
            );
        }

        try {
            await this.s3
                .deleteObject({
                    Bucket: this.options?.s3Bucket,
                    Key: filename
                })
                .promise();
        } catch (error) {
            log.error(
                `Error while deleting a file from S3 storage: ${error.message}`
            );
            throw new H5pError(
                's3-temporary-storage:deleting-file-error',
                { filename },
                500
            );
        }
    }
    async fileExists(filename: string, user: IUser): Promise<boolean> {
        log.debug(`Checking if file ${filename} exists in temporary storage.`);
        validateFilename(filename);

        if (!filename) {
            log.error(`Filename empty!`);
            return false;
        }

        try {
            await this.s3
                .headObject({
                    Bucket: this.options?.s3Bucket,
                    Key: filename
                })
                .promise();
        } catch (error) {
            log.debug(
                `File "${filename}" does not exist in temporary storage.`
            );
            return false;
        }
        log.debug(`File "${filename}" does exist in temporary storage.`);
        return true;
    }
    async getFileStream(filename: string, user: IUser): Promise<Readable> {
        log.debug(`Getting stream for temporary file "${filename}".`);
        validateFilename(filename);

        if (!filename) {
            log.error(`Filename empty!`);
            throw new H5pError(
                's3-temporary-storage:content-not-found',
                {},
                404
            );
        }

        if (
            !(await this.getUserPermissions(user.id, filename)).includes(
                Permission.View
            )
        ) {
            log.error(
                `User tried to display a file from a content object without proper permissions.`
            );
            throw new H5pError(
                's3-temporary-storage:missing-view-permission',
                {},
                403
            );
        }

        return this.s3
            .getObject({
                Bucket: this.options?.s3Bucket,
                Key: filename
            })
            .createReadStream();
    }

    public async getUserPermissions(
        userId: string,
        filename?: string
    ): Promise<Permission[]> {
        log.debug(
            `Getting temporary storage permissions for userId ${userId}.`
        );
        if (this.options?.getPermissions) {
            log.debug(
                `Using function passed in through constructor to get permissions.`
            );
            return this.options.getPermissions(userId, filename);
        }
        log.debug(
            `No permission function set in constructor. Allowing everything.`
        );
        return [
            Permission.Delete,
            Permission.Edit,
            Permission.List,
            Permission.View
        ];
    }
    async listFiles(user?: IUser): Promise<ITemporaryFile[]> {
        // As S3 files expire automatically, we don't need to return any file here.
        return [];
    }
    public async saveFile(
        filename: string,
        dataStream: ReadStream,
        user: IUser,
        expirationTime: Date
    ): Promise<ITemporaryFile> {
        log.debug(`Saving temporary file "${filename}."`);
        validateFilename(filename);
        if (
            !(await this.getUserPermissions(user.id, filename)).includes(
                Permission.Edit
            )
        ) {
            log.error(
                `User tried upload file to temporary storage without proper permissions.`
            );
            throw new H5pError(
                'mongo-s3-temporary-storage:missing-write-permission',
                {},
                403
            );
        }

        try {
            await this.s3
                .upload({
                    ACL: this.options?.s3Acl ?? 'private',
                    Body: dataStream,
                    Bucket: this.options?.s3Bucket,
                    Key: filename,
                    Metadata: {
                        creator: user.id
                    },
                    Expires: expirationTime
                })
                .promise();
            return {
                filename,
                ownedByUserId: user.id,
                expiresAt: expirationTime
            };
        } catch (error) {
            log.error(
                `Error while uploading file "${filename}" to S3 storage: ${error.message}`
            );
            throw new H5pError(`s3-upload-error`, { filename }, 500);
        }
    }
}
