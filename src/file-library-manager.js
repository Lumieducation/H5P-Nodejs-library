const fs = require('fs-extra');

class Library {
    constructor(machineName, major, minor, patch) {
        this.machineName = this.machineName;
        this.major = major;
        this.minor = minor;
        this.patch = patch;
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
     * @returns An object which has properties with the existing library machine names. The properties'
     * values are arrays of Library objects, which represent the different versions installed of this library. 
     */
    async getInstalled() {

    }

    /**
     * Is the library a patched version of an existing library?
     *
     * @param {Library} library
     * @return boolean
     *   TRUE if the library is a patched version of an existing library
     *   FALSE otherwise
     */
    isPatchedLibrary(library) {
        // TODO: implement
    }

    /**
     * Get id to an existing library.
     * If version number is not specified, the newest version will be returned.
     *
     * @param {Library} library Note that patch version is ignored.
     * @returns {number} The id of the specified library or FALSE
     */
    getId(library) {
        // TODO: Implement by returning CRC32 of folder path?
    }

    /**
     * Checks if the given library has a higher version.
     *
     * @param {Library} library
     * @return boolean
     */
    libraryHasUpgrade(library) { }

    /**
     * 
     * @param {Library} library
     * @returns {Promise<ILibrary>}
     */
    async loadLibrary(machineName, majorVersion, minorVersion) {
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
        // TODO: decide whether this should be put here
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
}