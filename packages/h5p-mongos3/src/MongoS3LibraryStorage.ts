/* eslint-disable no-underscore-dangle */

import MongoDB, { DeleteResult, InsertOneResult, UpdateResult } from 'mongodb';
import AWS from 'aws-sdk';
import { Readable } from 'stream';
import * as path from 'path';
import { PromiseResult } from 'aws-sdk/lib/request';
import { ReadableStreamBuffer } from 'stream-buffers';
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

import { validateFilename } from './S3Utils';

const log = new Logger('MongoS3LibraryStorage');

export default class MongoS3LibraryStorage implements ILibraryStorage {
    /**
     * @param s3 the S3 content storage; Must be either set to a bucket or the
     * bucket must be specified in the options!
     * @param mongodb a MongoDB collection (read- and writable)
     * @param options options
     */
    constructor(
        private s3: AWS.S3,
        private mongodb: MongoDB.Collection,
        private options: {
            /**
             * These characters will be removed from files that are saved to S3.
             * There is a very strict default list that basically only leaves
             * alphanumeric filenames intact. Should you need more relaxed
             * settings you can specify them here.
             */
            invalidCharactersRegexp?: RegExp;
            /**
             * Indicates how long keys in S3 can be. Defaults to 1024. (S3
             * supports 1024 characters, other systems such as Minio might only
             * support 255 on Windows).
             */
            maxKeyLength?: number;
            /**
             * The ACL to use for uploaded content files. Defaults to private.
             */
            s3Acl?: string;
            /**
             * The bucket to upload to and download from. (required)
             */
            s3Bucket: string;
        }
    ) {
        log.info('initialize');
        this.maxKeyLength =
            options?.maxKeyLength !== undefined
                ? options.maxKeyLength - 22
                : 1002;
        // By default we shorten to 1002 as S3 supports a maximum of 1024
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

        try {
            await this.s3
                .upload({
                    ACL: this.options.s3Acl ?? 'private',
                    Body: readStream,
                    Bucket: this.options.s3Bucket,
                    Key: this.getS3Key(library, filename)
                })
                .promise();
        } catch (error) {
            log.error(
                `Error while uploading file "${filename}" to S3 storage: ${error.message}`
            );
            throw new H5pError(
                `mongo-s3-library-storage:s3-upload-error`,
                { ubername: LibraryName.toUberName(library), filename },
                500
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
                additionalMetadata: { restricted }
            });
        } catch (error) {
            throw new H5pError(
                'mongo-s3-library-storage:error-adding-metadata',
                { details: error.message }
            );
        }
        if (!result.acknowledged) {
            throw new Error('mongo-s3-library-storage:error-adding-metadata');
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
                'mongo-s3-library-storage:clear-library-not-found',
                {
                    ubername: LibraryName.toUberName(library)
                }
            );
        }
        const filesToDelete = await this.listFiles(library, {
            withMetadata: false
        });
        // S3 batch deletes only work with 1000 files at a time, so we
        // might have to do this in several requests.
        try {
            while (filesToDelete.length > 0) {
                const next1000Files = filesToDelete.splice(0, 1000);
                if (next1000Files.length > 0) {
                    log.debug(
                        `Batch deleting ${next1000Files.length} file(s) in S3 storage.`
                    );
                    const deleteFilesRes = await this.s3
                        .deleteObjects({
                            Bucket: this.options.s3Bucket,
                            Delete: {
                                Objects: next1000Files.map((f) => ({
                                    Key: this.getS3Key(library, f)
                                }))
                            }
                        })
                        .promise();
                    if (deleteFilesRes.Errors.length > 0) {
                        log.error(
                            `There were errors while deleting files in S3 storage. The delete operation will continue.\nErrors:${deleteFilesRes.Errors.map(
                                (e) => `${e.Key}: ${e.Code} - ${e.Message}`
                            ).join('\n')}`
                        );
                    }
                }
            }
        } catch (error) {
            log.error(
                `There was an error while clearing the files: ${error.message}`
            );
            throw new H5pError('mongo-s3-library-storage:deleting-files-error');
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
            throw new H5pError('mongo-s3-library-storage:library-not-found');
        }
        await this.clearFiles(library);

        let result: DeleteResult;
        try {
            result = await this.mongodb.deleteOne({
                _id: LibraryName.toUberName(library)
            });
        } catch (error) {
            throw new H5pError('mongo-s3-library-storage:error-deleting', {
                ubername: LibraryName.toUberName(library),
                message: error.message
            });
        }
        if (result.deletedCount === 0) {
            throw new H5pError(
                'mongo-s3-library-storage:library-not-found',
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
            await this.s3
                .headObject({
                    Bucket: this.options.s3Bucket,
                    Key: this.getS3Key(library, filename)
                })
                .promise();
        } catch (error) {
            log.debug(
                `File ${filename} does not exist in ${LibraryName.toUberName(
                    library
                )}.`
            );
            return false;
        }
        log.debug(
            `File ${filename} does exist in ${LibraryName.toUberName(library)}.`
        );
        return true;
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
                'mongo-s3-library-storage:error-getting-dependents'
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
                'mongo-s3-library-storage:error-getting-dependents',
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

        // As the metadata is not S3, we need to get it from MongoDB.
        if (file === 'library.json') {
            const metadata = JSON.stringify(await this.getMetadata(library));
            return { size: metadata.length, birthtime: new Date() };
        }

        try {
            const head = await this.s3
                .headObject({
                    Bucket: this.options.s3Bucket,
                    Key: this.getS3Key(library, file)
                })
                .promise();
            return { size: head.ContentLength, birthtime: head.LastModified };
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

        // As the metadata is not S3, we need to get it from MongoDB.
        if (file === 'library.json') {
            const metadata = JSON.stringify(await this.getMetadata(library));
            const readable = new ReadableStreamBuffer();
            readable.put(metadata, 'utf-8');
            readable.stop();
            return readable;
        }

        return this.s3
            .getObject({
                Bucket: this.options.s3Bucket,
                Key: this.getS3Key(library, file)
            })
            .createReadStream();
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
                'mongo-s3-library-storage:error-getting-libraries',
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
        const prefix = this.getS3Key(library, 'language');
        let files: string[] = [];
        try {
            let ret: PromiseResult<AWS.S3.ListObjectsV2Output, AWS.AWSError>;
            do {
                log.debug(`Requesting list from S3 storage.`);
                ret = await this.s3
                    .listObjectsV2({
                        Bucket: this.options.s3Bucket,
                        Prefix: prefix,
                        ContinuationToken: ret?.NextContinuationToken,
                        MaxKeys: 1000
                    })
                    .promise();
                files = files.concat(
                    ret.Contents.map((c) => c.Key.substr(prefix.length))
                );
            } while (ret.IsTruncated && ret.NextContinuationToken);
        } catch (error) {
            log.debug(
                `There was an error while getting list of files from S3. This might not be a problem if no languages were added to the library.`
            );
            return [];
        }
        log.debug(`Found ${files.length} file(s) in S3.`);
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
                'mongo-s3-library-storage:error-getting-library-metadata',
                { ubername: LibraryName.toUberName(library) }
            );
        }
        if (!result || !result.metadata || !result.additionalMetadata) {
            throw new H5pError(
                'mongo-s3-library-storage:error-getting-library-metadata',
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
                'mongo-s3-library-storage:error-getting-addons',
                { message: error.message }
            );
        }
    }

    /**
     * Gets a list of all library files that exist for this library.
     * @param library the library name
     * @param withMetadata true if the 'library.json' file should be included in
     * the list
     * @returns all files that exist for the library
     */
    public async listFiles(
        library: ILibraryName,
        options: { withMetadata?: boolean } = { withMetadata: true }
    ): Promise<string[]> {
        const prefix = this.getS3Key(library, '');
        let files: string[] = [];
        try {
            let ret: PromiseResult<AWS.S3.ListObjectsV2Output, AWS.AWSError>;
            do {
                log.debug(`Requesting list from S3 storage.`);
                ret = await this.s3
                    .listObjectsV2({
                        Bucket: this.options.s3Bucket,
                        Prefix: prefix,
                        ContinuationToken: ret?.NextContinuationToken,
                        MaxKeys: 1000
                    })
                    .promise();
                files = files.concat(
                    ret.Contents.map((c) => c.Key.substr(prefix.length))
                );
            } while (ret.IsTruncated && ret.NextContinuationToken);
        } catch (error) {
            log.debug(
                `There was an error while getting list of files from S3. This might not be a problem if no languages were added to the library.`
            );
            return [];
        }
        log.debug(`Found ${files.length} file(s) in S3.`);
        return options?.withMetadata ? files.concat('library.json') : files;
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
                'mongo-s3-library-storage:update-additional-metadata-error',
                {
                    ubername: LibraryName.toUberName(library),
                    message: error.message
                }
            );
        }

        if (result.matchedCount !== 1) {
            throw new H5pError(
                'mongo-s3-library-storage:library-not-found',
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
        let result: UpdateResult;
        try {
            result = await this.mongodb.updateOne(
                { _id: ubername },
                { $set: { metadata: libraryMetadata } }
            );
        } catch (error) {
            throw new H5pError('mongo-s3-library-storage:update-error', {
                ubername,
                message: error.message
            });
        }
        if (result.matchedCount === 0) {
            throw new H5pError(
                'mongo-s3-library-storage:library-not-found',
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
            additionalMetadata =
                await this.mongodb.findOne<IAdditionalLibraryMetadata>(
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

    private getS3Key(library: ILibraryName, filename: string): string {
        return `${LibraryName.toUberName(library)}/${filename}`;
    }
}
