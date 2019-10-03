import { crc32 } from 'crc';
import fsExtra, { ReadStream } from 'fs-extra';
import globPromise from 'glob-promise';
import path from 'path';
import promisepipe from 'promisepipe';
import { Stream } from 'stream';

import Library from './Library';
import { ILibraryStorage } from './types';

/**
 * Stores libraries in a directory.
 */

export default class FileLibraryStorage implements ILibraryStorage {
    /**
     * @param {string} librariesDirectory The path of the directory in the file system at which libraries are stored.
     */
    constructor(librariesDirectory: string) {
        this.librariesDirectory = librariesDirectory;
    }

    private librariesDirectory: string;

    /**
     * Adds a library file to a library. The library metadata must have been installed with installLibrary(...) first.
     * Throws an error if something unexpected happens.
     * @param {Library} library The library that is being installed
     * @param {string} filename Filename of the file to add, relative to the library root
     * @param {Stream} stream The stream containing the file content
     * @returns {Promise<boolean>} true if successful
     */
    public async addLibraryFile(
        library: Library,
        filename: string,
        stream: Stream
    ): Promise<boolean> {
        if (!(await this.getId(library))) {
            throw new Error(
                `Can't add file ${filename} to library ${library.getDirName()} because the library metadata has not been installed.`
            );
        }
        const fullPath = this.getFullPath(library, filename);
        await fsExtra.ensureDir(path.dirname(fullPath));
        const writeStream = fsExtra.createWriteStream(fullPath);
        await promisepipe(stream, writeStream);

        return true;
    }

    /**
     * Removes all files of a library. Doesn't delete the library metadata. (Used when updating libraries.)
     * @param {Library} library the library whose files should be deleted
     * @returns {Promise<void>}
     */
    public async clearLibraryFiles(library: Library): Promise<void> {
        if (!(await this.getId(library))) {
            throw new Error(
                `Can't clear library ${library.getDirName()} because the library has not been installed.`
            );
        }
        const fullLibraryPath = this.getDirectoryPath(library);
        const directoryEntries = (await fsExtra.readdir(
            fullLibraryPath
        )).filter(entry => entry !== 'library.json');
        await Promise.all(
            directoryEntries.map(entry =>
                fsExtra.remove(this.getFullPath(library, entry))
            )
        );
    }

    /**
     * Check if the library contains a file
     * @param {Library} library The library to check
     * @param {string} filename
     * @return {Promise<boolean>} true if file exists in library, false otherwise
     */
    public async fileExists(
        library: Library,
        filename: string
    ): Promise<boolean> {
        return fsExtra.pathExists(this.getFullPath(library, filename));
    }

    /**
     * Returns a readable stream of a library file's contents.
     * Throws an exception if the file does not exist.
     * @param {Library} library library
     * @param {string} filename the relative path inside the library
     * @returns {Promise<Stream>} a readable stream of the file's contents
     */
    public getFileStream(library: Library, filename: string): ReadStream {
        return fsExtra.createReadStream(
            path.join(this.librariesDirectory, library.getDirName(), filename)
        );
    }

    /**
     * Returns the id of an installed library.
     * @param {Library} library The library to get the id for
     * @returns {Promise<any>} the id or undefined if the library is not installed
     */
    public async getId(library: Library): Promise<any> {
        const libraryPath = this.getFullPath(library, 'library.json');
        if (await fsExtra.pathExists(libraryPath)) {
            return crc32(libraryPath);
        }
        return undefined;
    }

    /**
     * Returns all installed libraries or the installed libraries that have the machine names in the arguments.
     * @param  {...any} machineNames (optional) only return libraries that have these machine names
     * @returns {Promise<Library[]>} the libraries installed
     */
    public async getInstalled(...machineNames: any[]): Promise<Library[]> {
        const nameRegex = /([^\s]+)-(\d+)\.(\d+)/;
        const libraryDirectories = await fsExtra.readdir(
            this.librariesDirectory
        );
        return libraryDirectories
            .filter(name => nameRegex.test(name))
            .map(name => {
                return Library.createFromName(name);
            })
            .filter(
                lib =>
                    !machineNames ||
                    machineNames.length === 0 ||
                    machineNames.some(mn => mn === lib.machineName)
            );
    }

