import fs from 'fs/promises';
import path from 'path';
import { MongoClient } from 'mongodb';
import { S3 } from '@aws-sdk/client-s3';
import { createClient } from 'redis';

import { getStorageMode } from './storageEnv';

/**
 * Wipes library and content storage so a test run starts from a known-empty
 * server. Implemented behind an interface so session 7 (storage permutation
 * matrix) can add a Mongo/S3 implementation that drops the configured
 * collections and empties the configured buckets instead of touching the
 * filesystem, without changing any call site.
 */
export interface IStateResetter {
    reset(): Promise<void>;
}

/**
 * Deletes the directories `packages/h5p-examples/h5p/{libraries,content,
 * temporary-storage,user-data}`. `h5p/core` and `h5p/editor` (the downloaded
 * H5P core/editor JavaScript, populated by `npm run download:h5p`) are left
 * alone - they are not test state, and redownloading them is expensive.
 */
export class FsStateResetter implements IStateResetter {
    private readonly h5pExamplesDir = path.join(
        __dirname,
        '../../../h5p-examples'
    );

    private readonly directoriesToWipe = [
        'libraries',
        'content',
        'temporary-storage',
        'user-data'
    ];

    public async reset(): Promise<void> {
        await Promise.all(
            this.directoriesToWipe.map(async (dir) => {
                const fullPath = path.join(this.h5pExamplesDir, 'h5p', dir);
                await fs.rm(fullPath, { recursive: true, force: true });
                await fs.mkdir(fullPath, { recursive: true });
            })
        );
    }
}

/**
 * Drops the configured Mongo collections and empties the configured S3
 * buckets for the `mongo-s3-redis` / `mongo-only` storage permutations
 * (session 7). Reads its configuration from the same environment variables
 * `packages/h5p-examples/src/createH5PEditor.ts` uses to pick storage
 * implementations (`CONTENTSTORAGE`, `LIBRARYSTORAGE`, `TEMPORARYSTORAGE`,
 * `USERDATASTORAGE`, the `*_MONGO_COLLECTION` / `*_AWS_S3_BUCKET` names,
 * and the Mongo/S3 connection details) - `test/fixtures/storageEnv.ts` is
 * the single source of truth for what those are set to for this suite, and
 * both this resetter and the example server process see the exact same
 * values because `playwright.config.ts` passes them through
 * `webServer.env`.
 *
 * Buckets are emptied rather than deleted (existing objects removed, the
 * bucket itself left in place - and created first if it doesn't exist yet),
 * since `scripts/mongo-s3-docker-compose.yml` (used by `npm run start:dbs`
 * for the `mongo-only` permutation) does not pre-create any buckets, unlike
 * `scripts/mongo-s3-redis-docker-compose.yml`'s `minio_init` service.
 * Collections are emptied with `deleteMany({})` rather than dropped, so
 * indexes created once by `createH5PEditor.ts` (e.g.
 * `MongoLibraryStorage.createIndexes()`) don't need to be recreated.
 *
 * Also flushes the Redis logical DBs used for library-storage caching and
 * locking when `CACHE=redis` / `LOCK=redis` (the `mongo-s3-redis`
 * permutation only). This isn't optional the way it might look: the
 * example server process stays up for the whole `npm run
 * test:e2e:mongo-s3-redis` run, not restarted between spec files, so a
 * direct Mongo wipe alone leaves its cache serving stale, already-deleted
 * library data. Redis is external to that process, so it can be flushed
 * directly - unlike the `mongo-only` permutation's in-memory cache, which
 * cannot be reached from outside the process at all (see
 * `storageEnv.ts`'s `MONGO_ONLY_ENV` for why that permutation drops the
 * cache entirely instead).
 */
export class MongoS3StateResetter implements IStateResetter {
    public async reset(): Promise<void> {
        await Promise.all([
            this.resetMongo(),
            this.resetS3(),
            this.resetRedis()
        ]);
    }

    private async resetMongo(): Promise<void> {
        const auth = process.env.MONGODB_USER
            ? {
                  username: process.env.MONGODB_USER,
                  password: process.env.MONGODB_PASSWORD
              }
            : undefined;
        const client = await MongoClient.connect(process.env.MONGODB_URL, {
            auth,
            ignoreUndefined: true
        });
        try {
            const db = client.db(process.env.MONGODB_DB);
            const collectionNames: string[] = [];

            if (
                process.env.CONTENTSTORAGE === 'mongos3' &&
                process.env.CONTENT_MONGO_COLLECTION
            ) {
                collectionNames.push(process.env.CONTENT_MONGO_COLLECTION);
            }
            if (
                (process.env.LIBRARYSTORAGE === 'mongo' ||
                    process.env.LIBRARYSTORAGE === 'mongos3') &&
                process.env.LIBRARY_MONGO_COLLECTION
            ) {
                collectionNames.push(process.env.LIBRARY_MONGO_COLLECTION);
            }
            if (process.env.USERDATASTORAGE === 'mongo') {
                if (process.env.USERDATA_MONGO_COLLECTION) {
                    collectionNames.push(process.env.USERDATA_MONGO_COLLECTION);
                }
                if (process.env.FINISHED_MONGO_COLLECTION) {
                    collectionNames.push(process.env.FINISHED_MONGO_COLLECTION);
                }
            }

            await Promise.all(
                collectionNames.map((name) =>
                    db.collection(name).deleteMany({})
                )
            );
        } finally {
            await client.close();
        }
    }

