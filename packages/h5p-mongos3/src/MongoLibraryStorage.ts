/* eslint-disable no-underscore-dangle */

import MongoDB, {
    Binary,
    DeleteResult,
    InsertOneResult,
    UpdateResult
} from 'mongodb';
import { Readable } from 'stream';
import * as path from 'path';
import {
    IAdditionalLibraryMetadata,
    IFileStats,
    IInstalledLibrary,
    ILibraryMetadata,
    ILibraryName,
    ILibraryStorage,
    LibraryName,
    InstalledLibrary,
    H5pError,
    streamToString,
    Logger
} from '@lumieducation/h5p-server';
import { ReadableStreamBuffer } from 'stream-buffers';

const log = new Logger('MongoLibraryStorage');

export default class MongoLibraryStorage implements ILibraryStorage {
    /**
     * @param mongodb a MongoDB collection (read- and writable)
     * @param options options
     */
    constructor(private mongodb: MongoDB.Collection, private options?: {}) {
        log.info('initialize');
    }

    /**
     * Adds a library file to a library. The library metadata must have been installed with addLibrary(...) first.
     * Throws an error if something unexpected happens. In this case the method calling addFile(...) will clean
     * up the partly installed library.
     * @param library The library that is being installed
     * @param filename Filename of the file to add, relative to the library root
     * @param readable The Readable containing the file content
     * @returns true if successful
     */
    public async addFile(
        library: ILibraryName,
        filename: string,
        readable: Readable
    ): Promise<boolean> {
        this.validateFilename(filename);
        const buffer = await this.readableToBuffer(readable);

        let result: UpdateResult;
        try {
            result = await this.mongodb.updateOne(
                {
                    _id: LibraryName.toUberName(library)
                },
                {
                    $push: {
                        files: {
                            data: new Binary(buffer),
                            filename,
                            lastModified: new Date(Date.now()).getTime(),
                            size: buffer.byteLength
                        }
                    }
                }
            );
        } catch (error) {
            log.error(
                `Error while adding file "${filename}" to MongoDB: ${error.message}`
            );
            throw new H5pError(
                'mongo-library-storage:add-file-error',
                { ubername: LibraryName.toUberName(library), filename },
                500
            );
        }

        if (result.matchedCount !== 1) {
            throw new H5pError(
                'mongo-library-storage:library-not-found',
                {
                    ubername: LibraryName.toUberName(library)
                },
                404
            );
        }

        return true;
    }

    /**
     * Adds the metadata of the library to the repository and assigns a new id
     * to the installed library. This id is used later when the library must be
     * referenced somewhere. Throws errors if something goes wrong.
     * @param libraryMetadata The library metadata object (= content of
     * library.json)
     * @param restricted True if the library can only be used be users allowed
     * to install restricted libraries.
     * @returns The newly created library object to use when adding library
     * files with addFile(...)
     */
    public async addLibrary(
        libraryData: ILibraryMetadata,
        restricted: boolean
    ): Promise<IInstalledLibrary> {
        const ubername = LibraryName.toUberName(libraryData);
        let result: InsertOneResult<any>;
        try {
            result = await this.mongodb.insertOne({
                _id: ubername as any,
                metadata: libraryData,
                additionalMetadata: { restricted },
                files: []
            });
        } catch (error) {
            log.error(`Error adding library to MongoDB: ${error.message}`);
            throw new H5pError('mongo-library-storage:error-adding-metadata', {
                details: error.message
            });
        }
        if (!result.acknowledged) {
            log.error(`Error adding library to MongoDB: Insert failed.`);
            throw new Error('mongo-library-storage:error-adding-metadata');
        }
        return InstalledLibrary.fromMetadata({ ...libraryData, restricted });
    }

    /**
     * Removes all files of a library. Doesn't delete the library metadata. (Used when updating libraries.)
     * @param library the library whose files should be deleted
     */
    public async clearFiles(library: ILibraryName): Promise<void> {
        let result: UpdateResult;
        try {
            result = await this.mongodb.updateOne(
                {
                    _id: LibraryName.toUberName(library)
                },
                {
                    $set: {
                        files: []
                    }
                }
            );
        } catch (error) {
            log.error(
                `There was an error while clearing the files: ${error.message}`
            );
            throw new H5pError('mongo-library-storage:deleting-files-error');
        }
        if (result.matchedCount !== 1) {
            log.error(
                `Clearing files of library ${LibraryName.toUberName(
                    library
                )} failed, as it isn't installed.`
            );
            throw new H5pError(
                'mongo-library-storage:library-not-found',
                {
                    ubername: LibraryName.toUberName(library)
                },
                404
            );
        }
    }

