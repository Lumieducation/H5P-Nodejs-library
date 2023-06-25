import { Cache, caching } from 'cache-manager';
import redisStore from 'cache-manager-redis-store';

import * as H5P from '@lumieducation/h5p-server';
import * as dbImplementations from '@lumieducation/h5p-mongos3';
import { IContentMetadata, IUser } from '@lumieducation/h5p-server';

/**
 * Create a H5PEditor object.
 * Which storage classes are used depends on the configuration values set in
 * the environment variables. If you set no environment variables, the local
 * filesystem storage classes will be used.
 *
 * CONTENTSTORAGE=mongos3 Uses MongoDB/S3 backend for content storage
 * CONTENT_MONGO_COLLECTION Specifies the collection name for content storage
 * CONTENT_AWS_S3_BUCKET Specifies the bucket name for content storage
 * TEMPORARYSTORAGE=s3 Uses S3 backend for temporary file storage
 * TEMPORARY_AWS_S3_BUCKET Specifies the bucket name for temporary file storage
 *
 * Further environment variables to set up MongoDB and S3 can be found in
 * docs/mongo-s3-content-storage.md and docs/s3-temporary-file-storage.md!
 * @param config the configuration object
 * @param localLibraryPath a path in the local filesystem in which the H5P libraries (content types) are stored
 * @param localContentPath a path in the local filesystem in which H5P content will be stored (only necessary if you want to use the local filesystem content storage class)
 * @param localTemporaryPath a path in the local filesystem in which temporary files will be stored (only necessary if you want to use the local filesystem temporary file storage class).
 * @param translationCallback a function that is called to retrieve translations of keys in a certain language; the keys use the i18next format (e.g. namespace:key).
 * @returns a H5PEditor object
 */
export default async function createH5PEditor(
    config: H5P.IH5PConfig,
    urlGenerator: H5P.IUrlGenerator,
    permissionSystem: H5P.IPermissionSystem,
    localLibraryPath: string,
    localContentPath?: string,
    localTemporaryPath?: string,
    localContentUserDataPath?: string,
    translationCallback?: H5P.ITranslationFunction,
    hooks?: {
        contentWasDeleted?: (contentId: string, user: IUser) => Promise<void>;
        contentWasUpdated?: (
            contentId: string,
            metadata: IContentMetadata,
            parameters: any,
            user: IUser
        ) => Promise<void>;
        contentWasCreated?: (
            contentId: string,
            metadata: IContentMetadata,
            parameters: any,
            user: IUser
        ) => Promise<void>;
    }
): Promise<H5P.H5PEditor> {
    let cache: Cache;
    if (process.env.CACHE === 'in-memory') {
        cache = caching({
            store: 'memory',
            ttl: 60 * 60 * 24,
            max: 2 ** 10
        });
    } else if (process.env.CACHE === 'redis') {
        cache = caching({
            store: redisStore,
            host: process.env.REDIS_HOST,
            port: process.env.REDIS_PORT,
            auth_pass: process.env.REDIS_AUTH_PASS,
            db: process.env.REDIS_DB,
            ttl: 60 * 60 * 24
        });
    } else {
        // using no cache
    }
    const contentUserDataStorage =
        new H5P.fsImplementations.FileContentUserDataStorage(
            localContentUserDataPath
        );
    // Depending on the environment variables we use different implementations
    // of the storage interfaces.
    const h5pEditor = new H5P.H5PEditor(
        new H5P.cacheImplementations.CachedKeyValueStorage('kvcache', cache), // this is a general-purpose cache
        config,
        process.env.CACHE
            ? new H5P.cacheImplementations.CachedLibraryStorage(
                  new H5P.fsImplementations.FileLibraryStorage(
                      localLibraryPath
                  ),
                  cache
              )
            : new H5P.fsImplementations.FileLibraryStorage(localLibraryPath),
        process.env.CONTENTSTORAGE !== 'mongos3'
            ? new H5P.fsImplementations.FileContentStorage(localContentPath)
            : new dbImplementations.MongoS3ContentStorage(
                  dbImplementations.initS3({
                      s3ForcePathStyle: true,
                      signatureVersion: 'v4'
                  }),
                  (await dbImplementations.initMongo()).collection(
                      process.env.CONTENT_MONGO_COLLECTION
                  ),
                  {
                      s3Bucket: process.env.CONTENT_AWS_S3_BUCKET,
                      maxKeyLength: process.env.AWS_S3_MAX_FILE_LENGTH
                          ? Number.parseInt(
                                process.env.AWS_S3_MAX_FILE_LENGTH,
                                10
                            )
                          : undefined
                  }
              ),
        process.env.TEMPORARYSTORAGE === 's3'
            ? new dbImplementations.S3TemporaryFileStorage(
                  dbImplementations.initS3({
                      s3ForcePathStyle: true,
                      signatureVersion: 'v4'
                  }),
                  {
                      s3Bucket: process.env.TEMPORARY_AWS_S3_BUCKET,
                      maxKeyLength: process.env.AWS_S3_MAX_FILE_LENGTH
                          ? Number.parseInt(
                                process.env.AWS_S3_MAX_FILE_LENGTH,
                                10
                            )
                          : undefined
                  }
              )
            : new H5P.fsImplementations.DirectoryTemporaryFileStorage(
                  localTemporaryPath
              ),
        translationCallback,
        urlGenerator,
        {
            enableHubLocalization: true,
            enableLibraryNameLocalization: true,
            hooks,
            permissionSystem
        },
        contentUserDataStorage
    );

    // Set bucket lifecycle configuration for S3 temporary storage to make
    // sure temporary files expire.
    if (
        h5pEditor.temporaryStorage instanceof
        dbImplementations.S3TemporaryFileStorage
    ) {
        await (
            h5pEditor.temporaryStorage as any
        ).setBucketLifecycleConfiguration(h5pEditor.config);
    }

    return h5pEditor;
}