    /**
     * Gets a list of installed language files for the library.
     * @param {Library} library The library to get the languages for
     * @returns {Promise<string[]>} The list of JSON files in the language folder (without the extension .json)
     */
    public async getLanguageFiles(library: Library): Promise<string[]> {
        const files = await fsExtra.readdir(
            this.getFullPath(library, 'language')
        );
        return files
            .filter(file => path.extname(file) === '.json')
            .map(file => path.basename(file, '.json'));
    }

    /**
     * Adds the metadata of the library to the repository.
     * Throws errors if something goes wrong.
     * @param {any} libraryMetadata The library metadata object (= content of library.json)
     * @param {boolean} restricted True if the library can only be used be users allowed to install restricted libraries.
     * @returns {Promise<Library>} The newly created library object to use when adding library files with addLibraryFile(...)
     */
    public async installLibrary(
        libraryMetadata: any,
        restricted: boolean = false
    ): Promise<Library> {
        const library = new Library(
            libraryMetadata.machineName,
            libraryMetadata.majorVersion,
            libraryMetadata.minorVersion,
            libraryMetadata.patchVersion,
            restricted
        );

        const libPath = this.getDirectoryPath(library);
        if (await fsExtra.pathExists(libPath)) {
            throw new Error(
                `Library ${library.getDirName()} has already been installed.`
            );
        }
        try {
            await fsExtra.ensureDir(libPath);
            await fsExtra.writeJSON(
                this.getFullPath(library, 'library.json'),
                libraryMetadata
            );
            library.id = await this.getId(library);
            return library;
        } catch (error) {
            await fsExtra.remove(libPath);
            throw error;
        }
    }

    /**
     * Gets a list of translations that exist for this library.
     * @param {Library} library
     * @returns {Promise<string[]>} the language codes for translations of this library
     */
    public async listFiles(library: Library): Promise<string[]> {
        const libPath = this.getDirectoryPath(library);
        return (await globPromise(path.join(libPath, '**/*.*'))).map(p => path.relative(libPath, p));
    }

    /**
     * Removes the library and all its files from the repository.
     * Throws errors if something went wrong.
     * @param {Library} library The library to remove.
     * @returns {Promise<void>}
     */
    public async removeLibrary(library: Library): Promise<void> {
        const libPath = this.getDirectoryPath(library);
        if (!(await fsExtra.pathExists(libPath))) {
            throw new Error(
                `Library ${library.getDirName()} is not installed on the system.`
            );
        }
        await fsExtra.remove(libPath);
    }

    /**
     * Updates the library metadata.
     * This is necessary when updating to a new patch version.
     * You also need to call clearLibraryFiles(...) to remove all old files during the update process and addLibraryFile(...)
     * to add the files of the patch.
     * @param {Library} library the library object (containing the id of the library)
     * @param {any} libraryMetadata the new library metadata
     * @returns {Promise<Library>} The updated library object
     */
    public async updateLibrary(
        library: Library,
        libraryMetadata: any
    ): Promise<Library> {
        const libPath = this.getDirectoryPath(library);
        if (!(await fsExtra.pathExists(libPath))) {
            throw new Error(
                `Library ${library.getDirName()} can't be updated as it hasn't been installed yet.`
            );
        }
        await fsExtra.writeJSON(
            this.getFullPath(library, 'library.json'),
            libraryMetadata
        );
        const newLibrary = Library.createFromMetadata(libraryMetadata);
        newLibrary.id = await this.getId(newLibrary);
        return newLibrary;
    }

    /**
     * Gets the directory path of the specified library.
     * @param {Library} library
     * @returns {string} the absolute path to the directory
     */
    private getDirectoryPath(library: Library): string {
        return path.join(this.librariesDirectory, library.getDirName());
    }

    /**
     * Gets the path of any file of the specified library.
     * @param {Library} library
     * @param {string} filename
     * @returns {string} the absolute path to the file
     */
    private getFullPath(library: Library, filename: string): string {
        return path.join(
            this.librariesDirectory,
            library.getDirName(),
            filename
        );
    }
}
