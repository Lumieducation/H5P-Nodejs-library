/* eslint-disable no-underscore-dangle */

import MongoDB from 'mongodb';
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

import { validateFilename } from './Utils';

const log = new Logger('MongoGridFSLibraryStorage');

export default class MongoGridFSLibraryStorage implements ILibraryStorage {
    /**
     * @param bucket the MongoDB GridFS Bucket content storage; Must be either set to a bucket or the
     * bucket must be specified in the options!
     * @param mongodb a MongoDB collection (read- and writable)
     * @param options options
     */
    constructor(
        private bucket: MongoDB.GridFSBucket,
        private mongodb: MongoDB.Collection,
        private options: {
            /**
             * These characters will be removed from files that are saved to GridFS.
             * There is a very strict default list that basically only leaves
             * alphanumeric filenames intact. Should you need more relaxed
             * settings you can specify them here.
             */
            invalidCharactersRegexp?: RegExp;
            /**
             * Indicates how long keys in GridFS can be.
             */
            maxKeyLength?: number;
        }
    ) {
        log.info('initialize');
        this.maxKeyLength =
            options?.maxKeyLength !== undefined
                ? options.maxKeyLength - 22
                : 1002;
        // By default we shorten to 1002 as GridFS supports a maximum of 1024
        // characters and we need to account for contentIds (12), unique ids
        // appended to the name (8) and separators (2).
    }

    /**
     * Indicates how long keys can be.
     */
    private maxKeyLength: number;

    /**
     * Adds a library file to a library. The library metadata must have been installed with addLibrary(...) first.
     * Throws an error if something unexpected happens. In this case the method calling addFile(...) will clean
     * up the partly installed library.
     * @param library The library that is being installed
     * @param filename Filename of the file to add, relative to the library root
     * @param stream The stream containing the file content
     * @returns true if successful
     */
    public async addFile(
        library: ILibraryName,
        filename: string,
        readStream: Readable
    ): Promise<boolean> {
        validateFilename(filename, this.options?.invalidCharactersRegexp);

        log.debug(`Adding file with key ${this.getKey(library, filename)}`);

        return new Promise((y, n) => {
            readStream
                .pipe(
                    this.bucket.openUploadStream(this.getKey(library, filename))
                )
                .on('finish', () => {
                    y(true);
                })
                .on('error', (error) => {
                    log.error(
                        `Error while uploading file "${filename}" to GridFS storage: ${error.message}`
                    );
                    throw new H5pError(
                        `mongo-gridfs-library-storage:gridfs-upload-error`,
                        { ubername: LibraryName.toUberName(library), filename },
                        500
                    );
                });
        });
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
        let result: MongoDB.InsertOneWriteOpResult<any>;
        try {
            result = await this.mongodb.insertOne({
                _id: ubername,
                metadata: libraryData,
                additionalMetadata: { restricted }
            });
        } catch (error) {
            throw new H5pError(
                'mongo-gridfs-library-storage:error-adding-metadata',
                { details: error.message }
            );
        }
        if (!result.result.ok) {
            throw new Error(
                'mongo-gridfs-library-storage:error-adding-metadata'
            );
        }
        return InstalledLibrary.fromMetadata({ ...libraryData, restricted });
    }

    /**
     * Removes all files of a library. Doesn't delete the library metadata. (Used when updating libraries.)
     * @param library the library whose files should be deleted
     */
    public async clearFiles(library: ILibraryName): Promise<void> {
        if (!(await this.isInstalled(library))) {
            throw new H5pError(
                'mongo-gridfs-library-storage:clear-library-not-found',
                {
                    ubername: LibraryName.toUberName(library)
                }
            );
        }
        const filesToDelete = await this.listFiles(library);
        try {
            log.debug(`Batch deleting file(s) in GridFS storage.`);
            const idsToDelete = await this.bucket
                .find({
                    filename: {
                        $in: filesToDelete.map((f) => this.getKey(library, f))
                    }
                })
                .project({ _id: 1 })
                .toArray();

            Promise.all(idsToDelete.map((o) => this.bucket.delete(o._id)));
        } catch (error) {
            log.error(
                `There was an error while clearing the files: ${error.message}`
            );
            throw new H5pError(
                'mongo-gridfs-library-storage:deleting-files-error'
            );
        }
    }

