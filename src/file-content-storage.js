const fs = require('fs-extra');
const path = require('path');
const promisePipe = require('promisepipe');

/**
 * Persists content to the disk.
 */
class FileContentStorage {
    /**
     * @param {string} contentDirectory The absolute path to the directory where the content should be stored
     */
    constructor(contentDirectory) {
        this._contentPath = contentDirectory;
    }

    /**
     * Creates a content object in the repository. Add files to it later with addContentFile(...).
     * Throws an error if something went wrong. In this case no traces of the content are left in storage and all changes are reverted.
     * @param {any} metadata The metadata of the content (= h5p.json)
     * @param {any} content the content object (= content/content.json)
     * @param {User} user The user who owns this object.
     * @param {number} id (optional) The content id to use
     * @returns {Promise<number>} The newly assigned content id
     */
    // eslint-disable-next-line no-unused-vars
    async createContent(metadata, content, user, id) {
        if (id === undefined || id === null) {
            id = await this.createContentId();
        }
        try {
            await fs.ensureDir(path.join(this._contentPath, id.toString()));
            await fs.ensureDir(path.join(this._contentPath, id.toString(), "content"));
            await fs.writeJSON(path.join(this._contentPath, id.toString(), "h5p.json"), metadata);
            await fs.writeJSON(path.join(this._contentPath, id.toString(), "content", "content.json"), content);
        } catch (error) {
            await fs.remove(path.join(this._contentPath, id.toString()));
            throw new Error(`Could not create content: ${error.message}`);
        }
        return id;
    }

    /**
     * Adds a content file to an existing content object. The content object has to be created with createContent(...) first.
     * @param {number} id The id of the content to add the file to
     * @param {string} filename The filename INSIDE the content folder
     * @param {Stream} stream A readable stream that contains the data
     * @param {User} user The user who owns this object
     * @returns {Promise<void>}
     */
    // eslint-disable-next-line no-unused-vars
    async addContentFile(id, filename, stream, user) {
        if (!(await fs.pathExists(path.join(this._contentPath, id.toString())))) {
            throw new Error(`Cannot add file ${filename} to content with id ${id}: Content with this id does not exist.`);
        }

        const fullPath = path.join(this._contentPath, id.toString(), "content", filename);
        await fs.ensureDir(path.dirname(fullPath));
        const writeStream = fs.createWriteStream(fullPath);
        await promisePipe(stream, writeStream);
    }

    /**
     * Returns a readable stream of a content file (e.g. image or video) inside a piece of content
     * @param {number} id the id of the content object that the file is attached to
     * @param {string} filename the filename of the file to get (you have to add the "content/" directory if needed)
     * @param {User} user the user who wants to retrieve the content file
     * @returns {Stream}
     */
    // eslint-disable-next-line no-unused-vars
    getContentFileStream(id, filename, user) {
        return fs.createReadStream(path.join(this._contentPath, id.toString(), filename));
    }

    /**
     * Deletes content from the repository.
     * Throws errors if something goes wrong.
     * @param {number} id The content id to delete.
     * @param {User} user The user who wants to delete the content
     * @returns {Promise<void>}
     */
    // eslint-disable-next-line no-unused-vars
    async deleteContent(id, user) {
        if (!(await fs.pathExists(path.join(this._contentPath, id.toString())))) {
            throw new Error(`Cannot delete content with id ${id}: It does not exist.`);
        }

        await fs.remove(path.join(this._contentPath, id.toString()));
    }

    /**
     * Generates a unique content id that hasn't been used in the system so far.
     * @returns {Promise<number>} A unique content id
     */
    async createContentId() {
        let counter = 0;
        let id;
        let exists = false;
        do {
            id = FileContentStorage._getRandomInt(1, 2**32);
            counter += 1;
            const p = path.join(this._contentPath, id.toString());
            // eslint-disable-next-line no-await-in-loop
            exists = await fs.pathExists(p);
        } while (exists && counter < 5); // try 5x and give up then
        if (exists) {
            throw new Error("Could not generate id for new content.");
        }
        return id;
    }

    /**
     * Returns a random integer
     * @param {number} min The minimum
     * @param {number} max The maximum
     * @returns {number} a random integer
     */
    static _getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}

module.exports = FileContentStorage;