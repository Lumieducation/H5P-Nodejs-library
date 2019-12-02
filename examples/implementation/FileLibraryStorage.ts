import { crc32 } from 'crc';
import fsExtra, { ReadStream } from 'fs-extra';
import globPromise from 'glob-promise';
import path from 'path';
import promisepipe from 'promisepipe';
import { Stream } from 'stream';

import {
    IInstalledLibrary,
    ILibraryMetadata,
    ILibraryName,
    ILibraryStorage,
    InstalledLibrary,
    LibraryName
} from '../../src';

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
     * @param {ILibraryName} library The library that is being installed
     * @param {string} filename Filename of the file to add, relative to the library root
     * @param {Stream} stream The stream containing the file content
     * @returns {Promise<boolean>} true if successful
     */
    public async addLibraryFile(
        library: ILibraryName,
        filename: string,
        stream: Stream
    ): Promise<boolean> {
        if (!(await this.libraryExists(library))) {
            throw new Error(
                `Can't add file ${filename} to library ${LibraryName.toUberName(
                    library
                )} because the library metadata has not been installed.`
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
     * @param {ILibraryName} library the library whose files should be deleted
     * @returns {Promise<void>}
     */
    public async clearLibraryFiles(library: ILibraryName): Promise<void> {
        if (!(await this.libraryExists(library))) {
            throw new Error(
                `Can't clear library ${LibraryName.toUberName(
                    library
                )} because the library has not been installed.`
            );
        }
        const fullLibraryPath = this.getDirectoryPath(library);
        const directoryEntries = (
            await fsExtra.readdir(fullLibraryPath)
        ).filter(entry => entry !== 'library.json');
        await Promise.all(
            directoryEntries.map(entry =>
                fsExtra.remove(this.getFullPath(library, entry))
            )
        );
    }

    /**
     * Check if the library contains a file
     * @param {ILibraryName} library The library to check
     * @param {string} filename
     * @returns {Promise<boolean>} true if file exists in library, false otherwise
     */
    public async fileExists(
        library: ILibraryName,
        filename: string
    ): Promise<boolean> {
        return fsExtra.pathExists(this.getFullPath(library, filename));
    }

    /**
     * Returns a readable stream of a library file's contents.
     * Throws an exception if the file does not exist.
     * @param {ILibraryName} library library
     * @param {string} filename the relative path inside the library
     * @returns {Promise<Stream>} a readable stream of the file's contents
     */
    public getFileStream(library: ILibraryName, filename: string): ReadStream {
        return fsExtra.createReadStream(
            path.join(
                this.librariesDirectory,
                LibraryName.toUberName(library),
                filename
            )
        );
    }

    /**
     * Returns all installed libraries or the installed libraries that have the machine names in the arguments.
     * @param  {...string[]} machineNames (optional) only return libraries that have these machine names
     * @returns {Promise<ILibraryName[]>} the libraries installed
     */
    public async getInstalled(
        ...machineNames: string[]
    ): Promise<ILibraryName[]> {
        const nameRegex = /([^\s]+)-(\d+)\.(\d+)/;
        const libraryDirectories = await fsExtra.readdir(
            this.librariesDirectory
        );
        return libraryDirectories
            .filter(name => nameRegex.test(name))
            .map(name => {
                return LibraryName.fromUberName(name);
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
     * @param {ILibraryName} library The library to get the languages for
     * @returns {Promise<string[]>} The list of JSON files in the language folder (without the extension .json)
     */
    public async getLanguageFiles(library: ILibraryName): Promise<string[]> {
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
     * @param {ILibraryMetadata} libraryMetadata The library metadata object (= content of library.json)
     * @param {boolean} restricted True if the library can only be used be users allowed to install restricted libraries.
     * @returns {Promise<IInstalledLibrary>} The newly created library object to use when adding library files with addLibraryFile(...)
     */
    public async installLibrary(
        libraryMetadata: ILibraryMetadata,
        restricted: boolean = false
    ): Promise<IInstalledLibrary> {
        const library = new InstalledLibrary(
            libraryMetadata.machineName,
            libraryMetadata.majorVersion,
            libraryMetadata.minorVersion,
            libraryMetadata.patchVersion,
            restricted
        );

        const libPath = this.getDirectoryPath(library);
        if (await fsExtra.pathExists(libPath)) {
            throw new Error(
                `Library ${LibraryName.toUberName(
                    library
                )} has already been installed.`
            );
        }
        try {
            await fsExtra.ensureDir(libPath);
            await fsExtra.writeJSON(
                this.getFullPath(library, 'library.json'),
                libraryMetadata
            );
            return library;
        } catch (error) {
            await fsExtra.remove(libPath);
            throw error;
        }
    }

    /**
     * Checks if the library has been installed.
     * @param name the library name
     * @returns true if the library has been installed
     */
    public async libraryExists(name: ILibraryName): Promise<boolean> {
        return fsExtra.pathExists(this.getDirectoryPath(name));
    }

    /**
     * Gets a list of all library files that exist for this library.
     * @param {ILibraryName} library
     * @returns {Promise<string[]>} all files that exist for the library
     */
    public async listFiles(library: ILibraryName): Promise<string[]> {
        const libPath = this.getDirectoryPath(library);
        return (await globPromise(path.join(libPath, '**/*.*'))).map(p =>
            path.relative(libPath, p)
        );
    }

    /**
     * Removes the library and all its files from the repository.
     * Throws errors if something went wrong.
     * @param {ILibraryName} library The library to remove.
     * @returns {Promise<void>}
     */
    public async removeLibrary(library: ILibraryName): Promise<void> {
        const libPath = this.getDirectoryPath(library);
        if (!(await fsExtra.pathExists(libPath))) {
            throw new Error(
                `Library ${LibraryName.toUberName(
                    library
                )} is not installed on the system.`
            );
        }
        await fsExtra.remove(libPath);
    }

    /**
     * Updates the library metadata.
     * This is necessary when updating to a new patch version.
     * You also need to call clearLibraryFiles(...) to remove all old files during the update process and addLibraryFile(...)
     * to add the files of the patch.
     * @param {ILibraryMetadata} libraryMetadata the new library metadata
     * @returns {Promise<IInstalledLibrary>} The updated library object
     */
    public async updateLibrary(
        libraryMetadata: ILibraryMetadata
    ): Promise<IInstalledLibrary> {
        const libPath = this.getDirectoryPath(libraryMetadata);
        if (!(await fsExtra.pathExists(libPath))) {
            throw new Error(
                `Library ${LibraryName.toUberName(
                    libraryMetadata
                )} can't be updated as it hasn't been installed yet.`
            );
        }
        await fsExtra.writeJSON(
            this.getFullPath(libraryMetadata, 'library.json'),
            libraryMetadata
        );
        const newLibrary = InstalledLibrary.fromMetadata(libraryMetadata);
        return newLibrary;
    }

    /**
     * Gets the directory path of the specified library.
     * @param {ILibraryName} library
     * @returns {string} the absolute path to the directory
     */
    private getDirectoryPath(library: ILibraryName): string {
        return path.join(
            this.librariesDirectory,
            LibraryName.toUberName(library)
        );
    }

    /**
     * Gets the path of any file of the specified library.
     * @param {ILibraryName} library
     * @param {string} filename
     * @returns {string} the absolute path to the file
     */
    private getFullPath(library: ILibraryName, filename: string): string {
        return path.join(
            this.librariesDirectory,
            LibraryName.toUberName(library),
            filename
        );
    }
}
