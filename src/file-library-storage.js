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
        const libraryPath = this._getLibraryJsonPath(library);
        if (await fs.exists(libraryPath)) {
            return crc32(libraryPath);
        }
        return undefined;
    }

    /**
     * Retrieves the content of a file in a library
     * @param {Library} library The library to look in
     * @param {Promise<string>} filename The path of the file (relative inside the library)
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
            await fs.writeJSON(this._getLibraryJsonPath(library), libraryMetadata);
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
     * Checks (as far as possible) if all necessary files are present for the library to run properly.
     * @param {Library} library The library to check
     * @returns {Promise<boolean>} true if the library is ok. Throws errors if not.
     */
    async checkConsistency(library) {
        if (! await (this.getId(library))) {
            throw new Error(`Error in library ${library.getDirName()}: not installed.`);
        }

        let metadata;
        try {
            metadata = JSON.parse(await this.getFileContentAsString(library, "library.json"));
        }
        catch (error) {
            throw new Error(`Error in library ${library.getDirName()}: library.json not readable: ${error.message}.`);
        }
        if (metadata.preloadedJs) {
            await this._checkFiles(library, metadata.preloadedJs.map(js => js.path));
        }
        if (metadata.preloadedCss) {
            await this._checkFiles(library, metadata.preloadedCss.map(css => css.path));
        }

        return true;
    }

    /**
     * Checks if all files in the list are present in the library.
     * @param {Library} library The library to check
     * @param {string[]} requiredFiles The files (relative paths in the library) that must be present
     * @returns {Promise<boolean>} true if all dependencies are present. Throws an error if any are missing.
     */
    async _checkFiles(library, requiredFiles) {
        const missingFiles = (await Promise.all(requiredFiles.map(async file => {
            return { status: await this.fileExists(library, file), path: file };
        }))).filter(file => !file.status).map(file => file.path);
        if (missingFiles.length > 0) {
            throw new Error(missingFiles.reduce((message, file) => `${message}${file} is missing.\n`, `Error in library ${library.getDirName()}:\n`));
        }
        return true;
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