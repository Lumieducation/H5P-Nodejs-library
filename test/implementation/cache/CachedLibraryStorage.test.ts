import path from 'path';
import cacheManager from 'cache-manager';
import fsExtra from 'fs-extra';

import { ILibraryStorage } from '../../../src/types';
import CachedLibraryStorage from '../../../src/implementation/cache/CachedLibraryStorage';
import FileLibraryStorage from '../../../src/implementation/fs/FileLibraryStorage';

type FunctionPropertyNames<T> = {
    [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T] &
    string;

describe('CachedLibraryStorage', () => {
    let defaultCachedStorage: ILibraryStorage;
    let defaultUncachedStorage: ILibraryStorage;
    let defaultCheckIfFunctionCaches;

    beforeEach(() => {
        defaultUncachedStorage = new FileLibraryStorage(
            path.resolve('test/data/libraries')
        );
        defaultCachedStorage = new CachedLibraryStorage(
            defaultUncachedStorage,
            cacheManager.caching({
                store: 'memory',
                ttl: 60 * 60 * 24,
                max: 2 ** 10
            })
        );
        defaultCheckIfFunctionCaches = checkIfFunctionCaches(
            defaultUncachedStorage,
            defaultCachedStorage
        );
    });

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
    const checkIfFunctionCaches = (uncachedStorage, cachedStorage) => async <
        M extends FunctionPropertyNames<Required<ILibraryStorage>>
    >(
        functionName: M,
        expectedResult: any,
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

    it("doesn't read from the wrapped storage for metadata twice", async () => {
        expect(
            await defaultCheckIfFunctionCaches(
                'getLibrary',
                await fsExtra.readJSON(
                    path.resolve(
                        'test/data/libraries/H5P.Example1-1.1/library.json'
                    )
                ),
                {
                    machineName: 'H5P.Example1',
                    majorVersion: 1,
                    minorVersion: 1
                }
            )
        ).toEqual(1);
    });

    it("doesn't read from the wrapped storage for semantics twice (as JSON)", async () => {
        expect(
            await defaultCheckIfFunctionCaches(
                'getFileAsJson',
                await fsExtra.readJSON(
                    path.resolve(
                        'test/data/libraries/H5P.Example1-1.1/semantics.json'
                    )
                ),
                {
                    machineName: 'H5P.Example1',
                    majorVersion: 1,
                    minorVersion: 1
                },
                'semantics.json'
            )
        ).toEqual(1);
    });

    it("doesn't read from the wrapped storage for semantics twice (as string)", async () => {
        expect(
            await defaultCheckIfFunctionCaches(
                'getFileAsString',
                (
                    await fsExtra.readFile(
                        path.resolve(
                            'test/data/libraries/H5P.Example1-1.1/semantics.json'
                        )
                    )
                ).toString(),
                {
                    machineName: 'H5P.Example1',
                    majorVersion: 1,
                    minorVersion: 1
                },
                'semantics.json'
            )
        ).toEqual(1);
    });

    it('reads from the wrapped storage for uncached files twice (as string)', async () => {
        expect(
            await defaultCheckIfFunctionCaches(
                'getFileAsString',
                (
                    await fsExtra.readFile(
                        path.resolve(
                            'test/data/libraries/H5P.Example1-1.1/greetingcard.js'
                        )
                    )
                ).toString(),
                {
                    machineName: 'H5P.Example1',
                    majorVersion: 1,
                    minorVersion: 1
                },
                'greetingcard.js'
            )
        ).toEqual(2);
    });

    it('caches getInstalledLibraryNames', async () => {
        expect(
            await defaultCheckIfFunctionCaches('getInstalledLibraryNames', [
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
            ])
        ).toEqual(1);
    });
});
