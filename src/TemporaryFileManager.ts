import { ReadStream } from 'fs';
import path from 'path';
import shortid from 'shortid';

import H5pError from './helpers/H5pError';
import Logger from './helpers/Logger';
import { IH5PConfig, ITemporaryFileStorage, IUser } from './types';

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
        private config: IH5PConfig
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
        return;
    }

    /**
     * Removes a file from temporary storage. Will silently do nothing if the file does not
     * exist or is not accessible.
     * @param filename
     * @param user
     */
    public async deleteFile(filename: string, user: IUser): Promise<void> {
        if (await this.storage.fileExists(filename, user)) {
            await this.storage.deleteFile(filename, user.id);
        }
    }

    /**
     * Returns a file stream for temporary file.
     * Will throw H5PError if the file doesn't exist or the user has no access permissions!
     * Make sure to close this stream. Otherwise the temporary files can't be deleted properly!
     * @param filename the file to get
     * @param user the user who requests the file
     * @returns a stream to read from
     */
    public async getFileStream(
        filename: string,
        user: IUser
    ): Promise<ReadStream> {
        log.info(`Getting temporary file ${filename}`);
        return this.storage.getFileStream(filename, user);
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
        let attempts = 0;
        let filenameAttempt = '';
        let exists = false;
        const dirname = path.dirname(filename);
        do {
            filenameAttempt = `${dirname ? `${dirname}/` : ''}${path.basename(
                filename,
                path.extname(filename)
            )}-${shortid()}${path.extname(filename)}`;
            exists = await this.storage.fileExists(filenameAttempt, user);
            attempts += 1;
        } while (attempts < 5 && exists); // only try 5 times
        if (exists) {
            log.error(`Cannot determine a unique filename for ${filename}`);
            throw new H5pError('error-generating-unique-temporary-filename', {
                name: filename
            });
        }
        return filenameAttempt;
    }
}
