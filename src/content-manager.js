const fs = require('fs-extra');
const path = require('path');
const glob = require('glob-promise');

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
     * @returns {Promise<any>}
     */
    async loadH5PJson(contentId) {
        return this._contentStorage.getFileJson(contentId, 'h5p.json');
    }

    /**
     * Returns the content object (=contents of content/content.json) of a piece of content.
     * @param {number} contentId the content id
     * @returns {Promise<any>}
     */
    async loadContent(contentId) {
        return this._contentStorage.getFileJson(contentId, 'content/content.json');
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
     * @param {string} filename the filename of the file to get (without preciding "content/" directory)
     * @param {User} user the user who wants to retrieve the content file
     * @returns {Stream}
     */
    getContentFileStream(contentId, filename, user) {
        return this._contentStorage.getContentFileStream(contentId, filename, user);
    }
}

module.exports = ContentManager;