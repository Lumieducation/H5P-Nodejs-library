import { Readable } from 'stream';
import fsExtra from 'fs-extra';
import { getAllFiles } from 'get-all-files';
import path from 'path';
import promisepipe from 'promisepipe';
import upath from 'upath';

import { checkFilename } from './filenameUtils';
import {
    IFileStats,
    IAdditionalLibraryMetadata,
    IInstalledLibrary,
    ILibraryMetadata,
    ILibraryName,
    ILibraryStorage
} from '../../types';
import { streamToString } from '../../helpers/StreamHelpers';
import H5pError from '../../helpers/H5pError';
import InstalledLibrary from '../../InstalledLibrary';
import LibraryName from '../../LibraryName';

/**
 * Stores libraries in a directory.
 */

export default class FileLibraryStorage implements ILibraryStorage {
    /**
     * Gets the directory path of the specified library.
     * @param library
     * @returns the absolute path to the directory
     */
    protected getDirectoryPath(library: ILibraryName): string {
        return path.join(
            this.getLibrariesDirectory(),
            LibraryName.toUberName(library)
        );
    }

    /**
     * Gets the path of any file of the specified library.
     * @param library
     * @param filename
     * @returns the absolute path to the file
     */
    protected getFilePath(library: ILibraryName, filename: string): string {
        return path.join(
            this.getLibrariesDirectory(),
            LibraryName.toUberName(library),
            filename
        );
    }

    /**
     * Get the base path of the libraries
     * @returns the base library path
     */
    protected getLibrariesDirectory(): string {
        return this.librariesDirectory;
    }

    /**
     * Files with this pattern are not returned when listing the directory contents. Can be used by classes
     * extending FileLibraryStorage to hide internals.
     */
    protected ignoredFilePatterns: RegExp[] = [];
    /**
     * @param librariesDirectory The path of the directory in the file system at which libraries are stored.
     */
    constructor(protected librariesDirectory: string) {
        fsExtra.ensureDirSync(librariesDirectory);
    }