    private async resetRedis(): Promise<void> {
        const targets: { host: string; port: string; database: string }[] = [];
        if (process.env.CACHE === 'redis' && process.env.REDIS_DB) {
            targets.push({
                host: process.env.REDIS_HOST,
                port: process.env.REDIS_PORT,
                database: process.env.REDIS_DB
            });
        }
        if (process.env.LOCK === 'redis' && process.env.LOCK_REDIS_DB) {
            // Mirrors createH5PEditor.ts: the lock client has its own
            // host/port settings, independent of the cache's REDIS_HOST /
            // REDIS_PORT.
            targets.push({
                host: process.env.LOCK_REDIS_HOST,
                port: process.env.LOCK_REDIS_PORT,
                database: process.env.LOCK_REDIS_DB
            });
        }
        if (targets.length === 0) {
            return;
        }

        await Promise.all(
            targets.map(async ({ host, port, database }) => {
                const client = createClient({
                    socket: {
                        host,
                        port: Number.parseInt(port, 10)
                    },
                    database: Number.parseInt(database, 10)
                });
                await client.connect();
                try {
                    await client.flushDb();
                } finally {
                    await client.quit();
                }
            })
        );
    }

    private async resetS3(): Promise<void> {
        const s3 = new S3({
            forcePathStyle: true,
            region: process.env.AWS_REGION,
            endpoint: process.env.AWS_S3_ENDPOINT,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            }
        });

        const bucketNames = new Set<string>();
        if (
            process.env.CONTENTSTORAGE === 'mongos3' &&
            process.env.CONTENT_AWS_S3_BUCKET
        ) {
            bucketNames.add(process.env.CONTENT_AWS_S3_BUCKET);
        }
        if (
            process.env.TEMPORARYSTORAGE === 's3' &&
            process.env.TEMPORARY_AWS_S3_BUCKET
        ) {
            bucketNames.add(process.env.TEMPORARY_AWS_S3_BUCKET);
        }
        if (
            process.env.LIBRARYSTORAGE === 'mongos3' &&
            process.env.LIBRARY_AWS_S3_BUCKET
        ) {
            bucketNames.add(process.env.LIBRARY_AWS_S3_BUCKET);
        }

        await Promise.all(
            [...bucketNames].map((bucket) => this.emptyBucket(s3, bucket))
        );
    }

    private async emptyBucket(s3: S3, bucket: string): Promise<void> {
        try {
            await s3.createBucket({ Bucket: bucket });
        } catch (error) {
            // The bucket already exists - fine, that's the common case
            // after the first run. Any other error should surface.
            if (
                error?.name !== 'BucketAlreadyOwnedByYou' &&
                error?.name !== 'BucketAlreadyExists'
            ) {
                throw error;
            }
        }

        let continuationToken: string | undefined;
        do {
            const listing = await s3.listObjectsV2({
                Bucket: bucket,
                ContinuationToken: continuationToken
            });
            const objects = listing.Contents ?? [];
            if (objects.length > 0) {
                const result = await s3.deleteObjects({
                    Bucket: bucket,
                    Delete: {
                        Objects: objects.map((object) => ({
                            Key: object.Key
                        }))
                    }
                });
                if (result.Errors?.length) {
                    const failedKeys = result.Errors.map(
                        (error) =>
                            `${error.Key} (${error.Code}: ${error.Message})`
                    ).join(', ');
                    throw new Error(
                        `Failed to delete ${result.Errors.length} object(s) from bucket "${bucket}": ${failedKeys}`
                    );
                }
            }
            continuationToken = listing.IsTruncated
                ? listing.NextContinuationToken
                : undefined;
        } while (continuationToken);
    }
}

/**
 * Selects a state resetter implementation based on `E2E_STORAGE`: the
 * filesystem backend for `fs` (the default), the Mongo/S3 backend for
 * `mongo-s3-redis` and `mongo-only`.
 */
export function getStateResetter(): IStateResetter {
    return getStorageMode() === 'fs'
        ? new FsStateResetter()
        : new MongoS3StateResetter();
}