    /**
     * Creates indexes to speed up read access. Can be safely used even if
     * indexes already exist.
     */
    public async createIndexes(): Promise<void> {
        this.mongodb.createIndexes([
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
        if (!(await this.isInstalled(library))) {
            throw new H5pError(
                'mongo-gridfs-library-storage:library-not-found'
            );
        }
        await this.clearFiles(library);

        let result: MongoDB.DeleteWriteOpResultObject;
        try {
            result = await this.mongodb.deleteOne({
                _id: LibraryName.toUberName(library)
            });
        } catch (error) {
            throw new H5pError('mongo-gridfs-library-storage:error-deleting', {
                ubername: LibraryName.toUberName(library),
                message: error.message
            });
        }
        if (result.deletedCount === 0) {
            throw new H5pError(
                'mongo-gridfs-library-storage:library-not-found',
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
        validateFilename(filename, this.options?.invalidCharactersRegexp);

        try {
            const result = await this.bucket
                .find({
                    filename: this.getKey(library, filename)
                })
                .toArray();

            if (result.length > 0) {
                log.debug(
                    `File ${filename} does exist in ${LibraryName.toUberName(
                        library
                    )}.`
                );
            }

            return result.length > 0;
        } catch (error) {
            log.debug(
                `File ${filename} does not exist in ${LibraryName.toUberName(
                    library
                )}.`
            );
            return false;
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
                'mongo-gridfs-library-storage:error-getting-dependents'
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
    public getDependentsCount(library: ILibraryName): Promise<number> {
        try {
            return this.mongodb.countDocuments({
                'metadata.preloadedDependencies': library
            });
        } catch (error) {
            throw new H5pError(
                'mongo-gridfs-library-storage:error-getting-dependents',
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
        validateFilename(file, this.options?.invalidCharactersRegexp);

        try {
            const info = await this.bucket
                .find({
                    filename: this.getKey(library, file)
                })
                .toArray();
            return { size: info[0].length, birthtime: info[0].uploadDate };
        } catch (error) {
            throw new H5pError(
                'content-file-missing',
                { ubername: LibraryName.toUberName(library), filename: file },
                404
            );
        }
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
        validateFilename(file, this.options?.invalidCharactersRegexp);

        return this.bucket.openDownloadStreamByName(this.getKey(library, file));
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
                        return LibraryName.fromUberName(e._id);
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
                'mongo-gridfs-library-storage:error-getting-libraries',
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
        const prefix = this.getKey(library, 'language');
        let files: string[] = [];
        try {
            log.debug(
                `Requesting list from GridFS storage with prefix ${prefix}`
            );

            const ret = await this.bucket.find({});

            files = files.concat(
                (await ret.toArray())
                    .filter((c) => c.filename.indexOf(prefix) > -1)
                    .map((c) => c.filename.substr(prefix.length))
            );
        } catch (error) {
            log.debug(
                `There was an error while getting list of files from GridGS. This might not be a problem if no languages were added to the library.`
            );
            log.error(error);
            return [];
        }
        log.debug(`Found ${files.length} file(s) in GridFS.`);

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
                { projection: { metadata: 1, additionalMetadata: 1 } }
            );
        } catch (error) {
            throw new H5pError(
                'mongo-gridfs-library-storage:error-getting-library-metadata',
                { ubername: LibraryName.toUberName(library) }
            );
        }
        if (!result || !result.metadata || !result.additionalMetadata) {
            throw new H5pError(
                'mongo-gridfs-library-storage:error-getting-library-metadata',
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
            throw new H5pError(
                'mongo-gridfs-library-storage:error-getting-addons',
                { message: error.message }
            );
        }
    }

    /**
     * Gets a list of all library files that exist for this library.
     * @param library
     * @returns all files that exist for the library
     */
    public async listFiles(library: ILibraryName): Promise<string[]> {
        const prefix = this.getKey(library, '');
        let files: string[] = [];
        try {
            log.debug(`Requesting list from GridFS storage.`);
            const ret = await this.bucket
                .find({
                    filename: {
                        $regex: new RegExp(`^${prefix}`)
                    }
                })
                .toArray();
            files = ret.map((f) => f.filename.replace(prefix, ''));
        } catch (error) {
            log.debug(
                `There was an error while getting list of files from GridFS. This might not be a problem if no languages were added to the library.`
            );
            return [];
        }
        log.debug(`Found ${files.length} file(s) in GridFS.`);
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
        let result: MongoDB.UpdateWriteOpResult;
        try {
            result = await this.mongodb.updateOne(
                { _id: LibraryName.toUberName(library) },
                { $set: { additionalMetadata } }
            );
        } catch (error) {
            throw new H5pError(
                'mongo-gridfs-library-storage:update-additional-metadata-error',
                {
                    ubername: LibraryName.toUberName(library),
                    message: error.message
                }
            );
        }

        if (result.matchedCount !== 1) {
            throw new H5pError(
                'mongo-gridfs-library-storage:library-not-found',
                { ubername: LibraryName.toUberName(library) },
                404
            );
        }
        return result.modifiedCount === 1;
    }

    /**
     * Updates the library metadata. This is necessary when updating to a new patch version.
     * After this clearFiles(...) is called by the LibraryManager to remove all old files.
     * The next step is to add the patched files with addFile(...).
     * @param libraryMetadata the new library metadata
     * @returns The updated library object
     */
    public async updateLibrary(
        libraryMetadata: ILibraryMetadata
    ): Promise<IInstalledLibrary> {
        const ubername = LibraryName.toUberName(libraryMetadata);
        let result: MongoDB.UpdateWriteOpResult;
        try {
            result = await this.mongodb.updateOne(
                { _id: ubername },
                { $set: { metadata: libraryMetadata } }
            );
        } catch (error) {
            throw new H5pError('mongo-gridfs-library-storage:update-error', {
                ubername,
                message: error.message
            });
        }
        if (result.matchedCount === 0) {
            throw new H5pError(
                'mongo-gridfs-library-storage:library-not-found',
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
            additionalMetadata = await this.mongodb.findOne(
                { _id: ubername },
                { projection: { additionalMetadata: 1 } }
            );
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

    private getKey(library: ILibraryName, filename: string): string {
        return `${LibraryName.toUberName(library)}/${filename}`;
    }
}
