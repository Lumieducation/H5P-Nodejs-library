const fs = require('fs-extra');
const { crc32 } = require('crc');


class Library {
    constructor(machineName, major, minor, patch) {
        this.machineName = machineName;
        this.majorVersion = major;
        this.minorVersion = minor;
        this.patchVersion = patch;
        this.id = undefined;
        this.title = undefined;
        this.runnable = undefined;
        this.restricted = undefined;
    }

    /**
     * Compares by giving precedence to Title, then major version, then minor version 
     * @param {Library} otherLibrary 
     */
    compare(otherLibrary) {
        return this.title < otherLibrary.title || this.majorVersion < otherLibrary.majorVersion || this.minorVersion < otherLibrary.minorVersion;
    }

    getDirName() {
        return `${this.machineName}-${this.majorVersion}.${this.minorVersion}`;
    }
}

/**
 * This class manages library installation etc.
 */
class FileLibraryManager {
    /**
     * 
     * @param {H5PEditorConfig} config 
     */
    constructor(config) {
        this.config = config;
    }

    /**
     * Store data about a library
     *
     * Also fills in the libraryId in the libraryData object if the object is new
     *
     * @param object $libraryData
     *   Associative array containing:
     *   - libraryId: The id of the library if it is an existing library.
     *   - title: The library's name
     *   - machineName: The library machineName
     *   - majorVersion: The library's majorVersion
     *   - minorVersion: The library's minorVersion
     *   - patchVersion: The library's patchVersion
     *   - runnable: 1 if the library is a content type, 0 otherwise
     *   - metadataSettings: Associative array containing:
     *      - disable: 1 if the library should not support setting metadata (copyright etc)
     *      - disableExtraTitleField: 1 if the library don't need the extra title field
     *   - fullscreen(optional): 1 if the library supports fullscreen, 0 otherwise
     *   - embedTypes(optional): list of supported embed types
     *   - preloadedJs(optional): list of associative arrays containing:
     *     - path: path to a js file relative to the library root folder
     *   - preloadedCss(optional): list of associative arrays containing:
     *     - path: path to css file relative to the library root folder
     *   - dropLibraryCss(optional): list of associative arrays containing:
     *     - machineName: machine name for the librarys that are to drop their css
     *   - semantics(optional): Json describing the content structure for the library
     *   - language(optional): associative array containing:
     *     - languageCode: Translation in json format
     * @param bool $new
     * @return
     */
    install() {
        // TODO: check how this is done in PHP version
        // TODO: implement
    }

    /**
     * Deletes the library from the disc and removes all references to it in the manager.
     * @param {Library} library 
     */
    delete(library) {
        // TODO: implement
    }

    /**
     * Get a list of the current installed libraries
     * @param {String[]} machineNames only return results for the machines names in the list
     * @returns An object which has properties with the existing library machine names. The properties'
     * values are arrays of Library objects, which represent the different versions installed of this library. 
     */
    async getInstalled(...machineNames) {
        const nameRegex = /([^\s]+)-(\d+)\.(\d+)/;
        const libraryDirectories = await fs.readdir(this.config.libraryPath);
        let libraries = libraryDirectories
            .filter(name => nameRegex.test(name))
            .map(name => {
                const result = nameRegex.exec(name);
                return new Library(result[1], result[2], result[3]);
            })
            .filter(lib => !machineNames || machineNames.length === 0 || machineNames.some(mn => mn === lib.machineName))
            .map(async lib => {
                const lib2 = lib;
                const info = await this.loadLibrary(lib);
                lib2.patchVersion = info.patchVersion;
                lib2.id = info.libraryId;
                lib2.restricted = false;
                lib2.runnable = info.runnable;
                lib2.title = info.title;
                return lib2;
            });
        libraries = (await Promise.all(libraries))
            .sort((lib1, lib2) => lib1.compare(lib2));

        const returnObject = {};
        // eslint-disable-next-line no-restricted-syntax
        for (const library of libraries) {
            if (!returnObject[library.machineName]) {
                returnObject[library.machineName] = [];
            }
            returnObject[library.machineName].push(library);
        }
        return returnObject;
    }

    /**
     * Is the library a patched version of an existing library?
     *
     * @param {Library} library
     * @returns {boolean} TRUE if the library is a patched version of an existing library, FALSE otherwise
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
     * Get id to an existing library.
     * If version number is not specified, the newest version will be returned.
     *
     * @param {Library} library Note that patch version is ignored.
     * @returns {number} The id of the specified library or undefined
     */
    async getId(library) {
        const libraryPath = this._getLibraryPath(library);
        if (await fs.exists(libraryPath)) {
            return crc32(libraryPath);
        }
        return undefined;
    }

    /**
     * Checks if the given library has a higher version.
     *
     * @param {Library} library
     * @return boolean
     */
    async libraryHasUpgrade(library) {
    }

    /**
     * 
     * @param {Library} library
     * @returns {Promise<ILibrary>} or undefined
     */
    async loadLibrary(library) {
        const libraryInfo = await fs.readJSON(this._getLibraryPath(library));
        if (!libraryInfo) {
            return undefined;
        }
        libraryInfo.libraryId = await this.getId(library);
        return libraryInfo;
        /**
         *  * @return array|FALSE
           *   FALSE if the library does not exist.
           *   Otherwise an associative array containing:
           *   - libraryId: The id of the library if it is an existing library.
           *   - title: The library's name
           *   - machineName: The library machineName
           *   - majorVersion: The library's majorVersion
           *   - minorVersion: The library's minorVersion
           *   - patchVersion: The library's patchVersion
           *   - runnable: 1 if the library is a content type, 0 otherwise
           *   - fullscreen(optional): 1 if the library supports fullscreen, 0 otherwise
           *   - embedTypes(optional): list of supported embed types
           *   - preloadedJs(optional): comma separated string with js file paths
           *   - preloadedCss(optional): comma separated sting with css file paths
           *   - dropLibraryCss(optional): list of associative arrays containing:
           *     - machineName: machine name for the librarys that are to drop their css
           *   - semantics(optional): Json describing the content structure for the library
           *   - preloadedDependencies(optional): list of associative arrays containing:
           *     - machineName: Machine name for a library this library is depending on
           *     - majorVersion: Major version for a library this library is depending on
           *     - minorVersion: Minor for a library this library is depending on
           *   - dynamicDependencies(optional): list of associative arrays containing:
           *     - machineName: Machine name for a library this library is depending on
           *     - majorVersion: Major version for a library this library is depending on
           *     - minorVersion: Minor for a library this library is depending on
           *   - editorDependencies(optional): list of associative arrays containing:
           *     - machineName: Machine name for a library this library is depending on
           *     - majorVersion: Major version for a library this library is depending on
           *     - minorVersion: Minor for a library this library is depending on
         */
    }

    /**
    * Get URL to file in the specific library
    * @param string $libraryFolderName
    * @param string $fileName
    * @return string URL to file
    */
    getLibraryFileUrl() {
        return "";
        // TODO: decide whether this should be put here
    }

    /**
    * Get URL to file in the specific library
    * @param {Library} library
    * @param {string} filename
    * @return {boolean}
    */
    async libraryFileExists(library, filename) {
        fs.pathExists(`${this._getLibraryPath(library)}/${filename}`);
    }

    /**
     * Load config for libraries
     *
     * @param array $libraries
     * @return array
     */
    getLibraryConfig() {
        // TODO: find out what this does
    }

    /**
     * 
     * @param {Library} library 
     */
    _getLibraryPath(library) {
        return `${this.config.libraryPath}/${library.getDirName()}/library.json`;
    }
}

module.exports = FileLibraryManager;