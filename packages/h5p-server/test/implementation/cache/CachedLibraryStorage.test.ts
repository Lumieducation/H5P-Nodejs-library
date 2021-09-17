import path from 'path';
import cacheManager from 'cache-manager';
import fsExtra from 'fs-extra';
import { dir, DirectoryResult } from 'tmp-promise';

import { ILibraryStorage } from '../../../src/types';
import CachedLibraryStorage from '../../../src/implementation/cache/CachedLibraryStorage';
import FileLibraryStorage from '../../../src/implementation/fs/FileLibraryStorage';
import LibraryManager from '../../../src/LibraryManager';

type FunctionPropertyNames<T> = {
    [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T] &
    string;

describe('CachedLibraryStorage', () => {
    /**
     * Calls a function on the cached storage object twice. If expectedResult is
     * defined, asserts that the result returned both times is the one in
     * expectedResult.
     * Works with async and sync functions.
     * @param functionName the function to call
     * @param expectedResult the expected result
     * @param functionParameters the parameters to pass to the function
     * @returns the number of times the un-cached function was called
     */
    const checkIfFunctionCaches =
        (uncachedStorage, cachedStorage) =>
        async <M extends FunctionPropertyNames<Required<ILibraryStorage>>>(
            functionName: M,
            expectedResult: any,
            intermittentFunction?: () => Promise<any>,
            ...functionParameters: any[]
        ): Promise<number> => {
            const spy = jest.spyOn(uncachedStorage, functionName);
            const result1 = await cachedStorage[functionName].call(
                cachedStorage,
                ...functionParameters
            );
            if (expectedResult) {
                if (typeof expectedResult === 'object') {
                    expect(result1).toMatchObject(expectedResult);
                } else {
                    expect(result1).toEqual(expectedResult);
                }
            }

            if (intermittentFunction) {
                await intermittentFunction();
            }

            const result2 = await cachedStorage[functionName].call(
                cachedStorage,
                ...functionParameters
            );
            if (expectedResult) {
                if (typeof expectedResult === 'object') {
                    expect(result1).toMatchObject(result2);
                } else {
                    expect(result1).toEqual(result2);
                }
            }
            return spy.mock.calls.length;
        };

    const initStorage = async (options?: {
        directory?: string;
        useTemporaryDirectory?: boolean;
    }): Promise<{
        cacheCheck: <
            M extends FunctionPropertyNames<Required<ILibraryStorage>>
        >(
            functionName: M,
            expectedResult: any,
            intermittentFunction?: () => Promise<any>,
            ...functionParameters: any[]
        ) => Promise<number>;
        cachedStorage: CachedLibraryStorage;
        tempDir?: DirectoryResult;
        uncachedStorage: ILibraryStorage;
    }> => {
        let tempDir: DirectoryResult;
        if (options?.useTemporaryDirectory) {
            tempDir = await dir({
                unsafeCleanup: true
            });
        }

        const uncachedStorage = new FileLibraryStorage(
            options?.useTemporaryDirectory
                ? tempDir.path
                : options?.directory ??
                  path.resolve(
                      `${__dirname}/../../../../../test/data/libraries`
                  )
        );
        const cachedStorage = new CachedLibraryStorage(
            uncachedStorage,
            cacheManager.caching({
                store: 'memory',
                ttl: 60 * 60 * 24,
                max: 2 ** 10
            })
        );
        const cacheCheck = checkIfFunctionCaches(
            uncachedStorage,
            cachedStorage
        );

        return { cachedStorage, uncachedStorage, cacheCheck, tempDir };
    };
    describe('check if caching works', () => {
        it('caches metadata', async () => {
            const { cacheCheck } = await initStorage();
            expect(
                await cacheCheck(
                    'getLibrary',
                    await fsExtra.readJSON(
                        path.resolve(
                            `${__dirname}/../../../../../test/data/libraries/H5P.Example1-1.1/library.json`
                        )
                    ),
                    undefined,
                    {
                        machineName: 'H5P.Example1',
                        majorVersion: 1,
                        minorVersion: 1
                    }
                )
            ).toEqual(1);
        });

        it('caches semantics (as JSON)', async () => {
            const { cacheCheck } = await initStorage();
            expect(
                await cacheCheck(
                    'getFileAsJson',
                    await fsExtra.readJSON(
                        path.resolve(
                            `${__dirname}/../../../../../test/data/libraries/H5P.Example1-1.1/semantics.json`
                        )
                    ),
                    undefined,
                    {
                        machineName: 'H5P.Example1',
                        majorVersion: 1,
                        minorVersion: 1
                    },
                    'semantics.json'
                )
            ).toEqual(1);
        });

        it('caches semantics (as string)', async () => {
            const { cacheCheck } = await initStorage();
            expect(
                await cacheCheck(
                    'getFileAsString',
                    (
                        await fsExtra.readFile(
                            path.resolve(
                                `${__dirname}/../../../../../test/data/libraries/H5P.Example1-1.1/semantics.json`
                            )
                        )
                    ).toString(),
                    undefined,
                    {
                        machineName: 'H5P.Example1',
                        majorVersion: 1,
                        minorVersion: 1
                    },
                    'semantics.json'
                )
            ).toEqual(1);
        });

        it('caches file stats', async () => {
            const { cacheCheck } = await initStorage();
            expect(
                await cacheCheck(
                    'getFileStats',
                    undefined,
                    undefined,
                    {
                        machineName: 'H5P.Example1',
                        majorVersion: 1,
                        minorVersion: 1
                    },
                    'semantics.json'
                )
            ).toEqual(1);
        });

        it('caches language file enumeration', async () => {
            const { cacheCheck } = await initStorage();
            expect(
                await cacheCheck('getLanguages', ['.en', 'de'], undefined, {
                    machineName: 'H5P.Example1',
                    majorVersion: 1,
                    minorVersion: 1
                })
            ).toEqual(1);
        });

        it('caches getInstalledLibraryNames without parameter', async () => {
            const { cacheCheck } = await initStorage();
            expect(
                await cacheCheck(
                    'getInstalledLibraryNames',
                    [
                        {
                            machineName: 'H5P.Example1',
                            majorVersion: 1,
                            minorVersion: 1
                        },
                        {
                            machineName: 'H5P.Example3',
                            majorVersion: 2,
                            minorVersion: 1
                        }
                    ],
                    undefined
                )
            ).toEqual(1);
        });

        it('caches getInstalledLibraryNames with parameter', async () => {
            const { cacheCheck } = await initStorage();
            expect(
                await cacheCheck(
                    'getInstalledLibraryNames',
                    [
                        {
                            machineName: 'H5P.Example1',
                            majorVersion: 1,
                            minorVersion: 1
                        }
                    ],
                    undefined,
                    'H5P.Example1'
                )
            ).toEqual(1);
        });

        it('caches listAddons', async () => {
            const { cacheCheck } = await initStorage();
            expect(await cacheCheck('listAddons', [], undefined)).toEqual(1);
        });

        it('caches fileExists (semantics.json)', async () => {
            const { cacheCheck } = await initStorage();
            expect(
                await cacheCheck(
                    'fileExists',
                    true,
                    undefined,
                    {
                        machineName: 'H5P.Example1',
                        majorVersion: 1,
                        minorVersion: 1
                    },
                    'semantics.json'
                )
            ).toEqual(1);
        });

        it('caches file lists', async () => {
            const { cacheCheck } = await initStorage();
            expect(
                await cacheCheck(
                    'listFiles',
                    [
                        'greetingcard.css',
                        'greetingcard.js',
                        'language/.en.json',
                        'language/de.json',
                        'library.json',
                        'semantics.json'
                    ],
                    undefined,
                    {
                        machineName: 'H5P.Example1',
                        majorVersion: 1,
                        minorVersion: 1
                    }
                )
            ).toEqual(1);
        });
    });
    describe('cache invalidation', () => {
        it('clears the cache of installed library names when invalidating the whole cache', async () => {
            const { cachedStorage, cacheCheck } = await initStorage();
            expect(
                await cacheCheck(
                    'getInstalledLibraryNames',
                    undefined,
                    async () => {
                        await cachedStorage.clearCache();
                    }
                )
            ).toEqual(2);
        });

        it('clears the cache of installed library names when installing new libraries', async () => {
            const { cachedStorage, cacheCheck, tempDir } = await initStorage({
                useTemporaryDirectory: true
            });
            try {
                const libraryManager = new LibraryManager(cachedStorage);
                await libraryManager.installFromDirectory(
                    path.resolve(
                        `${__dirname}/../../../../../test/data/libraries/H5P.Example1-1.1`
                    )
                );
                expect(
                    await cacheCheck(
                        'getInstalledLibraryNames',
                        undefined,
                        async () => {
                            await libraryManager.installFromDirectory(
                                path.resolve(
                                    `${__dirname}/../../../../../test/data/libraries/H5P.Example3-2.1`
                                )
                            );
                        }
                    )
                ).toEqual(2);
            } finally {
                await tempDir.cleanup();
            }
        });

        it('clears the cache of installed library names (request for individual machineName) when updating library', async () => {
            const { cacheCheck, cachedStorage, tempDir, uncachedStorage } =
                await initStorage({
                    useTemporaryDirectory: true
                });
            try {
                const libraryManager = new LibraryManager(uncachedStorage);
                await libraryManager.installFromDirectory(
                    path.resolve(
                        `${__dirname}/../../../../../test/data/libraries/H5P.Example1-1.1`
                    )
                );
                expect(
                    await cacheCheck(
                        'getInstalledLibraryNames',
                        undefined,
                        async () => {
                            await cachedStorage.updateLibrary({
                                title: 'Example 1',
                                majorVersion: 1,
                                minorVersion: 1,
                                patchVersion: 5,
                                runnable: 1,
                                machineName: 'H5P.Example1'
                            });
                        },
                        'H5P.Example1'
                    )
                ).toEqual(2);
            } finally {
                await tempDir.cleanup();
            }
        });

        it('clears the cache of addons when installing new libraries', async () => {
            const { cachedStorage, cacheCheck, tempDir } = await initStorage({
                useTemporaryDirectory: true
            });
            try {
                const libraryManager = new LibraryManager(cachedStorage);
                await libraryManager.installFromDirectory(
                    path.resolve(
                        `${__dirname}/../../../../../test/data/libraries/H5P.Example1-1.1`
                    )
                );
                expect(
                    await cacheCheck('listAddons', undefined, async () => {
                        await libraryManager.installFromDirectory(
                            path.resolve(
                                `${__dirname}/../../../../../test/data/libraries/H5P.Example3-2.1`
                            )
                        );
                    })
                ).toEqual(2);
            } finally {
                await tempDir.cleanup();
            }
        });

        it('clears the metadata cache when updating a library', async () => {
            const { cachedStorage, cacheCheck, tempDir, uncachedStorage } =
                await initStorage({
                    useTemporaryDirectory: true
                });
            try {
                const libraryManager = new LibraryManager(uncachedStorage);
                await libraryManager.installFromDirectory(
                    path.resolve(
                        `${__dirname}/../../../../../test/data/libraries/H5P.Example1-1.1`
                    )
                );
                expect(
                    await cacheCheck(
                        'getLibrary',
                        undefined,
                        async () => {
                            await cachedStorage.updateLibrary({
                                title: 'Example 1',
                                description:
                                    'The description of content type 1',
                                majorVersion: 1,
                                minorVersion: 1,
                                patchVersion: 2,
                                runnable: 1,
                                author: 'H5P NodeJs Implementation',
                                license: 'MIT',
                                machineName: 'H5P.Example1'
                            });
                        },
                        {
                            machineName: 'H5P.Example1',
                            majorVersion: 1,
                            minorVersion: 1
                        }
                    )
                ).toEqual(2);
            } finally {
                await tempDir.cleanup();
            }
        });

        it('clears the metadata cache when updating the additional metadata of a library', async () => {
            const { cachedStorage, cacheCheck, tempDir, uncachedStorage } =
                await initStorage({
                    useTemporaryDirectory: true
                });
            try {
                const libraryManager = new LibraryManager(uncachedStorage);
                await libraryManager.installFromDirectory(
                    path.resolve(
                        `${__dirname}/../../../../../test/data/libraries/H5P.Example1-1.1`
                    )
                );
                expect(
                    await cacheCheck(
                        'getLibrary',
                        undefined,
                        async () => {
                            await cachedStorage.updateAdditionalMetadata(
                                {
                                    machineName: 'H5P.Example1',
                                    majorVersion: 1,
                                    minorVersion: 1
                                },
                                {
                                    restricted: true
                                }
                            );
                        },
                        {
                            machineName: 'H5P.Example1',
                            majorVersion: 1,
                            minorVersion: 1
                        }
                    )
                ).toEqual(3); // 3 as the wrapped updateAdditionialMetadata
                // method also calls getLibrary
            } finally {
                await tempDir.cleanup();
            }
        });

        it('clear the fileExists cache (semantics.json) when clearing files', async () => {
            const { cachedStorage, cacheCheck, tempDir } = await initStorage({
                useTemporaryDirectory: true
            });
            try {
                const libraryManager = new LibraryManager(cachedStorage);
                await libraryManager.installFromDirectory(
                    path.resolve(
                        `${__dirname}/../../../../../test/data/libraries/H5P.Example1-1.1`
                    )
                );
                expect(
                    await cacheCheck(
                        'fileExists',
                        undefined,
                        async () => {
                            await cachedStorage.clearFiles({
                                machineName: 'H5P.Example1',
                                majorVersion: 1,
                                minorVersion: 1
                            });
                        },
                        {
                            machineName: 'H5P.Example1',
                            majorVersion: 1,
                            minorVersion: 1
                        },
                        'language/de.json'
                    )
                ).toEqual(2);
            } finally {
                await tempDir.cleanup();
            }
        });

        it('clears the cache of isInstalled when deleting libraries', async () => {
            const { cachedStorage, cacheCheck, tempDir, uncachedStorage } =
                await initStorage({
                    useTemporaryDirectory: true
                });
            try {
                const libraryManager = new LibraryManager(uncachedStorage);
                await libraryManager.installFromDirectory(
                    path.resolve(
                        `${__dirname}/../../../../../test/data/libraries/H5P.Example1-1.1`
                    )
                );
                expect(
                    await cacheCheck(
                        'isInstalled',
                        undefined,
                        async () => {
                            await cachedStorage.deleteLibrary({
                                machineName: 'H5P.Example1',
                                majorVersion: 1,
                                minorVersion: 1
                            });
                        },
                        {
                            machineName: 'H5P.Example1',
                            majorVersion: 1,
                            minorVersion: 1
                        }
                    )
                ).toEqual(2);
            } finally {
                await tempDir.cleanup();
            }
        });
    });
});
