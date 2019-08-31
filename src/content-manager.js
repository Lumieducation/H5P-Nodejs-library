const fs = require('fs-extra');
const path = require('path');
const glob = require('glob-promise');

const { streamToString } = require('./helpers/stream-helpers');

/**
 * The ContentManager takes care of saving content and dependent files. It only contains storage-agnostic functionality and
 * depends on a ContentStorage object to do the actual persistence.
 */
class ContentManager {
    /**
     * @param {FileContentStorage} contentStorage The storage object
     */
    constructor(contentStorage) {
        this._contentStorage = contentStorage;
    }

    /**
     * Adds content from a H5P package (in a temporary directory) to the installation.
     * It does not check whether the user has permissions to save content.
     * @param {string} packageDirectory The absolute path containing the package (the directory containing h5p.json)
     * @param {User} user The user who is adding the package.
     * @param {number} contentId (optional) The content id to use for the package
     * @returns {Promise<string>} The id of the content that was created (the one passed to the method or a new id if there was none).
     */
    async copyContentFromDirectory(packageDirectory, user, contentId) {
        const metadata = await fs.readJSON(path.join(packageDirectory, "h5p.json"));
        const content = await fs.readJSON(path.join(packageDirectory, "content", "content.json"));
        const otherContentFiles = (await glob(path.join(packageDirectory, "content", "**/*.*")))
            .filter(file => path.relative(packageDirectory, file) !== "content.json");

        contentId = await this._contentStorage.createContent(metadata, content, user, contentId);
        try {
            await Promise.all(otherContentFiles.map(file => {
                const readStream = fs.createReadStream(file);
                const localPath = path.relative(path.join(packageDirectory, "content"), file);
                return this._contentStorage.addContentFile(contentId, localPath, readStream);
            }));
        }
        catch (error) {
            this._contentStorage.deleteContent(contentId);
            throw error;
        }
        return contentId;
    }

    /**
     * Creates a content object in the repository. Add files to it later with addContentFile(...).
     * @param {any} metadata The metadata of the content (= h5p.json)
     * @param {any} content the content object (= content/content.json)
     * @param {User} user The user who owns this object.
     * @param {number} contentId (optional) The content id to use
     * @returns {Promise<string>} The newly assigned content id
     */
    async createContent(metadata, content, user, contentId) {
        return this._contentStorage.createContent(metadata, content, user, contentId);
    }

    /**
     * Returns the metadata (=contents of h5p.json) of a piece of content.
     * @param {number} contentId the content id
     * @param {User} user The user who wants to access the content
     * @returns {Promise<any>}
     */
    async loadH5PJson(contentId, user) {
        return this._getFileJson(contentId, 'h5p.json', user);
    }

    /**
     * Returns the content object (=contents of content/content.json) of a piece of content.
     * @param {number} contentId the content id
     * @param {User} user The user who wants to access the content
     * @returns {Promise<any>}
     */
    async loadContent(contentId, user) {
        return this._getFileJson(contentId, 'content/content.json', user);
    }

    /**
     * Adds a content file to an existing content object. The content object has to be created with createContent(...) first.
     * @param {number} contentId The id of the content to add the file to
     * @param {string} filename The filename INSIDE the content folder
     * @param {Stream} stream A readable stream that contains the data
     * @param {User} user The user who owns this object
     * @returns {Promise<void>}
     */
    async addContentFile(contentId, filename, stream, user) {
        return this._contentStorage.addContentFile(contentId, filename, stream, user);
    }

    /**
     * Returns a readable stream of a content file (e.g. image or video) inside a piece of conent
     * @param {number} contentId the id of the content object that the file is attached to
     * @param {string} filename the filename of the file to get (you have to add the "content/" directory if needed)
     * @param {User} user the user who wants to retrieve the content file
     * @returns {Stream}
     */
    getContentFileStream(contentId, filename, user) {
        return this._contentStorage.getContentFileStream(contentId, filename, user);
    }

    /**
     * Returns the decoded JSON data inside a file
     * @param {number} contentId The id of the content object that the file is attached to
     * @param {string} file The filename to get (relative to main dir, you have to add "content/" if you want to access a content file)
     * @param {User} user The user who wants to acces this object
     * @returns {Promise<any>}
     */
    async _getFileJson(contentId, file, user) {
        const stream = this._contentStorage.getContentFileStream(contentId, file, user);
        const jsonString = await streamToString(stream);
        return JSON.parse(jsonString);
    }

    /**
     * Generates a unique content id that hasn't been used in the system so far.
     * @returns {Promise<number>} A unique content id
     */
    async createContentId() {
        return this._contentStorage.createContentId();
    }
}

module.exports = ContentManager;