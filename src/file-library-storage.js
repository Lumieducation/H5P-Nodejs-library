const fs = require('fs-extra');
const { crc32 } = require('crc');
const path = require('path');

const Library = require('./library');

/**
 * Stores libraries in a directory.
 */

class FileLibraryStorage {
    /**
     * @param {string} librariesDirectory The path of the directory in the file system at which libraries are stored.
     */
    constructor(librariesDirectory) {
        this._librariesDirectory = librariesDirectory;
    }

    /**
     * Returns all installed libraries or the installed libraries that have the machine names in the arguments.
     * @param  {...any} machineNames (optional) only return libraries that have these machine names
     * @returns {Library[]} the libraries installed
     */
    async getInstalled(...machineNames) {
        const nameRegex = /([^\s]+)-(\d+)\.(\d+)/;
        const libraryDirectories = await fs.readdir(this._librariesDirectory);
        return libraryDirectories
            .filter(name => nameRegex.test(name))
            .map(name => {
                const result = nameRegex.exec(name);
                return new Library(result[1], result[2], result[3], false);
            })
            .filter(lib => !machineNames || machineNames.length === 0 || machineNames.some(mn => mn === lib.machineName));
    }

    async getId(library) {
        const libraryPath = this._getLibraryPath(library);
        if (await fs.exists(libraryPath)) {
            return crc32(libraryPath);
        }
        return undefined;
    }

    /**
     * Retrieves the content of a file in a library
     * @param {Library} library The library to look in
     * @param {string} filename The path of the file (relative inside the library)
     */
    async getFileContentAsString(library, filename) {
        return fs.readFile(path.join(this._librariesDirectory, library.getDirName(), filename), { encoding: "utf8" });
    }

    /**
    * Check if the library contains a file
    * @param {Library} library The library to check
    * @param {string} filename
    * @return {Promise<boolean>} true if file exists in library, false otherwise
    */
    async fileExists(library, filename) {
        return fs.pathExists(path.join(this._getLibraryPath(library), filename));
    }

    /**
     * Gets the path of the file 'library.json' of the specified library.
     * @param {Library} library 
     * @returns {string} the path to 'library.json'
     */
    _getLibraryPath(library) {
        return path.join(this._librariesDirectory, library.getDirName(), "library.json");
    }
}

module.exports = FileLibraryStorage;