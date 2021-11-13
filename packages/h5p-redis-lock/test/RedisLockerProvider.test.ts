import ioredis from 'ioredis';
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

describe('RedisLockerProvider', () => {
    it('prevents race conditions when installing libraries', async () => {
        await withDir(
            async ({ path: tempDirPath }) => {
                const libManager = new LibraryManager(
                    new fsImplementations.FileLibraryStorage(tempDirPath),
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    new RedisLockProvider(
                        new ioredis(redisPort, redisHost, {
                            db: redisDb
                        })
                    )
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
                    new RedisLockProvider(
                        new ioredis(redisPort, redisHost, {
                            db: redisDb
                        })
                    ),
                    {
                        installLibraryLockMaxOccupationTime: 1,
                        installLibraryLockTimeout: 50
                    }
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
                await expect(Promise.all(promises)).rejects.toThrowError(
                    'server:install-library-lock-max-time-exceeded'
                );
            },
            { keep: false, unsafeCleanup: true }
        );
    });

    it('correctly throws timeout when acquiring locks', async () => {
        await withDir(
            async ({ path: tempDirPath }) => {
                const libManager = new LibraryManager(
                    new fsImplementations.FileLibraryStorage(tempDirPath),
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    new RedisLockProvider(
                        new ioredis(redisPort, redisHost, {
                            db: redisDb
                        })
                    ),
                    {
                        installLibraryLockMaxOccupationTime: 50,
                        installLibraryLockTimeout: 1
                    }
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
                await expect(Promise.all(promises)).rejects.toThrowError(
                    'server:install-library-lock-timeout'
                );
            },
            { keep: false, unsafeCleanup: true }
        );
    });
});
