const shortid = require('shortid');
const fs = require('fs-extra');
const path = require('path');

/**
 * The TemporaryFileManager keeps track of temporary files. 
 */
export default class TemporaryFileManager {
    constructor(localPath) {
        this._path = localPath;
        this._directory = new Map();
    }

    /**
     * Creates a a temporary file and returns a stream to it.
     * @param {string} extension The file extension the file will have (no dot prefix!)
     * @param {number} timeout (optional) The time until the file is supposed to be automatically deleted. (Will be automatically done by the TemporaryFileManager)
     * @param {User} activeUser (optional) The user who owns the temporary file. 
     * @returns {path: string, stream: Stream } The path of the temporary file (including extension) and the stream to write to
     */
    async create(extension, timeout = 1000 * 60 * 60 * 24, activeUser = undefined) {
        const file = this._getUniquePath(extension);
        this._directory.set(path, {
            path: file,
            user: activeUser,
            expiration: Date.now() + timeout
        });
        return {
            path: file,
            stream: await fs.createWriteStream(file, { autoClose: true })
        };
    }

    /**
     * Deletes the temporary file (if it exists).
     * @param {string} path The full path to the temporary file to delete.
     * @param {*} activeUser The currently active user. Will throw an exception if the temporary file is not accessible to the user.
     * @returns {boolean} true if a file was deleted, false if there was none. Throws an exception if there is any other error.
     */
    /* delete(path, activeUser) {

    } */

    /**
     * Checks if the currently active user can access a temporary file.
     * @param {string} path The full path to the temporary file to check.
     * @param {*} activeUser The currently active user.
     * @returns {boolean} True if the user can read, write and delete the file. 
     */
    /* checkRights(path, activeUser) {

    } */

    async _getUniquePath(extension) {
        let id;
        let counter = 0;
        do {
            // 5 retries if there is a naming collision
            if (counter > 5) {
                throw new Error("Could not create temporary file.");
            }
            id = shortid();
            counter += 1;
            // eslint-disable-next-line no-await-in-loop
        } while (await fs.pathExists(path.join(this._path, `${id}.${extension}`))
            || this._directory.has(id));

        return id;
    }
}