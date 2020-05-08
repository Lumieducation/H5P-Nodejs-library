import MongoDB, { ObjectId } from 'mongodb';
import { Stream, Readable } from 'stream';
import AWS from 'aws-sdk';
// tslint:disable-next-line: no-submodule-imports
import { PromiseResult } from 'aws-sdk/lib/request';

import {
    ContentId,
    IContentMetadata,
    IContentStorage,
    IUser,
    Permission
} from '../../types';
import Logger from '../../helpers/Logger';
import H5pError from '../../helpers/H5pError';
import { validateFilename } from './S3Utils';

const log = new Logger('MongoS3ContentStorage');

/**
 * This storage implementation stores content data in a MongoDB collection
 * and a S3 bucket.
 * The parameters and metadata of a H5P content object are stored in MongoDB,
 * while all files are put into S3 storage.
 */
export default class MongoS3ContentStorage implements IContentStorage {
    /**
     * @param s3 the S3 content storage; Must be either set to a bucket or the
     * bucket must be specified in the options!
     * @param mongodb a MongoDB collection (read- and writable)
     * @param options options
     */
    constructor(
        private s3: AWS.S3,
        private mongodb: MongoDB.Collection,
        private options: {
            /**
             * If set, the function is called to retrieve a list of permissions
             * a user has on a certain content object.
             * This function can function as an adapter to your rights and
             * privileges system.
             */
            getPermissions?: (
                contentId: ContentId,
                user: IUser
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
    ) {
        log.info('initialize');
    }

    /**
     * Generates the S3 key for a file in a content object
     * @param contentId
     * @param filename
     * @returns the S3 key
     */
    private static getS3Key(contentId: ContentId, filename: string): string {
        const key = `${contentId}/${filename}`;
        if (key.length > 1024) {
            log.error(
                `The S3 key for "${filename}" in content object with id ${contentId} is ${key.length} bytes long, but only 1024 are allowed.`
            );
            throw new H5pError(
                'mongo-s3-content-storage:filename-too-long',
                { filename },
                400
            );
        }
        return key;
    }

    /**
     * Creates or updates a content object in the repository. Throws an error if
     * something went wrong.
     * @param metadata The metadata of the content (= h5p.json)
     * @param content the content object (= content/content.json)
     * @param user The user who owns this object.
     * @param contentId (optional) The content id to use
     * @returns The newly assigned content id
     */
    public async addContent(
        metadata: IContentMetadata,
        content: any,
        user: IUser,
        contentId?: ContentId
    ): Promise<ContentId> {
        if (
            !(await this.getUserPermissions(contentId, user)).includes(
                Permission.Edit
            )
        ) {
            log.error(`User tried add content without proper permissions.`);
            throw new H5pError(
                'mongo-s3-content-storage:missing-write-permission',
                {},
                403
            );
        }

        try {
            if (!contentId) {
                log.debug(`Inserting new content into MongoDB.`);
                const insertResult = await this.mongodb.insertOne({
                    metadata,
                    parameters: content,
                    creator: user.id
                });
                log.debug(`Content inserted into MongoDB.`);
                return insertResult.insertedId.toString();
            }

            log.debug(
                `Replacing existing content with id ${contentId} in MongoDB.`
            );
            const replaceResult = await this.mongodb.replaceOne(
                { _id: new ObjectId(contentId) },
                {
                    metadata,
                    _id: new ObjectId(contentId),
                    parameters: content,
                    creator: user.id
                },
                { upsert: true }
            );
            if (replaceResult.result.ok) {
                return contentId;
            }
            log.error(
                `Error when replacing existing content with id ${contentId} in MongoDB`
            );
            throw new H5pError(
                'mongo-s3-content-storage:mongo-replace-error',
                {},
                500
            );
        } catch (error) {
            log.error(
                `Error when adding or updating content in MongoDB: ${error.message}`
            );
            throw new H5pError(
                'mongo-s3-content-storage:mongo-add-update-error',
                {},
                500
            );
        }
    }

    /**
     * Adds a content file to an existing content object. Throws an error if
     * something went wrong.
     * @param contentId The id of the content to add the file to
     * @param filename The filename
     * @param stream A readable stream that contains the data
     * @param user The user who owns this object
     * @returns
     */
    public async addFile(
        contentId: ContentId,
        filename: string,
        stream: Stream,
        user: IUser
    ): Promise<void> {
        log.debug(
            `Uploading file "${filename}" for content with id ${contentId} to S3 storage.`
        );
        validateFilename(filename);

        if (
            !(await this.getUserPermissions(contentId, user)).includes(
                Permission.Edit
            )
        ) {
            log.error(
                `User tried to upload a file without proper permissions.`
            );
            throw new H5pError(
                'mongo-s3-content-storage:missing-write-permission',
                {},
                403
            );
        }

        try {
            await this.s3
                .upload({
                    ACL: this.options?.s3Acl ?? 'private',
                    Body: stream,
                    Bucket: this.options?.s3Bucket,
                    Key: MongoS3ContentStorage.getS3Key(contentId, filename),
                    Metadata: {
                        owner: user.id
                    }
                })
                .promise();
        } catch (error) {
            log.error(
                `Error while uploading file "${filename}" to S3 storage: ${error.message}`
            );
            throw new H5pError(`s3-upload-error`, { filename }, 500);
        }
    }

    /**
     * Checks if a piece of content exists in storage.
     * @param contentId the content id to check
     * @returns true if the piece of content exists
     */
    public async contentExists(contentId: ContentId): Promise<boolean> {
        log.debug(`Checking if content object with id ${contentId} exists.`);
        const foundDoc = await this.mongodb.findOne(
            {
                _id: new ObjectId(contentId)
            },
            { projection: { _id: true } }
        );
        if (foundDoc) {
            log.debug(`Content object with id ${contentId} exists.`);
            return true;
        }
        log.debug(`Content object with id ${contentId} does not exist.`);
        return false;
    }

    /**
     * Deletes a content object and all its dependent files from the repository.
     * Throws errors if something goes wrong.
     * @param contentId The content id to delete.
     * @param user The user who wants to delete the content
     * @returns
     */
    public async deleteContent(
        contentId: ContentId,
        user?: IUser
    ): Promise<void> {
        log.debug(`Deleting content with id ${contentId}.`);
        if (
            !(await this.getUserPermissions(contentId, user)).includes(
                Permission.Delete
            )
        ) {
            log.error(
                `User tried to delete a content object without proper permissions.`
            );
            throw new H5pError(
                'mongo-s3-content-storage:missing-delete-permission',
                {},
                403
            );
        }
        try {
            const filesToDelete = await this.listFiles(contentId, user);
            log.debug(
                `${filesToDelete.length} files in S3 storage must be deleted.`
            );
            // S3 batch deletes only work with 1000 files at a time, so we
            // might have to do this in several requests.
            while (filesToDelete.length > 0) {
                const next1000Files = filesToDelete.splice(0, 1000);
                if (next1000Files.length > 0) {
                    log.debug(
                        `Batch deleting ${next1000Files.length} file(s) in S3 storage.`
                    );
                    const deleteFilesRes = await this.s3
                        .deleteObjects({
                            Bucket: this.options?.s3Bucket,
                            Delete: {
                                Objects: next1000Files.map((f) => {
                                    return {
                                        Key: MongoS3ContentStorage.getS3Key(
                                            contentId,
                                            f
                                        )
                                    };
                                })
                            }
                        })
                        .promise();
                    if (deleteFilesRes.Errors.length > 0) {
                        log.error(
                            `There were errors while deleting files in S3 storage. The delete operation will continue.\nErrors:${deleteFilesRes.Errors.map(
                                (e) => `${e.Key}: ${e.Code} - ${e.Message}`
                            ).join('\n')}`
                        );
                    }
                }
            }
            if (
                (await this.mongodb.deleteOne({ _id: new ObjectId(contentId) }))
                    .deletedCount !== 1
            ) {
                throw new Error('MongoDB document could not be deleted.');
            }
        } catch (error) {
            log.error(
                `There was an error while deleting the content object: ${error.message}`
            );
            throw new H5pError(
                'mongo-s3-content-storage:deleting-content-error',
                {},
                500
            );
        }
    }

    /**
     * Deletes a file from a content object.
     * @param contentId the content object the file is attached to
     * @param filename the file to delete
     */
    public async deleteFile(
        contentId: ContentId,
        filename: string,
        user?: IUser
    ): Promise<void> {
        log.debug(
            `Deleting file "${filename}" from content with id ${contentId}.`
        );
        if (
            !(await this.getUserPermissions(contentId, user)).includes(
                Permission.Edit
            )
        ) {
            log.error(
                `User tried to delete a file from a content object without proper permissions.`
            );
            throw new H5pError(
                'mongo-s3-content-storage:missing-write-permission',
                {},
                403
            );
        }

        try {
            await this.s3
                .deleteObject({
                    Bucket: this.options?.s3Bucket,
                    Key: MongoS3ContentStorage.getS3Key(contentId, filename)
                })
                .promise();
        } catch (error) {
            log.error(
                `Error while deleting a file from S3 storage: ${error.message}`
            );
            throw new H5pError(
                'mongo-s3-content-storage:deleting-file-error',
                { filename },
                500
            );
        }
    }

    /**
     * Checks if a file exists.
     * @param contentId The id of the content to add the file to
     * @param filename the filename of the file to get
     * @returns true if the file exists
     */
    public async fileExists(
        contentId: ContentId,
        filename: string
    ): Promise<boolean> {
        log.debug(
            `Checking if file ${filename} exists in content with id ${contentId}.`
        );
        validateFilename(filename);

        if (!contentId) {
            log.error(`ContentId not set!`);
            throw new H5pError(
                'mongo-s3-content-storage:content-not-found',
                {},
                404
            );
        }

        try {
            await this.s3
                .headObject({
                    Bucket: this.options?.s3Bucket,
                    Key: MongoS3ContentStorage.getS3Key(contentId, filename)
                })
                .promise();
        } catch (error) {
            log.debug(`File ${filename} does not exist in ${contentId}.`);
            return false;
        }
        log.debug(`File ${filename} does exist in ${contentId}.`);
        return true;
    }

    /**
     * Returns a readable stream of a content file (e.g. image or video) inside a piece of content
     * @param contentId the id of the content object that the file is attached to
     * @param filename the filename of the file to get
     * @param user the user who wants to retrieve the content file
     * @returns
     */
    public async getFileStream(
        contentId: ContentId,
        filename: string,
        user: IUser
    ): Promise<Readable> {
        log.debug(
            `Getting stream for file "${filename}" in content ${contentId}.`
        );
        validateFilename(filename);

        if (!contentId) {
            log.error(`ContentId not set!`);
            throw new H5pError(
                'mongo-s3-content-storage:content-not-found',
                {},
                404
            );
        }

        if (
            !(await this.getUserPermissions(contentId, user)).includes(
                Permission.View
            )
        ) {
            log.error(
                `User tried to display a file from a content object without proper permissions.`
            );
            throw new H5pError(
                'mongo-s3-content-storage:missing-view-permission',
                {},
                403
            );
        }

        return this.s3
            .getObject({
                Bucket: this.options?.s3Bucket,
                Key: MongoS3ContentStorage.getS3Key(contentId, filename)
            })
            .createReadStream();
    }

    public async getMetadata(
        contentId: string,
        user?: IUser
    ): Promise<IContentMetadata> {
        log.debug(`Getting metadata for content with id ${contentId}.`);
        if (
            !(await this.getUserPermissions(contentId, user)).includes(
                Permission.View
            )
        ) {
            log.error(
                `User tried to get metadata of a content object without proper permissions.`
            );
            throw new H5pError(
                'mongo-s3-content-storage:missing-view-permission',
                {},
                403
            );
        }

        try {
            const ret = await this.mongodb.findOne({
                _id: new ObjectId(contentId)
            });
            return ret.metadata;
        } catch (error) {
            log.error(`Content with id ${contentId} does not exist.`);
            throw new H5pError(
                'mongo-s3-content-storage:content-not-found',
                {},
                404
            );
        }
    }
    public async getParameters(contentId: string, user?: IUser): Promise<any> {
        log.debug(`Getting parameters for content with id ${contentId}.`);
        if (
            !(await this.getUserPermissions(contentId, user)).includes(
                Permission.View
            )
        ) {
            log.error(
                `User tried to get parameters of a content object without proper permissions.`
            );
            throw new H5pError(
                'mongo-s3-content-storage:missing-view-permission',
                {},
                403
            );
        }

        try {
            const ret = await this.mongodb.findOne({
                _id: new ObjectId(contentId)
            });
            return ret.parameters;
        } catch (error) {
            log.error(`ContentId ${contentId} does not exist.`);
            throw new H5pError(
                'mongo-s3-content-storage:content-not-found',
                {},
                404
            );
        }
    }

    /**
     * Returns an array of permissions that the user has on the piece of content
     * @param contentId the content id to check
     * @param user the user who wants to access the piece of content
     * @returns the permissions the user has for this content (e.g. download it, delete it etc.)
     */
    public async getUserPermissions(
        contentId: ContentId,
        user: IUser
    ): Promise<Permission[]> {
        log.debug(`Getting user permissions for content with id ${contentId}.`);
        if (this.options?.getPermissions) {
            log.debug(
                `Using function passed in through constructor to get permissions.`
            );
            return this.options.getPermissions(contentId, user);
        }
        log.debug(
            `No permission function set in constructor. Allowing everything.`
        );
        return [
            Permission.Delete,
            Permission.Download,
            Permission.Edit,
            Permission.Embed,
            Permission.List,
            Permission.View
        ];
    }

    public async listContent(user?: IUser): Promise<ContentId[]> {
        log.debug(`Listing content objects.`);
        if (
            !(await this.getUserPermissions(undefined, user)).includes(
                Permission.View
            )
        ) {
            log.error(
                `User tried to list all content objects without proper permissions.`
            );
            throw new H5pError(
                'mongo-s3-content-storage:missing-list-content-permission',
                {},
                403
            );
        }

        try {
            const cursor = this.mongodb.find({}, { projection: { _id: true } });
            return (await cursor.toArray()).map((match) =>
                match._id.toHexString()
            );
        } catch (error) {
            log.error(
                `Error while listing all ids of content objects: ${error.message}`
            );
            throw new H5pError(
                'mongo-s3-content-storage:listing-content-error',
                {},
                500
            );
        }
    }

    /**
     * Gets the filenames of files added to the content with addContentFile(...) (e.g. images, videos or other files)
     * @param contentId the piece of content
     * @param user the user who wants to access the piece of content
     * @returns a list of files that are used in the piece of content, e.g. ['image1.png', 'video2.mp4']
     */
    public async listFiles(
        contentId: ContentId,
        user: IUser
    ): Promise<string[]> {
        log.debug(`Listing files in content object with id ${contentId}.`);
        if (
            !(await this.getUserPermissions(contentId, user)).includes(
                Permission.View
            )
        ) {
            log.error(
                `User tried to get the list of files from a content object without proper permissions.`
            );
            throw new H5pError(
                'mongo-s3-content-storage:missing-view-permission',
                {},
                403
            );
        }

        const prefix = MongoS3ContentStorage.getS3Key(contentId, '');
        let files: string[] = [];
        try {
            let ret: PromiseResult<AWS.S3.ListObjectsV2Output, AWS.AWSError>;
            do {
                log.debug(`Requesting list from S3 storage.`);
                ret = await this.s3
                    .listObjectsV2({
                        Bucket: this.options?.s3Bucket,
                        Prefix: prefix,
                        ContinuationToken: ret?.NextContinuationToken,
                        MaxKeys: 1000
                    })
                    .promise();
                files = files.concat(
                    ret.Contents.map((c) => c.Key.substr(prefix.length))
                );
            } while (ret.IsTruncated && ret.NextContinuationToken);
        } catch (error) {
            log.debug(
                `There was an error while getting list of files from S3. This might not be a problem if no files were added to the content object.`
            );
            return [];
        }
        log.debug(`Found ${files.length} file(s) in S3.`);
        return files;
    }
}
