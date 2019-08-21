const path = require('path');
const yauzl = require('yauzl-promise');
const fs = require('fs-extra');
const promisePipe = require('promisepipe');
const { dir } = require('tmp-promise');

const H5pError = require("./helpers/h5p-error");
const { ValidationError } = require('./helpers/validator-builder');
const PackageValidator = require("./package-validator");

export default class PackageManager {
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

    async installLibrariesFromPackage(tempPackagePath) {
        return this._processPackage(tempPackagePath, { installLibraries: true, copyContent: false });
    }

    async addPackageLibrariesAndFiles(tempPackagePath, user) {
        return this._processPackage(tempPackagePath, { installLibraries: user.canUpdateAndInstallLibraries, copyContent: true }, user);
    }

    async _processPackage(tempPackagePath, { installLibraries = false, copyContent = false }, user) {
        let contentId;
        const packageValidator = new PackageValidator(this._translationService, this._config);
        try {
            await packageValidator.validatePackage(tempPackagePath, false, true); // no need to check result as the validator throws an exception if there is an error
            const { path: tempDirPath } = await dir();
            try {
                await PackageManager._extractPackage(tempPackagePath, tempDirPath, {
                    includeLibraries: installLibraries,
                    includeContent: copyContent,
                    includeMetadata: copyContent
                });
                const dirContent = await fs.readdir(tempDirPath);

                // install all libraries
                if (installLibraries) {
                    await Promise.all(dirContent.filter(e => e !== "h5p.json" && e !== "content").map(dirEntry =>
                        this._libraryManager.installFromDirectory(path.join(tempDirPath, dirEntry), { restricted: false })
                    ));
                }

                // Copy content to the repository
                if (copyContent) {
                    if (!this._contentManager) {
                        throw new Error("PackageManager was initialized with a ContentManager, but you want to copy content from a package. Pass a ContentManager object to the the constructor!")
                    }
                    contentId = await this._contentManager.copyContentFromDirectory(tempDirPath, user);
                }
            }
            catch (error) {
                throw error;
            }
            finally {
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