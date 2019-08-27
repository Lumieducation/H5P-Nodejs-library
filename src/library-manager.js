const Library = require('./library'); // eslint-disable-line no-unused-vars
const FileLibraryStorage = require('./file-library-storage'); // eslint-disable-line no-unused-vars

/**
 * This class manages library installations, enumerating installed libraries etc.
 */

class LibraryManager {
    /**
     * 
     * @param {FileLibraryStorage} libraryStorage 
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
     * @param {Library} library to compare against the highest locally installed version.
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
        } catch (ignored) {
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
}

module.exports = LibraryManager;