    /**
     * Creates indexes to speed up read access. Can be safely used even if
     * indexes already exist.
     */
    public async createIndexes(): Promise<void> {
        await this.mongodb.createIndexes([
            {
                key: {
                    _id: 1,
                    'files.filename': 1
                }
            },
            {
                key: {
                    'metadata.machineName': 1
                }
            },
            {
                key: {
                    'metadata.addTo': 1
                }
            }
        ]);
    }

    /**
     * Removes the library and all its files from the repository.
     * Throws errors if something went wrong.
     * @param library The library to remove.
     */
    public async deleteLibrary(library: ILibraryName): Promise<void> {
        let result: DeleteResult;
        try {
            result = await this.mongodb.deleteOne({
                _id: LibraryName.toUberName(library)
            });
        } catch (error) {
            throw new H5pError('mongo-library-storage:error-deleting', {
                ubername: LibraryName.toUberName(library),
                message: error.message
            });
        }
        if (result.deletedCount === 0) {
            throw new H5pError(
                'mongo-library-storage:library-not-found',
                { ubername: LibraryName.toUberName(library) },
                404
            );
        }
    }

    /**
     * Check if the library contains a file.
     * @param library The library to check
     * @param filename
     * @returns true if file exists in library, false otherwise
     */
    public async fileExists(
        library: ILibraryName,
        filename: string
    ): Promise<boolean> {
        this.validateFilename(filename);

        try {
            const found = await this.mongodb.findOne(
                {
                    _id: LibraryName.toUberName(library),
                    'files.filename': filename
                },
                { projection: { _id: 1 } }
            );
            return !!found;
        } catch (error) {
            log.error(
                `Error checking if file ${filename} exists in library ${LibraryName.toUberName(
                    library
                )}: ${error.message}`
            );
            throw new H5pError('mongo-library-storage:file-exists-error', {
                ubername: LibraryName.toUberName(library),
                filename
            });
        }
    }

