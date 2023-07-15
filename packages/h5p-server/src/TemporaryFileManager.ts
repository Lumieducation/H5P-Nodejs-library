import { ReadStream } from 'fs';
import { Readable } from 'stream';

import Logger from './helpers/Logger';
import {
    IFileStats,
    IH5PConfig,
    IPermissionSystem,
    ITemporaryFileStorage,
    IUser,
    TemporaryFilePermission
} from './types';
import FilenameGenerator from './helpers/FilenameGenerator';
import H5pError from './helpers/H5pError';

const log = new Logger('TemporaryFileManager');

/**
 * Keeps track of temporary files (images, video etc. upload for unsaved content).
 */
export default class TemporaryFileManager {
    /**
     * @param config Used to get values for how long temporary files should be stored.
     */
    constructor(
        private storage: ITemporaryFileStorage,
        private config: IH5PConfig,
        private permissionSystem: IPermissionSystem
    ) {
        log.info('initialize');
    }

    /**
     * Saves a file to temporary storage. Assigns access permission to the
     * user passed as an argument only.
     * @param filename the original filename of the file to store
     * @param dataStream the data of the file in a readable stream
     * @param user the user who requests the file
     * @returns the new filename (not equal to the filename passed to the
     * method to unsure uniqueness)
     */
    public async addFile(
        filename: string,
        dataStream: ReadStream,
        user: IUser
    ): Promise<string> {
        if (
            !(await this.permissionSystem.checkForTemporaryFile(
                user,
                TemporaryFilePermission.Create,
                undefined
            ))
        ) {
            log.error(
                `User tried upload file to temporary storage without proper permissions.`
            );
            throw new H5pError(
                'h5p-server:temporary-file-missing-write-permission',
                {},
                403
            );
        }

        log.info(`Storing temporary file ${filename}`);
        const uniqueFilename = await this.generateUniqueName(filename, user);
        log.debug(`Assigned unique filename ${uniqueFilename}`);
        const tmpFile = await this.storage.saveFile(
            uniqueFilename,
            dataStream,
            user,
            new Date(Date.now() + this.config.temporaryFileLifetime)
        );
        return tmpFile.filename;
    }

    /**
     * Removes temporary files that have expired.
     */
    public async cleanUp(): Promise<void> {
        log.info('cleaning up temporary files');
        const temporaryFiles = await this.storage.listFiles();
        const now = Date.now();
        const filesToDelete = temporaryFiles.filter(
            (f) => f.expiresAt.getTime() < now
        );
        if (filesToDelete.length > 0) {
            log.debug(
                `these temporary files have expired and will be deleted: ${filesToDelete
                    .map(
                        (f) =>
                            `${
                                f.filename
                            } (expired at ${f.expiresAt.toISOString()})`
                    )
                    .join(' ')}`
            );
        } else {
            log.debug('no temporary files have expired and must be deleted');
        }
        await Promise.all(
            filesToDelete.map((f) =>
                this.storage.deleteFile(f.filename, f.ownedByUserId)
            )
        );
    }

    /**
     * Removes a file from temporary storage. Will silently do nothing if the file does not
     * exist or is not accessible.
     * @param filename
     * @param user
     */
    public async deleteFile(filename: string, user: IUser): Promise<void> {
        if (await this.storage.fileExists(filename, user)) {
            if (
                user !== null &&
                !(await this.permissionSystem.checkForTemporaryFile(
                    user,
                    TemporaryFilePermission.Delete,
                    filename
                ))
            ) {
                log.error(
                    `User tried to delete a file from a temporary storage without proper permissions.`
                );
                throw new H5pError(
                    'h5p-server:temporary-file-missing-delete-permission',
                    {},
                    403
                );
            }

            await this.storage.deleteFile(filename, user.id);
        }
    }

    /**
     * Checks if a file exists in temporary storage.
     * @param filename the filename to check; can be a path including subdirectories (e.g. 'images/xyz.png')
     * @param user the user for who to check
     * @returns true if file already exists
     */
    public async fileExists(filename: string, user: IUser): Promise<boolean> {
        return this.storage.fileExists(filename, user);
    }

    /**
     * Returns a file stream for temporary file.
     * Will throw H5PError if the file doesn't exist or the user has no access permissions!
     * Make sure to close this stream. Otherwise the temporary files can't be deleted properly!
     * @param filename the file to get
     * @param user the user who requests the file
     * @param rangeStart (optional) the position in bytes at which the stream should start
     * @param rangeEnd (optional) the position in bytes at which the stream should end
     * @returns a stream to read from
     */
    public async getFileStream(
        filename: string,
        user: IUser,
        rangeStart?: number,
        rangeEnd?: number
    ): Promise<Readable> {
        if (
            !(await this.permissionSystem.checkForTemporaryFile(
                user,
                TemporaryFilePermission.View,
                filename
            ))
        ) {
            log.error(
                `User tried to display a file from a content object without proper permissions.`
            );
            throw new H5pError(
                'h5p-server:temporary-file-missing-delete-permission',
                {},
                403
            );
        }

        log.info(`Getting temporary file ${filename}`);

        return this.storage.getFileStream(filename, user, rangeStart, rangeEnd);
    }

    /**
     * Returns a information about a temporary file.
     * Throws an exception if the file does not exist.
     * @param filename the relative path inside the library
     * @param user the user who wants to access the file
     * @returns the file stats
     */
    public async getFileStats(
        filename: string,
        user: IUser
    ): Promise<IFileStats> {
        if (
            !(await this.permissionSystem.checkForTemporaryFile(
                user,
                TemporaryFilePermission.View,
                filename
            ))
        ) {
            log.error(
                `User tried to get stats of a content object without proper permissions.`
            );
            throw new H5pError(
                'h5p-server:temporary-file-missing-view-permission',
                {},
                403
            );
        }

        return this.storage.getFileStats(filename, user);
    }

    /**
     * Tries generating a unique filename for the file by appending a
     * id to it. Checks in storage if the filename already exists and
     * tries again if necessary.
     * Throws an H5PError if no filename could be determined.
     * @param filename the filename to check
     * @param user the user who is saving the file
     * @returns the unique filename
     */

    protected async generateUniqueName(
        filename: string,
        user: IUser
    ): Promise<string> {
        return FilenameGenerator(
            filename,
            this.storage.sanitizeFilename
                ? (f) => this.storage.sanitizeFilename(f)
                : (f) => f,
            (f) => this.storage.fileExists(f, user)
        );
    }
}