    /**
     * Adds a library file to a library. The library metadata must have been installed with installLibrary(...) first.
     * Throws an error if something unexpected happens.
     * @param library The library that is being installed
     * @param filename Filename of the file to add, relative to the library root
     * @param stream The stream containing the file content
     * @returns true if successful
     */
    public async addFile(
        library: ILibraryName,
        filename: string,
        stream: Readable
    ): Promise<boolean> {
        checkFilename(filename);
        if (!(await this.isInstalled(library))) {
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
     * Adds the metadata of the library to the repository.
     * Throws errors if something goes wrong.
     * @param libraryMetadata The library metadata object (= content of library.json)
     * @param restricted True if the library can only be used be users allowed to install restricted libraries.
     * @returns The newly created library object to use when adding library files with addFile(...)
     */
    public async addLibrary(
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
     * Removes all files of a library. Doesn't delete the library metadata. (Used when updating libraries.)
     * @param library the library whose files should be deleted
     * @returns
     */
    public async clearFiles(library: ILibraryName): Promise<void> {
        if (!(await this.isInstalled(library))) {
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
        ).filter((entry) => entry !== 'library.json');
        await Promise.all(
            directoryEntries.map((entry) =>
                fsExtra.remove(this.getFilePath(library, entry))
            )
        );
    }

    /**
     * Removes the library and all its files from the repository.
     * Throws errors if something went wrong.
     * @param library The library to remove.
     * @returns
     */
    public async deleteLibrary(library: ILibraryName): Promise<void> {
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
     * Check if the library contains a file
     * @param library The library to check
     * @param filename
     * @returns true if file exists in library, false otherwise
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
     * Counts how often libraries are listed in the dependencies of other
     * libraries and returns a list of the number.
     * @returns an object with ubernames as key.
     * Example:
     * {
     *   'H5P.Example': 10
     * }
     * This means that H5P.Example is used by 10 other libraries.
     */
    public async getAllDependentsCount(): Promise<{
        [ubername: string]: number;
    }> {
        const librariesNames = await this.getInstalledLibraryNames();
        const librariesMetadata = await Promise.all(
            librariesNames.map((lib) => this.getLibrary(lib))
        );

        // the metadata map allows faster access to libraries by ubername
        const librariesMetadataMap: {
            [ubername: string]: IInstalledLibrary;
        } = librariesMetadata.reduce((prev, curr) => {
            prev[LibraryName.toUberName(curr)] = curr;
            return prev;
        }, {});

        // Remove circular dependencies caused by editor dependencies in
        // content types like H5P.InteractiveVideo.
        for (const libraryMetadata of librariesMetadata) {
            for (const dependency of libraryMetadata.editorDependencies ?? []) {
                const ubername = LibraryName.toUberName(dependency);
                const index = librariesMetadataMap[
                    ubername
                ]?.preloadedDependencies?.findIndex((ln) =>
                    LibraryName.equal(ln, libraryMetadata)
                );
                if (index >= 0) {
                    librariesMetadataMap[ubername].preloadedDependencies.splice(
                        index,
                        1
                    );
                }
            }
        }

        // Count dependencies
        const dependencies = {};
        for (const libraryMetadata of librariesMetadata) {
            for (const dependency of (
                libraryMetadata.preloadedDependencies ?? []
            )
                .concat(libraryMetadata.editorDependencies ?? [])
                .concat(libraryMetadata.dynamicDependencies ?? [])) {
                const ubername = LibraryName.toUberName(dependency);
                dependencies[ubername] = (dependencies[ubername] ?? 0) + 1;
            }
        }

        return dependencies;
    }

    /**
     * Returns the number of libraries that depend on this (single) library.
     * @param library the library to check
     * @returns the number of libraries that depend on this library.
     */
    public async getDependentsCount(library: ILibraryName): Promise<number> {
        const allDependencies = await this.getAllDependentsCount();
        return allDependencies[LibraryName.toUberName(library)] ?? 0;
    }

    public async getFileAsJson(
        library: ILibraryName,
        file: string
    ): Promise<any> {
        const str = await this.getFileAsString(library, file);
        return JSON.parse(str);
    }

    public async getFileAsString(
        library: ILibraryName,
        file: string
    ): Promise<string> {
        const stream: Readable = await this.getFileStream(library, file);
        return streamToString(stream);
    }

    /**
     * Returns a information about a library file.
     * Throws an exception if the file does not exist.
     * @param library library
     * @param filename the relative path inside the library
     * @returns the file stats
     */
    public async getFileStats(
        library: ILibraryName,
        filename: string
    ): Promise<IFileStats> {
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
        return fsExtra.stat(this.getFilePath(library, filename));
    }

    /**
     * Returns a readable stream of a library file's contents.
     * Throws an exception if the file does not exist.
     * @param library library
     * @param filename the relative path inside the library
     * @returns a readable stream of the file's contents
     */
    public async getFileStream(
        library: ILibraryName,
        filename: string
    ): Promise<Readable> {
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
     * Returns all installed libraries or the installed libraries that have the
     * machine names.
     * @param machineName (optional) only return libraries that have this
     * machine name
     * @returns the libraries installed
     */
    public async getInstalledLibraryNames(
        machineName?: string
    ): Promise<ILibraryName[]> {
        const nameRegex = /^([\w.]+)-(\d+)\.(\d+)$/i;
        const libraryDirectories = await fsExtra.readdir(
            this.getLibrariesDirectory()
        );
        return libraryDirectories
            .filter((name) => nameRegex.test(name))
            .map((name) => LibraryName.fromUberName(name))
            .filter((lib) => !machineName || lib.machineName === machineName);
    }

    /**
     * Gets a list of installed language files for the library.
     * @param library The library to get the languages for
     * @returns The list of JSON files in the language folder (without the extension .json)
     */
    public async getLanguages(library: ILibraryName): Promise<string[]> {
        const files = await fsExtra.readdir(
            this.getFilePath(library, 'language')
        );
        return files
            .filter((file) => path.extname(file) === '.json')
            .map((file) => path.basename(file, '.json'));
    }

    /**
     * Gets the library metadata (= content of library.json) of the library.
     * @param library the library
     * @returns the metadata
     */
    public async getLibrary(library: ILibraryName): Promise<IInstalledLibrary> {
        if (!(await this.isInstalled(library))) {
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
     * Checks if a library is installed in the system.
     * @param library the library to check
     * @returns true if installed, false if not
     */
    public async isInstalled(library: ILibraryName): Promise<boolean> {
        return fsExtra.pathExists(this.getFilePath(library, 'library.json'));
    }

    /**
     * Returns a list of library addons that are installed in the system.
     * Addons are libraries that have the property 'addTo' in their metadata.
     */
    public async listAddons(): Promise<ILibraryMetadata[]> {
        const installedLibraries = await this.getInstalledLibraryNames();
        return (
            await Promise.all(
                installedLibraries.map((addonName) =>
                    this.getLibrary(addonName)
                )
            )
        ).filter((library) => library.addTo !== undefined);
    }

    /**
     * Gets a list of all library files that exist for this library.
     * @param library
     * @returns all files that exist for the library
     */
    public async listFiles(library: ILibraryName): Promise<string[]> {
        const libPath = this.getDirectoryPath(library);
        const libPathLength = libPath.length + 1;
        return (await getAllFiles(libPath).toArray())
            .map((p) => p.substr(libPathLength))
            .filter((p) => !this.isIgnored(p))
            .map((p) => upath.toUnix(p))
            .sort();
    }

    /**
     * Updates the additional metadata properties that is added to the
     * stored libraries. This metadata can be used to customize behavior like
     * restricting libraries to specific users.
     * @param library the library for which the metadata should be updated
     * @param additionalMetadata the metadata to update
     * @returns true if the additionalMetadata object contained real changes
     * and if they were successfully saved; false if there were not changes.
     * Throws an error if saving was not possible.
     */
    public async updateAdditionalMetadata(
        library: ILibraryName,
        additionalMetadata: Partial<IAdditionalLibraryMetadata>
    ): Promise<boolean> {
        const metadata = await this.getLibrary(library);

        // We set dirty to true if there is an actual update in the
        // additional metadata.
        let dirty = false;
        for (const property of Object.keys(additionalMetadata)) {
            if (additionalMetadata[property] !== metadata[property]) {
                metadata[property] = additionalMetadata[property];
                dirty = true;
            }
        }
        if (!dirty) {
            return false;
        }

        try {
            await fsExtra.writeJSON(
                this.getFilePath(library, 'library.json'),
                metadata
            );
            return true;
        } catch (error) {
            throw new H5pError(
                'storage-file-implementations:error-updating-metadata',
                {
                    library: LibraryName.toUberName(library),
                    error: error.message
                },
                500
            );
        }
    }

    /**
     * Updates the library metadata.
     * This is necessary when updating to a new patch version.
     * You also need to call clearFiles(...) to remove all old files
     * during the update process and addFile(...) to add the files of
     * the patch.
     * @param libraryMetadata the new library metadata
     * @returns The updated library object
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
        return this.ignoredFilePatterns.some((pattern) =>
            pattern.test(filename)
        );
    }
}