    /**
     * Counts how often libraries are listed in the dependencies of other
     * libraries and returns a list of the number.
     *
     * Note: Implementations should not count circular dependencies that are
     * caused by editorDependencies. Example: H5P.InteractiveVideo has
     * H5PEditor.InteractiveVideo in its editor dependencies.
     * H5PEditor.Interactive video has H5P.InteractiveVideo in its preloaded
     * dependencies. In this case H5P.InteractiveVideo should get a dependency
     * count of 0 and H5PEditor.InteractiveVideo should have 1. That way it is
     * still possible to delete the library from storage.
     *
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
        let libraryDeps: {
            dynamicDependencies: ILibraryName[];
            editorDependencies: ILibraryName[];
            machineName: string;
            majorVersion: number;
            minorVersion: number;
            preloadedDependencies: ILibraryName[];
            ubername: string;
        }[];
        try {
            libraryDeps = await this.mongodb
                .find(
                    {},
                    {
                        projection: {
                            _id: 1,
                            'metadata.machineName': 1,
                            'metadata.majorVersion': 1,
                            'metadata.minorVersion': 1,
                            'metadata.preloadedDependencies': 1,
                            'metadata.editorDependencies': 1,
                            'metadata.dynamicDependencies': 1
                        }
                    }
                )
                .map((d) => ({ ...d.metadata, ubername: d._id }))
                .toArray();
        } catch (error) {
            throw new H5pError(
                'mongo-library-storage:error-getting-dependents'
            );
        }

        // the dependency map allows faster access to libraries by ubername
        const librariesDepsMap: {
            [ubername: string]: {
                dynamicDependencies: ILibraryName[];
                editorDependencies: ILibraryName[];
                preloadedDependencies: ILibraryName[];
            };
        } = libraryDeps.reduce((prev, curr) => {
            prev[curr.ubername] = curr;
            return prev;
        }, {});

        // Remove circular dependencies caused by editor dependencies in
        // content types like H5P.InteractiveVideo.
        for (const lib of libraryDeps) {
            for (const dependency of lib.editorDependencies ?? []) {
                const ubername = LibraryName.toUberName(dependency);
                const index = librariesDepsMap[
                    ubername
                ].preloadedDependencies?.findIndex((ln) =>
                    LibraryName.equal(ln, lib)
                );
                if (index >= 0) {
                    librariesDepsMap[ubername].preloadedDependencies.splice(
                        index,
                        1
                    );
                }
            }
        }

        // Count dependencies
        const dependencies = {};
        for (const lib of libraryDeps) {
            for (const dependency of (lib.preloadedDependencies ?? [])
                .concat(lib.editorDependencies ?? [])
                .concat(lib.dynamicDependencies ?? [])) {
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
        try {
            return await this.mongodb.countDocuments({
                'metadata.preloadedDependencies': library
            });
        } catch (error) {
            throw new H5pError(
                'mongo-library-storage:error-getting-dependents',
                {
                    ubername: LibraryName.toUberName(library),
                    message: error.message
                }
            );
        }
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
        file: string
    ): Promise<IFileStats> {
        this.validateFilename(file);

        // The metadata is not saved as a file
        if (file === 'library.json') {
            const metadata = JSON.stringify(await this.getMetadata(library));
            return { size: metadata.length, birthtime: new Date() };
        }

        let fileStats: any;
        try {
            fileStats = await this.mongodb.findOne(
                {
                    _id: LibraryName.toUberName(library),
                    'files.filename': file
                },
                {
                    projection: {
                        _id: 1,
                        files: {
                            $elemMatch: { filename: file }
                        }
                    }
                }
            );
        } catch (error) {
            log.error(
                `Error when getting stats from MongoDB: ${error.message}`
            );
            throw new H5pError(
                'mongo-library-storage:error-getting-stats',
                { ubername: LibraryName.toUberName(library), filename: file },
                500
            );
        }
        if (!fileStats) {
            throw new H5pError(
                'library-file-missing',
                { ubername: LibraryName.toUberName(library), filename: file },
                404
            );
        }
        return {
            size: fileStats.files[0].size,
            birthtime: new Date(fileStats.files[0].lastModified)
        };
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
        file: string
    ): Promise<Readable> {
        this.validateFilename(file);
        let fileData: any;
        try {
            fileData = await this.mongodb.findOne(
                {
                    _id: LibraryName.toUberName(library),
                    'files.filename': file
                },
                {
                    projection: {
                        _id: 1,
                        files: { $elemMatch: { filename: file } }
                    }
                }
            );
        } catch (error) {
            log.error(
                `Error when getting file data from MongoDB: ${error.message}`
            );
            throw new H5pError(
                'mongo-library-storage:error-getting-file-data',
                { ubername: LibraryName.toUberName(library), filename: file },
                500
            );
        }

        if (!fileData) {
            // The library.json file is in the MongoDB document as binary JSON,
            // so we get it from there
            if (file === 'library.json') {
                const metadata = JSON.stringify(
                    await this.getMetadata(library)
                );
                const readable = new ReadableStreamBuffer();
                readable.put(metadata, 'utf-8');
                readable.stop();
                return readable;
            }
            throw new H5pError(
                'library-file-missing',
                {
                    ubername: LibraryName.toUberName(library),
                    filename: file
                },
                404
            );
        } else {
            const readable = new ReadableStreamBuffer();
            readable.put((fileData.files[0].data as Binary).buffer);
            readable.stop();
            return readable;
        }
    }

    /**
     * Returns all installed libraries or the installed libraries that have the
     * machine name.
     * @param machineName (optional) only return libraries that have this
     * machine name
     * @returns the libraries installed
     */
    public async getInstalledLibraryNames(
        machineName?: string
    ): Promise<ILibraryName[]> {
        try {
            const result = this.mongodb.find(
                machineName
                    ? {
                          'metadata.machineName': machineName
                      }
                    : {},
                {
                    projection: {
                        _id: 1
                    }
                }
            );
            const list = await result.toArray();
            return list
                .map((e) => {
                    try {
                        return LibraryName.fromUberName(e._id as any);
                    } catch {
                        log.error(
                            `invalid ubername pattern in library storage id: ${e._id}. Ignoring...`
                        );
                        return undefined;
                    }
                })
                .filter((e) => e);
        } catch (error) {
            throw new H5pError(
                'mongo-library-storage:error-getting-libraries',
                { details: error.message }
            );
        }
    }

