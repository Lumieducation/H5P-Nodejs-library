import { createClient, RedisClientType } from 'redis';
import { withDir } from 'tmp-promise';

import {
    fsImplementations,
    LibraryManager,
    ILibraryInstallResult
} from '@lumieducation/h5p-server';
import RedisLockProvider from '../src/RedisLockProvider';

const redisPort = process.env.LOCK_REDIS_PORT
    ? Number.parseInt(process.env.LOCK_REDIS_PORT)
    : 6379;
const redisHost = process.env.LOCK_REDIS_HOST ?? 'localhost';
const redisDb = process.env.LOCK_REDIS_DB
    ? Number.parseInt(process.env.LOCK_REDIS_DB)
    : 1;

let redisClient: RedisClientType;

describe('RedisLockerProvider', () => {
    beforeEach(async () => {
        if (redisClient) {
            await redisClient.disconnect();
        }
        redisClient = createClient({
            socket: {
                port: redisPort,
                host: redisHost
            },
            database: redisDb
        });

        // Connect to the Redis server
        await redisClient.connect();
    });

    afterEach(async () => {
        // Disconnect before dropping the reference, otherwise the
        // connection opened in beforeEach leaks until the process exits.
        if (redisClient) {
            await redisClient.disconnect();
        }
        redisClient = null;
    });

    it('prevents race conditions when installing libraries', async () => {
        await withDir(
            async ({ path: tempDirPath }) => {
                const libManager = new LibraryManager(
                    new fsImplementations.FileLibraryStorage(tempDirPath),
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    new RedisLockProvider(redisClient)
                );

                const promises: Promise<ILibraryInstallResult>[] = [];
                for (let i = 0; i < 100; i++) {
                    promises.push(
                        libManager.installFromDirectory(
                            `${__dirname}/../../../test/data/libraries/H5P.Example1-1.1`,
                            false
                        )
                    );
                }
                await expect(Promise.all(promises)).resolves.toBeDefined();
            },
            { keep: false, unsafeCleanup: true }
        );
    });

    it('correctly throws operation time exceeded', async () => {
        await withDir(
            async ({ path: tempDirPath }) => {
                const libManager = new LibraryManager(
                    new fsImplementations.FileLibraryStorage(tempDirPath),
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    new RedisLockProvider(redisClient),
                    {
                        installLibraryLockMaxOccupationTime: 1,
                        installLibraryLockTimeout: 50
                    }
                );

                const promises: Promise<ILibraryInstallResult>[] = [];
                for (let i = 0; i < 100; i++) {
                    if (redisClient) {
                        promises.push(
                            libManager.installFromDirectory(
                                `${__dirname}/../../../test/data/libraries/H5P.Example1-1.1`,
                                false
                            )
                        );
                    }
                }

                // We must wait for ALL installs to settle (not just the
                // first rejection) before leaving this callback, as
                // `withDir` will remove `tempDirPath` right afterwards.
                // Using `Promise.all` here would resolve as soon as the
                // first promise rejects, while the remaining installs
                // are still writing to `tempDirPath`, racing the
                // subsequent directory cleanup and causing intermittent
                // ENOTEMPTY errors.
                const results = await Promise.allSettled(promises);
                const rejected = results.filter(
                    (result) => result.status === 'rejected'
                ) as PromiseRejectedResult[];

                // At least one install must have failed with the
                // expected lock-timeout error to prove the timeout
                // behavior actually happened.
                expect(rejected.length).toBeGreaterThan(0);
                expect(
                    rejected.some((result) =>
                        String(result.reason?.message).includes(
                            'server:install-library-lock-max-time-exceeded'
                        )
                    )
                ).toBe(true);
            },
            { keep: false, unsafeCleanup: true }
        );
    });
});
