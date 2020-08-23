import path from 'path';
import cacheManager from 'cache-manager';

import { ILibraryStorage } from '../../../src/types';
import CachedLibraryStorage from '../../../src/implementation/cache/CachedLibraryStorage';
import FileLibraryStorage from '../../../src/implementation/fs/FileLibraryStorage';

describe('CachedLibraryStorage', () => {
    let cachedStorage: ILibraryStorage;
    let storage: ILibraryStorage;
    beforeEach(() => {
        storage = new FileLibraryStorage(path.resolve('test/data/libraries'));
        cachedStorage = new CachedLibraryStorage(
            storage,
            cacheManager.caching({
                store: 'memory',
                ttl: 60 * 60 * 24,
                max: 2 ** 10
            })
        );
    });

    it("doesn't read from the wrapped storage for metadata twice", async () => {
        const spy = jest.spyOn(storage, 'getLibrary');
        const metadata1 = await cachedStorage.getLibrary({
            machineName: 'H5P.Example1',
            majorVersion: 1,
            minorVersion: 1
        });
        expect(metadata1).toMatchObject({
            title: 'Example 1',
            description: 'The description of content type 1',
            majorVersion: 1,
            minorVersion: 1,
            patchVersion: 1,
            runnable: 1,
            author: 'H5P NodeJs Implementation',
            license: 'MIT',
            machineName: 'H5P.Example1',
            preloadedJs: [
                {
                    path: 'greetingcard.js'
                }
            ],
            preloadedCss: [
                {
                    path: 'greetingcard.css'
                }
            ]
        });
        const metadata2 = await cachedStorage.getLibrary({
            machineName: 'H5P.Example1',
            majorVersion: 1,
            minorVersion: 1
        });
        expect(metadata1).toMatchObject(metadata2);
        expect(spy).toHaveBeenCalledTimes(1);
    });
});