    /**
     * Gets a list of installed language files for the library.
     * @param library The library to get the languages for
     * @returns The list of JSON files in the language folder (without the extension .json)
     */
    public async getLanguages(library: ILibraryName): Promise<string[]> {
        let files: string[] = [];
        let result: any[];
        try {
            result = await this.mongodb
                .aggregate([
                    {
                        $match: {
                            _id: LibraryName.toUberName(library)
                        }
                    },
                    {
                        $project: {
                            files: {
                                $filter: {
                                    input: '$files',
                                    cond: {
                                        $regexMatch: {
                                            input: '$$this.filename',
                                            regex: /^language\//
                                        }
                                    }
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            files: {
                                filename: 1
                            }
                        }
                    }
                ])
                .toArray();
        } catch (error) {
            log.error(
                `There was an error while getting list of files from MongoDB: ${error.message}`
            );
            throw new H5pError('mongo-library-storage:error-getting-languages');
        }

        if (result.length === 0) {
            throw new H5pError(
                'mongo-library-storage:library-not-found',
                { ubername: LibraryName.toUberName(library) },
                404
            );
        } else if (result.length > 1) {
            throw new H5pError(
                'mongo-library-storage:multiple-libraries',
                { ubername: LibraryName.toUberName(library) },
                500
            );
        }
        files = result[0].files.map((f) => f.filename);
        log.debug(`Found ${files.length} file(s) in MongoDB.`);
        return files
            .filter((file) => path.extname(file) === '.json')
            .map((file) => path.basename(file, '.json'));
    }

    /**
     * Gets the information about an installed library
     * @param library the library
     * @returns the metadata and information about the locally installed library
     */
    public async getLibrary(library: ILibraryName): Promise<IInstalledLibrary> {
        if (!library) {
            throw new Error('You must pass in a library name to getLibrary.');
        }
        let result;

        try {
            result = await this.mongodb.findOne(
                { _id: LibraryName.toUberName(library) },
                {
                    projection: {
                        metadata: 1,
                        additionalMetadata: 1
                    }
                }
            );
        } catch (error) {
            throw new H5pError(
                'mongo-library-storage:error-getting-library-metadata',
                { ubername: LibraryName.toUberName(library) }
            );
        }
        if (!result) {
            throw new H5pError(
                'mongo-library-storage:library-not-found',
                { ubername: LibraryName.toUberName(library) },
                404
            );
        }
        if (!result.metadata || !result.additionalMetadata) {
            throw new H5pError(
                'mongo-library-storage:error-getting-library-metadata',
                { ubername: LibraryName.toUberName(library) }
            );
        }
        return InstalledLibrary.fromMetadata({
            ...result.metadata,
            ...result.additionalMetadata
        });
    }

    /**
     * Checks if a library is installed.
     * @param library the library to check
     * @returns true if the library is installed
     */
    public async isInstalled(library: ILibraryName): Promise<boolean> {
        const found = await this.mongodb.findOne(
            { _id: LibraryName.toUberName(library) },
            { projection: { _id: 1 } }
        );
        return !!found;
    }

    /**
     * Returns a list of library addons that are installed in the system.
     * Addons are libraries that have the property 'addTo' in their metadata.
     * ILibraryStorage implementation CAN but NEED NOT implement the method.
     * If it is not implemented, addons won't be available in the system.
     */
    public async listAddons(): Promise<ILibraryMetadata[]> {
        try {
            return (
                await this.mongodb
                    .find(
                        {
                            'metadata.addTo': { $exists: true }
                        },
                        {
                            projection: {
                                metadata: 1
                            }
                        }
                    )
                    .toArray()
            ).map((m) => m.metadata);
        } catch (error) {
            throw new H5pError('mongo-library-storage:error-getting-addons', {
                message: error.message
            });
        }
    }

    /**
     * Gets a list of all library files that exist for this library.
     * @param library
     * @returns all files that exist for the library
     */
    public async listFiles(library: ILibraryName): Promise<string[]> {
        let files: string[] = [];
        let result: any;
        try {
            result = await this.mongodb.findOne(
                {
                    _id: LibraryName.toUberName(library)
                },
                {
                    projection: {
                        _id: 1,
                        files: {
                            filename: 1
                        }
                    }
                }
            );
        } catch (error) {
            log.error(
                `Error listing all files of library ${LibraryName.toUberName(
                    library
                )}: ${error.message}`
            );
            throw new H5pError(
                'mongo-library-storage:error-listing-files',
                { ubername: LibraryName.toUberName(library) },
                500
            );
        }

        if (!result) {
            throw new H5pError(
                'mongo-library-storage:library-not-found',
                { ubername: LibraryName.toUberName(library) },
                404
            );
        }

        files = result.files.map((f) => f.filename).concat(['library.json']);
        log.debug(`Found ${files.length} file(s) in MongoDB.`);
        return files;
    }

    /**
     * Updates the additional metadata properties that is added to the
     * stored libraries. This metadata can be used to customize behavior like
     * restricting libraries to specific users.
     *
     * Implementations should avoid updating the metadata if the additional
     * metadata if nothing has changed.
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
        if (!library) {
            throw new Error(
                'You must specify a library name when calling updateAdditionalMetadata.'
            );
        }
        let result: UpdateResult;
        try {
            result = await this.mongodb.updateOne(
                { _id: LibraryName.toUberName(library) },
                { $set: { additionalMetadata } }
            );
        } catch (error) {
            throw new H5pError(
                'mongo-library-storage:update-additional-metadata-error',
                {
                    ubername: LibraryName.toUberName(library),
                    message: error.message
                }
            );
        }

        if (result.matchedCount !== 1) {
            throw new H5pError(
                'mongo-library-storage:library-not-found',
                { ubername: LibraryName.toUberName(library) },
                404
            );
        }
        return result.modifiedCount === 1;
    }

    /**
     * Updates the library metadata. This is necessary when updating to a new
     * patch version. After this clearFiles(...) is called by the LibraryManager
     * to remove all old files. The next step is to add the patched files with
     * addFile(...).
     * @param libraryMetadata the new library metadata
     * @returns The updated library object
     */
    public async updateLibrary(
        libraryMetadata: ILibraryMetadata
    ): Promise<IInstalledLibrary> {
        const ubername = LibraryName.toUberName(libraryMetadata);
        let result: UpdateResult;
        try {
            result = await this.mongodb.updateOne(
                { _id: ubername },
                { $set: { metadata: libraryMetadata } }
            );
        } catch (error) {
            throw new H5pError('mongo-library-storage:update-error', {
                ubername,
                message: error.message
            });
        }
        if (result.matchedCount === 0) {
            throw new H5pError(
                'mongo-library-storage:library-not-found',
                { ubername },
                404
            );
        }
        if (result.modifiedCount !== 1) {
            log.warn(
                `Library ${ubername} not updated as metadata has remained the same.`
            );
        }
        let additionalMetadata: IAdditionalLibraryMetadata;
        try {
            additionalMetadata = (await this.mongodb.findOne(
                { _id: ubername },
                { projection: { additionalMetadata: 1 } }
            )) as any;
        } catch (error) {
            log.warn(
                `Could not get additional metadata for library ${ubername}`
            );
        }
        return InstalledLibrary.fromMetadata({
            ...libraryMetadata,
            ...(additionalMetadata ?? {})
        });
    }

    /**
     * Gets the the metadata of a library. In contrast to getLibrary this is
     * only the metadata.
     * @param library the library
     * @returns the metadata about the locally installed library
     */
    private async getMetadata(
        library: ILibraryName
    ): Promise<ILibraryMetadata> {
        if (!library) {
            throw new Error('You must pass in a library name to getLibrary.');
        }
        let result;

        try {
            result = await this.mongodb.findOne(
                { _id: LibraryName.toUberName(library) },
                {
                    projection: {
                        metadata: 1
                    }
                }
            );
        } catch (error) {
            console.log(error);
            throw new H5pError(
                'mongo-library-storage:error-getting-library-metadata',
                { ubername: LibraryName.toUberName(library) }
            );
        }
        if (!result) {
            throw new H5pError(
                'mongo-library-storage:library-not-found',
                { ubername: LibraryName.toUberName(library) },
                404
            );
        }
        if (!result.metadata) {
            throw new H5pError(
                'mongo-library-storage:error-getting-library-metadata',
                { ubername: LibraryName.toUberName(library) }
            );
        }
        return result.metadata;
    }

    private async readableToBuffer(readable: Readable): Promise<Buffer> {
        return new Promise((resolve) => {
            const chunks = [];

            readable.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
            readable.on('end', () => resolve(Buffer.concat(chunks)));
        });
    }

    private validateFilename(filename: string): void {}
}
