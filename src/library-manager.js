const fs = require('fs-extra');
const glob = require('glob-promise');
const path = require('path');

const Library = require('./library');  // eslint-disable-line no-unused-vars
const FileLibraryStorage = require('./file-library-storage');  // eslint-disable-line no-unused-vars

/**
 * This class manages library installations, enumerating installed libraries etc. 
 * It is storage agnostic and can be re-used in all implementations/plugins.
 */

class LibraryManager {
    /**
     * 
     * @param {FileLibraryStorage} libraryStorage The library repository that persists library somewhere.
     */
    constructor(libraryStorage) {
        this._libraryStorage = libraryStorage;
    }

    /**
     * Get a list of the currently installed libraries.
     * @param {String[]?} machineNames (if supplied) only return results for the machines names in the list
     * @returns {Promise<any>} An object which has properties with the existing library machine names. The properties'
     * values are arrays of Library objects, which represent the different versions installed of this library. 
     */
    async getInstalled(...machineNames) {
        let libraries = await this._libraryStorage.getInstalled(...machineNames);
        libraries = libraries
            .map(async oldLib => {
                const newLib = oldLib;
                const info = await this.loadLibrary(oldLib);
                newLib.patchVersion = info.patchVersion;
                newLib.id = info.libraryId;
                newLib.runnable = info.runnable;
                newLib.title = info.title;
                return newLib;
            });
        libraries = (await Promise.all(libraries)).sort((lib1, lib2) => lib1.compare(lib2));

        const returnObject = {};
        for (const library of libraries) {
            if (!returnObject[library.machineName]) {
                returnObject[library.machineName] = [];
            }
            returnObject[library.machineName].push(library);
        }
        return returnObject;
    }

    /**
     * Get id to an existing installed library.
     * If version number is not specified, the newest version will be returned.
     * @param {Library} library Note that patch version is ignored.
     * @returns {Promise<number>} The id of the specified library or undefined (if not installed).
     */
    async getId(library) {
        return this._libraryStorage.getId(library);
    }

    /**
     * Checks if the given library has a higher version than the highest installed version.
     * @param {Library} library Library to compare against the highest locally installed version.
     * @returns {Promise<boolean>} true if the passed library contains a version that is higher than the highest installed version, false otherwise
     */
    async libraryHasUpgrade(library) {
        const wrappedLibraryInfos = await this.getInstalled(library.machineName);
        if (!wrappedLibraryInfos || !wrappedLibraryInfos[library.machineName] || !wrappedLibraryInfos[library.machineName].length === 0) {
            return false;
        }
        const allInstalledLibsOfMachineName = wrappedLibraryInfos[library.machineName].sort((a, b) => a.compareVersions(b));
        const highestLocalLibVersion = allInstalledLibsOfMachineName[allInstalledLibsOfMachineName.length - 1];
        if (highestLocalLibVersion.compareVersions(library) < 0) {
            return true;
        }
        return false;
    }

    /**
     * Returns the information about the library that is contained in library.json.
     * @param {Library} library The library to get (machineName, majorVersion and minorVersion is enough)
     * @returns {Promise<ILibrary>} the decoded JSON data or undefined if library is not installed
     */
    async loadLibrary(library) {
        let libraryMetadata;
        try {
            const content = await this._libraryStorage.getFileContentAsString(library, "library.json");
            libraryMetadata = JSON.parse(content);
            libraryMetadata.libraryId = await this.getId(library);
        } catch {
            return undefined;
        }
        return libraryMetadata;
    }

    /**
    * Check if the library contains a file
    * @param {Library} library The library to check
    * @param {string} filename
    * @return {Promise<boolean>} true if file exists in library, false otherwise
    */
    async libraryFileExists(library, filename) {
        return this._libraryStorage.fileExists(library, filename);
    }

    /**
     * Is the library a patched version of an existing library?
     * @param {Library} library The library the check
     * @returns {Promise<boolean>} true if the library is a patched version of an existing library, false otherwise
     */
    async isPatchedLibrary(library) {
        const wrappedLibraryInfos = await this.getInstalled(library.machineName);
        if (!wrappedLibraryInfos || !wrappedLibraryInfos[library.machineName]) {
            return false;
        }
        const libraryInfos = wrappedLibraryInfos[library.machineName];
        for (let x = 0; x < libraryInfos.length; x += 1) {
            if (libraryInfos[x].majorVersion === library.majorVersion
                && libraryInfos[x].minorVersion === library.minorVersion) {
                if (libraryInfos[x].patchVersion < library.patchVersion) {
                    return true;
                }
                break;
            }
        }
        return false;
    }

    /**
     * Installs a library from a temporary directory. It does not delete the library files in the temporary directory.
     * The method does NOT validate the library! It must be validated before calling this method!
     * Throws an error if something went wrong and deletes the files already installed.
     * @param {string} directory The path to the temporary directory that contains the library files (the root directory that includes library.json)
     * @returns {Promise<boolean>} true if successful
     */
    async installFromDirectory(directory, { restricted = false }) {
        const libraryMetadata = await fs.readJSON(`${directory}/library.json`);
        let library = Library.createFromMetadata(libraryMetadata)
        if (await this.getId(library)) { // Check if library is already installed. Skip installation if it already exists and there is no patch for it.
            if (await this.isPatchedLibrary(library)) {
                // TODO: upgrade library
            }
        }
        else {
            library = await this._libraryStorage.installLibrary(libraryMetadata, { restricted });

            try {
                const files = await glob(`${directory}/**/*.*`);
                await Promise.all(files.map(fileFullPath => {
                    const fileLocalPath = path.relative(directory, fileFullPath);
                    if (fileLocalPath === "library.json") {
                        return Promise.resolve();
                    }
                    const readStream = fs.createReadStream(fileFullPath);
                    return this._libraryStorage.addLibraryFile(library, fileLocalPath, readStream);
                }));
                await this._libraryStorage.checkConsistency(library);
            } catch (error) {
                await this._libraryStorage.removeLibrary(library);
                throw error;
            }
        }
    }

    // eslint-disable-next-line class-methods-use-this, no-unused-vars
    getLibraryFileUrl(library, file) {
        return ""; // TODO: implement
    }
}

module.exports = LibraryManager;