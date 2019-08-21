const shortid = require('shortid');
const fs = require('fs-extra');
const path = require('path');
const promisePipe = require('promisepipe');

export default class FileContentStorage {
    constructor(contentDirectory) {
        this._contentPath = contentDirectory;
    }

    /**
     * Creates a content object in the repository. Add files to it later with addContentFile(...)
     * @param {any} metadata The metadata of the content (= h5p.json)
     * @param {any} content the content object (= content/content.json)
     * @param {User} user The user who owns this object.
     * @returns {string} The newly assigned content id
     */
    // eslint-disable-next-line no-unused-vars
    async createContent(metadata, content, user) {
        const id = await this._generateContentId();
        try {
            await fs.ensureDir(path.join(this._contentPath, id));
            await fs.ensureDir(path.join(this._contentPath, id, "content"));
            await fs.writeJSON(path.join(this._contentPath, id, "h5p.json"), metadata);
            await fs.writeJSON(path.join(this._contentPath, id, "content", "content.json"), content);
        } catch (error) {
            await fs.remove(path.join(this._contentPath, id));
            throw new Error(`Could not create content: ${error.message}`);
        }
        return id;
    }

    /**
     * Adds a content file to an existing content object
     * @param {string} id The id of the content to add the file to
     * @param {string} filename The filename INSIDE the content folder
     * @param {Stream} stream A readable stream that contains the data
     * @param {User} user The user who owns this object
     * @returns {Promise<void>}
     */
    // eslint-disable-next-line no-unused-vars
    async addContentFile(id, filename, stream, user) {
        if (!(await fs.pathExists(path.join(this._contentPath, id)))) {
            throw new Error(`Cannot add file ${filename} to content with id ${id}: Content with this id does not exist.`);
        }

        const fullPath = path.join(this._contentPath, id, "content", filename);
        await fs.ensureDir(path.dirname(fullPath));
        const writeStream = fs.createWriteStream(fullPath);
        await promisePipe(stream, writeStream);
    }

    /**
     * Deletes content from the repository
     * @param {string} id The content id to delete.
     * @param {User} user The user who wants to delete the content
     */
    // eslint-disable-next-line no-unused-vars
    async deleteContent(id, user) {
        if (!(await fs.pathExists(path.join(this._contentPath, id)))) {
            throw new Error(`Cannot delete content with id ${id}: It does not exist.`);
        }

        await fs.remove(path.join(this._contentPath, id));
    }

    /**
     * Generates a unique content id
     * @returns {Promise<string>} A unique content id
     */
    async _generateContentId() {
        let counter = 0;
        let id;
        let exists = false;
        do {
            id = shortid();
            counter += 1;
            const p = path.join(this._contentPath, id);
            // eslint-disable-next-line no-await-in-loop
            exists = await fs.pathExists(p);
        } while (exists && counter < 5);
        if (exists) {
            throw new Error("Could not generate id for new content.");
        }
        return id;
    }
}