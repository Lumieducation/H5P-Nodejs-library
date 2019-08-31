const fs = require('fs-extra');
const { crc32 } = require('crc');
const path = require('path');
const promisePipe = require('promisepipe');

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
     * @returns {Promise<Library[]>} the libraries installed
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

    /**
     * Returns the id of an installed library.
     * @param {Library} library The library to get the id for
     * @returns {Promise<any>} the id or undefined if the library is not installed
     */
    async getId(library) {
        const libraryPath = this._getFullPath(library, "library.json");
        if (await fs.exists(libraryPath)) {
            return crc32(libraryPath);
        }
        return undefined;
    }

    /**
     * Returns a readable stream of a library file's contents. 
     * Throws an exception if the file does not exist.
     * @param {Library} library library
     * @param {string} filename the relative path inside the library
     * @returns {Stream} a readable stream of the file's contents
     */
    async getFileStream(library, filename) {
        if (!(await this.fileExists(library, filename))) {
            throw new Error(`File ${filename} does not exist in library ${library.getDirName()}`);
        }

        return fs.createReadStream(path.join(this._librariesDirectory, library.getDirName(), filename));
    }

    /**
     * Gets a list of installed language files for the library.
     * @param {Library} library The library to get the languages for
     * @returns {Promise<string[]>} The list of JSON files in the language folder (without the extension .json)
     */
    async getLanguageFiles(library) {
        const files = await fs.readdir(this._getFullPath(library, "language"));
        return files
            .filter(file => path.extname(file) === ".json")
            .map(file => path.basename(file, ".json"));
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
     * Adds the metadata of the library to the repository.
     * Throws errors if something goes wrong.
     * @param {any} libraryMetadata The library metadata object (= content of library.json)
     * @param {boolean} restricted True if the library can only be used be users allowed to install restricted libraries.
     * @returns {Promise<Library>} The newly created library object to use when adding library files with addLibraryFile(...)
     */
    async installLibrary(libraryMetadata, { restricted = false }) {
        const library = new Library(libraryMetadata.machineName,
            libraryMetadata.majorVersion,
            libraryMetadata.minorVersion,
            libraryMetadata.patchVersion,
            restricted);

        const libPath = this._getDirectoryPath(library);
        if (await fs.pathExists(libPath)) {
            throw new Error(`Library ${library.getDirName()} has already been installed.`);
        }
        try {
            await fs.ensureDir(libPath);
            await fs.writeJSON(this._getFullPath(library, "library.json"), libraryMetadata);
            library.id = await this.getId(library);
            return library;
        }
        catch (error) {
            await fs.remove(libPath);
            throw error;
        }
    }

    /**
     * Removes the library and all its files from the repository.
     * Throws errors if something went wrong.
     * @param {Library} library The library to remove.
     * @returns {Promise<void>}
     */
    async removeLibrary(library) {
        const libPath = this._getDirectoryPath(library);
        if (!(await fs.pathExists(libPath))) {
            throw new Error(`Library ${library.getDirName()} is not installed on the system.`);
        }
        await fs.remove(libPath);
    }

    /**
     * Adds a library file to a library. The library metadata must have been installed with installLibrary(...) first.
     * Throws an error if something unexpected happens.
     * @param {Library} library The library that is being installed
     * @param {string} filename Filename of the file to add, relative to the library root
     * @param {stream} stream The stream containing the file content
     * @returns {Promise<boolean>} true if successful
     */
    async addLibraryFile(library, filename, stream) {
        if (! await (this.getId(library))) {
            throw new Error(`Can't add file ${filename} to library ${library.getDirName()} because the library metadata has not been installed.`);
        }
        const fullPath = this._getFullPath(library, filename);
        await fs.ensureDir(path.dirname(fullPath));
        const writeStream = fs.createWriteStream(fullPath);
        await promisePipe(stream, writeStream);

        return true;
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