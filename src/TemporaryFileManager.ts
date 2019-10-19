import { ReadStream } from 'fs';
import { Stream } from 'stream';
import Logger from './helpers/Logger';
import { IEditorConfig, IUser } from './types';

const log = new Logger('TemporaryFileManager');

/**
 * Keeps track of temporary files (images, video etc. upload for unsaved content).
 */
export default class TemporaryFileManager {
    /**
     * @param config Used to get values for how long temporary files should be stored.
     */
    constructor(private config: IEditorConfig) {
        log.info('initialize');
    }

    /**
     * Removes temporary files that have expired.
     */
    public async cleanUp(): Promise<void> {
        log.info('cleaning up temporary files');
        return;
    }

    /**
     * Returns a file stream for a temporarily saved file.
     * Will throw H5PError if the file doesn't exist or the user
     * has not access permissions!
     * @param filename the file to get
     * @param user the user who requests the file
     */
    public getFileStream(filename: string, user: IUser): ReadStream {
        log.info(`Getting temporary file ${filename}`);
        return undefined;
    }

    /**
     * Saves a file to temporary storage.
     * @param filename the original filename of the file to store
     * @param dataStream the data of the file in a readable stream
     * @param user the user who requests the file
     * @returns the new filename (not equal to the filename passed to the
     * method to unsure uniqueness)
     */
    public async saveFile(
        filename: string,
        dataStream: Stream,
        user: IUser
    ): Promise<string> {
        log.info(`Storing temporary file ${filename}`);
        return `${filename}#tmp`;
    }
}
