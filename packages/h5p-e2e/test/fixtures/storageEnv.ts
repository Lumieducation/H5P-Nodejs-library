/**
 * Storage permutation matrix. `E2E_STORAGE` selects which backend
 * `packages/h5p-examples` starts with; the env-var sets below are
 * transcribed from `packages/h5p-examples/*.env` rather than renaming those
 * files, because dotenv does not override variables already present in the
 * process environment, so exporting these before `npm start` selects a
 * backend without touching any file on disk.
 *
 * One deliberate change from the checked-in `.env` files: every Mongo
 * collection name, the Mongo database name, and every S3 bucket name below
 * gets an `e2e` prefix / its own database, so a run of this suite can never
 * collide with `packages/h5p-mongos3`'s own `test:h5p-mongos3` fixtures.
 * Those use a `h5pintegrationtest` database and randomly-suffixed bucket
 * names per test file (see `packages/h5p-mongos3/test/*.test.ts`), so a
 * collision was already unlikely, but a fixed, obviously-named set here
 * makes the boundary explicit rather than accidental.
 */
export type StorageMode = 'fs' | 'mongo-s3-redis' | 'mongo-only';

export function getStorageMode(): StorageMode {
    const value = process.env.E2E_STORAGE;
    if (value === 'mongo-s3-redis' || value === 'mongo-only') {
        return value;
    }
    return 'fs';
}

/**
 * Env vars shared by both Mongo/S3 permutations: content storage on
 * Mongo/S3, temporary file storage on S3, user data storage on Mongo. Both
 * `mongo+s3+redis.env` and `mongo+mongos3.env` agree on all of this - they
 * only differ in library storage and the cache/lock backend, added by
 * `MONGO_S3_REDIS_ENV` / `MONGO_ONLY_ENV` below.
 */
const SHARED_MONGO_S3_ENV: Record<string, string> = {
    AWS_ACCESS_KEY_ID: 'minioaccesskey',
    AWS_SECRET_ACCESS_KEY: 'miniosecret',
    AWS_REGION: 'us-east-1',
    AWS_S3_ENDPOINT: 'http://localhost:9000',
    AWS_S3_MAX_FILE_LENGTH: '100',

    MONGODB_URL: 'mongodb://localhost:27017',
    MONGODB_DB: 'e2e_h5p',
    MONGODB_USER: 'root',
    MONGODB_PASSWORD: 'h5pnodejs',

    CONTENTSTORAGE: 'mongos3',
    CONTENT_AWS_S3_BUCKET: 'e2e-content-bucket',
    CONTENT_MONGO_COLLECTION: 'e2e_content',

    TEMPORARYSTORAGE: 's3',
    TEMPORARY_AWS_S3_BUCKET: 'e2e-temporary-bucket',

    LIBRARY_AWS_S3_BUCKET: 'e2e-library-bucket',
    LIBRARY_MONGO_COLLECTION: 'e2e_libraries',

    USERDATASTORAGE: 'mongo',
    USERDATA_MONGO_COLLECTION: 'e2e_userdata',
    FINISHED_MONGO_COLLECTION: 'e2e_finisheddata'
};

/**
 * Transcribed from `mongo+s3+redis.env`: library storage on Mongo/S3,
 * cache and lock on Redis. Needs `scripts/mongo-s3-redis-docker-compose.yml`
 * - the plain `npm run start:dbs` compose file
 * (`scripts/mongo-s3-docker-compose.yml`) has no Redis service.
 */
const MONGO_S3_REDIS_ENV: Record<string, string> = {
    ...SHARED_MONGO_S3_ENV,
    LIBRARYSTORAGE: 'mongos3',

    CACHE: 'redis',
    REDIS_HOST: 'localhost',
    REDIS_PORT: '6379',
    // Distinct DB indices from the checked-in .env files' 0/1, purely so a
    // developer who happens to have both a manual `.env`-based run and this
    // suite pointed at the same Redis instance never shares a logical DB.
    REDIS_DB: '8',

    LOCK: 'redis',
    LOCK_REDIS_HOST: 'localhost',
    LOCK_REDIS_PORT: '6379',
    LOCK_REDIS_DB: '9'
};

/**
 * Transcribed from `mongo+mongos3.env`, with one deliberate deviation:
 * `mongo+mongos3.env` sets `CACHE=in-memory`, but this suite resets storage
 * *between* spec files against one long-lived example-server process
 * (`webServer` starts it once per `npm run test:e2e:mongo` run, not once
 * per spec) - an in-memory cache lives inside that process and has no way
 * to be invalidated from outside it, so a direct Mongo wipe between specs
 * would leave the server serving stale cached library lists while the
 * actual collection is already empty. Redis
 * doesn't have this problem (`resetMongoS3RedisEnv`'s resetter flushes it
 * directly, see `reset.ts`), so this is specific to `mongo-only`, and
 * dropping the env var entirely (falling back to `createH5PEditor.ts`'s
 * "no cache" branch) exercises exactly the same `MongoLibraryStorage` code
 * path this permutation exists to test - the in-memory caching layer
 * itself is already covered independently by
 * `packages/h5p-server/test/implementation/cache/CachedLibraryStorage.test.ts`.
 */
const MONGO_ONLY_ENV: Record<string, string> = {
    ...SHARED_MONGO_S3_ENV,
    LIBRARYSTORAGE: 'mongo'
};

/**
 * Resolves the env-var overlay for a storage mode. `fs` returns `undefined`
 * (no overrides - `packages/h5p-examples` defaults to its filesystem
 * implementations when none of these variables are set).
 */
export function getStorageEnv(
    mode: StorageMode = getStorageMode()
): Record<string, string> | undefined {
    switch (mode) {
        case 'mongo-s3-redis':
            return MONGO_S3_REDIS_ENV;
        case 'mongo-only':
            return MONGO_ONLY_ENV;
        default:
            return undefined;
    }
}
