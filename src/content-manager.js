const fs = require('fs-extra');
const path = require('path');
const glob = require('glob-promise');

export default class ContentManager {
    constructor(contentStorage) {
        this._contentStorage = contentStorage;
    }

    /**
     * Adds content from a H5P package to the installation.
     * @param {string} packageDirectory The absolute path containing the package (the directory containing h5p.json)
     * @param {User} user The user who is adding the package.
     * @returns {Promise<string>} The id of the content that was created.
     */
    async copyContentFromDirectory(packageDirectory, user) {
        const metadata = await fs.readJSON(path.join(packageDirectory, "h5p.json"));
        const content = await fs.readJSON(path.join(packageDirectory, "content", "content.json"));
        const otherContentFiles = (await glob(path.join(packageDirectory, "content", "**/*.*")))
            .filter(file => path.relative(packageDirectory, file) !== "content.json");

        const id = await this._contentStorage.createContent(metadata, content, user);
        try {
            await Promise.all(otherContentFiles.map(file => {
                const readStream = fs.createReadStream(file);
                const localPath = path.relative(path.join(packageDirectory, "content"), file);
                return this._contentStorage.addContentFile(id, localPath, readStream);
            }));
        }
        catch (error) {
            this._contentStorage.deleteContent(id);
            throw error;
        }
        return id;
    }
}