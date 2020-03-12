import fsExtra, { ReadStream } from 'fs-extra';
import globPromise from 'glob-promise';
import path from 'path';
import promisepipe from 'promisepipe';
import { Stream } from 'stream';
import { streamToString } from '../../helpers/StreamHelpers';

import {
    H5pError,
    IInstalledLibrary,
    ILibraryMetadata,
    ILibraryName,
    ILibraryStorage,
    InstalledLibrary,
    LibraryName
} from '../../../src';
import checkFilename from './filenameCheck';

/**
 * Stores libraries in a directory.
 */

export default class FileLibraryStorage implements ILibraryStorage {
    /**
     * Gets the directory path of the specified library.
     * @param {ILibraryName} library
     * @returns {string} the absolute path to the directory
     */
    protected getDirectoryPath(library: ILibraryName): string {
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
    protected getFilePath(library: ILibraryName, filename: string): string {
        return path.join(
            this.librariesDirectory,
            LibraryName.toUberName(library),
            filename
        );
    }

    /**
     * Files with this pattern are not returned when listing the directory contents. Can be used by classes
     * extending FileLibraryStorage to hide internals.
     */
    protected ignoredFilePatterns: RegExp[] = [];
    /**
     * @param {string} librariesDirectory The path of the directory in the file system at which libraries are stored.
     */
    constructor(private librariesDirectory: string) {
        fsExtra.ensureDirSync(librariesDirectory);
    }

    /**
     * Adds a library file to a library. The library metadata must have been installed with installLibrary(...) first.
     * Throws an error if something unexpected happens.
     * @param {ILibraryName} library The library that is being installed
     * @param {string} filename Filename of the file to add, relative to the library root
     * @param {Stream} stream The stream containing the file content
     * @returns {Promise<boolean>} true if successful
     */
    public async addFile(
        library: ILibraryName,
        filename: string,
        stream: Stream
    ): Promise<boolean> {
        checkFilename(filename);
        if (!(await this.libraryExists(library))) {
            throw new H5pError(
                'storage-file-implementations:add-library-file-not-installed',
                { filename, libraryName: LibraryName.toUberName(library) },
                500
            );
        }

        const fullPath = this.getFilePath(library, filename);
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
    public async clearFiles(library: ILibraryName): Promise<void> {
        if (!(await this.libraryExists(library))) {
            throw new H5pError(
                'storage-file-implementations:clear-library-not-found',
                {
                    libraryName: LibraryName.toUberName(library)
                }
            );
        }
        const fullLibraryPath = this.getDirectoryPath(library);
        const directoryEntries = (
            await fsExtra.readdir(fullLibraryPath)
        ).filter(entry => entry !== 'library.json');
        await Promise.all(
            directoryEntries.map(entry =>
                fsExtra.remove(this.getFilePath(library, entry))
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
        checkFilename(filename);
        if (this.isIgnored(filename)) {
            return false;
        }

        return fsExtra.pathExists(this.getFilePath(library, filename));
    }

    /**
     * Returns a readable stream of a library file's contents.
     * Throws an exception if the file does not exist.
     * @param {ILibraryName} library library
     * @param {string} filename the relative path inside the library
     * @returns {Promise<Stream>} a readable stream of the file's contents
     */
    public async getFileStream(
        library: ILibraryName,
        filename: string
    ): Promise<ReadStream> {
        if (
            !(await this.fileExists(library, filename)) ||
            this.isIgnored(filename)
        ) {
            throw new H5pError(
                'library-file-missing',
                {
                    filename,
                    library: LibraryName.toUberName(library)
                },
                404
            );
        }

        return fsExtra.createReadStream(this.getFilePath(library, filename));
    }

    /**
     * Returns all installed libraries or the installed libraries that have the machine names in the arguments.
     * @param  {...string[]} machineNames (optional) only return libraries that have these machine names
     * @returns {Promise<ILibraryName[]>} the libraries installed
     */
    public async getInstalledLibraryNames(
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
    public async getLanguages(library: ILibraryName): Promise<string[]> {
        const files = await fsExtra.readdir(
            this.getFilePath(library, 'language')
        );
        return files
            .filter(file => path.extname(file) === '.json')
            .map(file => path.basename(file, '.json'));
    }

    /**
     * Gets the library metadata (= content of library.json) of the library.
     * @param library the library
     * @returns the metadata
     */
    public async getLibrary(library: ILibraryName): Promise<IInstalledLibrary> {
        if (!(await this.libraryExists(library))) {
            throw new H5pError(
                'storage-file-implementations:get-library-metadata-not-installed',
                { libraryName: LibraryName.toUberName(library) },
                404
            );
        }
        return InstalledLibrary.fromMetadata(
            JSON.parse(
                await streamToString(
                    await this.getFileStream(library, 'library.json')
                )
            )
        );
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
            throw new H5pError(
                'storage-file-implementations:install-library-already-installed',
                {
                    libraryName: LibraryName.toUberName(library)
                }
            );
        }
        try {
            await fsExtra.ensureDir(libPath);
            await fsExtra.writeJSON(
                this.getFilePath(library, 'library.json'),
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
        return (await globPromise(path.join(libPath, '**/*.*')))
            .map(p => path.relative(libPath, p))
            .filter(p => !this.isIgnored(p));
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
            throw new H5pError(
                'storage-file-implementations:remove-library-library-missing',
                { libraryName: LibraryName.toUberName(library) },
                404
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
            throw new H5pError(
                'storage-file-implementations:update-library-library-missing',
                { libraryName: LibraryName.toUberName(libraryMetadata) },
                404
            );
        }
        await fsExtra.writeJSON(
            this.getFilePath(libraryMetadata, 'library.json'),
            libraryMetadata
        );
        const newLibrary = InstalledLibrary.fromMetadata(libraryMetadata);
        return newLibrary;
    }

    /**
     * Checks if a filename is in the ignore list.
     * @param filename the filename to check
     */
    private isIgnored(filename: string): boolean {
        return this.ignoredFilePatterns.some(pattern => pattern.test(filename));
    }
}
