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
                return Library.createFromName(name)
            })
            .filter(lib => !machineNames || machineNames.length === 0 || machineNames.some(mn => mn === lib.machineName));
    }

    async getId(library) {
        const libraryPath = this._getLibraryJsonPath(library);
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
        return fs.pathExists(this._getFullPath(library, filename));
    }

    /**
     * Installs a library from a temporary directory by copying the files from there.
     * Throws an error if something unexpected happens and cleans up already copied files.
     * @param {Library} library The library that is being installed
     * @param {string} directory The path to the directory where the library files can be found (base directory that includes library.json)
     * @returns {boolean} true if successful
     */
    async installFromDirectory(library, directory) {
        await fs.ensureDir(this._getDirectoryPath(library));
        try {
            const dirContent = await fs.readdir(directory);
            await Promise.all(dirContent.map(async dirEntry => {
                return fs.copy(path.join(directory, dirEntry), this._getFullPath(library, dirEntry), { recursive: true });
            }));
            return true;
        } catch (error) {
            await fs.remove(this._getDirectoryPath(library));
            throw error;
        }
    }

    /**
     * Gets the path of the file 'library.json' of the specified library.
     * @param {Library} library 
     * @returns {string} the path to 'library.json'
     */
    _getLibraryJsonPath(library) {
        return path.join(this._librariesDirectory, library.getDirName(), "library.json");
    }

    /**
     * Gets the directory path of the specified library.
     * @param {Library} library 
     * @returns {string} the asbolute path to the directory
     */
    _getDirectoryPath(library) {
        return path.join(this._librariesDirectory, library.getDirName());
    }

    /**
     * Gets the path of any file of the specified library.
     * @param {Library} library 
     * @param {string} filename
     * @returns {string} the absolute path to the file
     */
    _getFullPath(library, filename) {
        return path.join(this._librariesDirectory, library.getDirName(), filename);
    }
}

module.exports = FileLibraryStorage;