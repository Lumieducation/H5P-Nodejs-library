const path = require('path');
const yauzl = require('yauzl-promise');
const fs = require('fs-extra');
const promisePipe = require('promisepipe');
const { dir } = require('tmp-promise');

const H5pError = require("./helpers/h5p-error");
const { ValidationError } = require('./helpers/validator-builder');
const PackageValidator = require("./package-validator");

/**
 * Handles the installation of libraries and saving of content from a H5P package.
 */
class PackageManager {
    /**
     * @param {LibraryManager} libraryManager
     * @param {TranslationService} translationService 
     * @param {H5PConfig} config 
     * @param {ContentManager} contentManager (optional) Only needed if you want to use the PackageManger to copy content from a package (e.g. Upload option in the editor)
     */
    constructor(libraryManager, translationService, config, contentManager = null) {
        this._libraryManager = libraryManager;
        this._translationService = translationService;
        this._config = config;
        this._contentManager = contentManager;
    }

    /**
     * Installs all libraries from the package. Assumes that the user calling this has the permission to install libraries!
     * Throws errors if something goes wrong.
     * @param {string} packagePath The full path to the H5P package file on the local disk.
     * @returns {Promise<void>}
     */
    async installLibrariesFromPackage(packagePath) {
        return this._processPackage(packagePath, { installLibraries: true, copyContent: false });
    }

    /**
     * Adds content from a H5P package to the system (e.g. when uploading a H5P file). Also installs the necessary libraries from the package if they are not already installed.
     * Throws errors if something goes wrong.
     * @param {string} packagePath The full path to the H5P package file on the local disk.
     * @param {User} user The user who wants to upload the package.
     * @param {number} contentId (optional) the content id to use for the package
     * @returns {Promise<number>} the id of the newly created content
     */
    async addPackageLibrariesAndContent(packagePath, user, contentId) {
        return this._processPackage(packagePath, { installLibraries: user.canUpdateAndInstallLibraries, copyContent: true }, user, contentId);
    }

    /**
     * Generic method to process a H5P package. Can install libraries and copy content.
     * @param {string} packagePath The full path to the H5P package file on the local disk
     * @param {boolean} installLibraries If true, try installing libraries from package. Defaults to false.
     * @param {boolean} copyContent If true, try copying content from package. Defaults to false.
     * @param {User} user (optional) the user who wants to copy content (only needed when copying content)
     * @returns {Promise<number|undefined>} The id of the newly created content when content was copied or undefined otherwise.
     */
    async _processPackage(packagePath, { installLibraries = false, copyContent = false }, user, contentId) {
        const packageValidator = new PackageValidator(this._translationService, this._config);
        try {
            await packageValidator.validatePackage(packagePath, false, true); // no need to check result as the validator throws an exception if there is an error
            const { path: tempDirPath } = await dir(); // we don't use withDir here, to have better error handling (catch block below)
            try {
                await PackageManager._extractPackage(packagePath, tempDirPath, {
                    includeLibraries: installLibraries,
                    includeContent: copyContent,
                    includeMetadata: copyContent
                });
                const dirContent = await fs.readdir(tempDirPath);

                // install all libraries
                if (installLibraries) {
                    await Promise.all(dirContent.filter(dirEntry => dirEntry !== "h5p.json" && dirEntry !== "content").map(dirEntry =>
                        this._libraryManager.installFromDirectory(path.join(tempDirPath, dirEntry), { restricted: false })
                    ));
                }

                // Copy content to the repository
                if (copyContent) {
                    if (!this._contentManager) {
                        throw new Error("PackageManager was initialized with a ContentManager, but you want to copy content from a package. Pass a ContentManager object to the the constructor!")
                    }
                    contentId = await this._contentManager.copyContentFromDirectory(tempDirPath, user, contentId);
                }
            }
            catch (error) {
                // otherwise finally swallows errors
                throw error;
            }
            finally {
                // clean up temporary files in any case
                await fs.remove(tempDirPath);
            }

        } catch (error) {
            if (error instanceof ValidationError) {
                throw new H5pError(error.message); // TODO: create AJAX response?
            }
            else {
                throw error;
            }
        }

        return contentId;
    }

    /**
     * Extracts a H5P package to the specified directory.
     * @param {string} packagePath The full path to the H5P package file on the local disk
     * @param {string} directoryPath The full path of the directory to which the package should be extracted
     * @param {boolean} includeLibraries If true, the library directories inside the package will be extracted.
     * @param {boolean} includeContent If true, the content folder inside the package will be extracted.
     * @param {boolean} includeMetadata If true, the h5p.json file inside the package will be extracted.
     * @returns {Promise<void>}
     */
    static async _extractPackage(packagePath, directoryPath, { includeLibraries = false, includeContent = false, includeMetadata = false }) {
        const zipFile = await yauzl.open(packagePath);
        await zipFile.walkEntries(async (entry) => {
            if ((includeContent && entry.fileName.startsWith("content/"))
                || (includeLibraries && entry.fileName.includes("/") && !entry.fileName.startsWith("content/"))
                || (includeMetadata && entry.fileName === "h5p.json")) {
                const readStream = await entry.openReadStream();
                const writePath = path.join(directoryPath, entry.fileName);

                await fs.mkdirp(path.dirname(writePath));
                const writeStream = fs.createWriteStream(writePath);
                await promisePipe(readStream, writeStream);
            }
        })
    }
}

module.exports = PackageManager;