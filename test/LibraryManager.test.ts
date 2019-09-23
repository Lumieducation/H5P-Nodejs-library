import fsExtra from 'fs-extra';
import path from 'path';
import { withDir } from 'tmp-promise';

import FileLibraryStorage from '../src/FileLibraryStorage';
import Library from '../src/Library';
import LibraryManager from '../src/LibraryManager';

describe('basic file library manager functionality', () => {
    it('returns the list of installed library in demo directory', async () => {
        const libManager = new LibraryManager(
            new FileLibraryStorage(`${path.resolve('')}/test/data/libraries`)
        );

        const libraryObject = await libManager.getInstalled([]);
        expect(Object.keys(libraryObject).length).toEqual(
            (await fsExtra.readdir('test/data/libraries')).length
        );
    });

    it('filters the list of all installed libraries by machine names', async () => {
        const libManager = new LibraryManager(
            new FileLibraryStorage(`${path.resolve('')}/test/data/libraries`)
        );

        const libraryObject = await libManager.getInstalled(['H5P.Example3']);
        expect(Object.keys(libraryObject).length).toEqual(1);
    });

    it('correctly detects patches', async () => {
        const libManager = new LibraryManager(
            new FileLibraryStorage(`${path.resolve('')}/test/data/libraries`)
        );

        const libraryObject = await libManager.getInstalled(['H5P.Example1']);
        expect(
            await libManager.isPatchedLibrary(libraryObject['H5P.Example1'][0])
        ).toEqual(false);
        libraryObject['H5P.Example1'][0].patchVersion += 1;
        expect(
            await libManager.isPatchedLibrary(libraryObject['H5P.Example1'][0])
        ).toEqual(true);
        libraryObject['H5P.Example1'][0].patchVersion -= 2;
        expect(
            await libManager.isPatchedLibrary(libraryObject['H5P.Example1'][0])
        ).toEqual(false);
    });

    it("doesn't install libraries if a library is corrupt and leaves no traces", async () => {
        await withDir(
            async ({ path: tempDirPath }) => {
                const libManager = new LibraryManager(
                    new FileLibraryStorage(tempDirPath)
                );

                // prepare by installing library version 1.1.3 (has missing .js file)
                await expect(
                    libManager.installFromDirectory(
                        path.resolve(
                            'test/data/patches/H5P.Example1-1.1.3 (missing js file)'
                        ),
                        false
                    )
                ).rejects.toThrow(
                    'Error(s) in library H5P.Example1-1.1:\ngreetingcard.js is missing.'
                );

                // check if library version 1.1.2 is NOT installed
                const installedLibraries = await libManager.getInstalled([
                    'H5P.Example1'
                ]);
                expect(installedLibraries['H5P.Example1']).toEqual(undefined);

                // make sure there is no trace of the library left
                expect(await fsExtra.readdir(tempDirPath)).toEqual([]);
            },
            { keep: false, unsafeCleanup: true }
        );
    });

    it("doesn't install older patches of libraries", async () => {
        await withDir(
            async ({ path: tempDirPath }) => {
                const libManager = new LibraryManager(
                    new FileLibraryStorage(tempDirPath)
                );

                // prepare by installing library version 1.1.2
                await expect(
                    libManager.installFromDirectory(
                        path.resolve('test/data/patches/H5P.Example1-1.1.2'),
                        false
                    )
                ).resolves.toEqual(true);

                // try installing library version 1.1.1 (should fail)
                await expect(
                    libManager.installFromDirectory(
                        path.resolve('test/data/patches/H5P.Example1-1.1.1'),
                        false
                    )
                ).resolves.toEqual(false);

                // check if library version 1.1.2 is still installed
                const installedLibraries = await libManager.getInstalled([
                    'H5P.Example1'
                ]);
                expect(installedLibraries['H5P.Example1'].length).toEqual(1);
                expect(installedLibraries['H5P.Example1'][0].majorVersion).toBe(
                    1
                );
                expect(installedLibraries['H5P.Example1'][0].minorVersion).toBe(
                    1
                );
                expect(installedLibraries['H5P.Example1'][0].patchVersion).toBe(
                    2
                );

                // try installing library version 1.1.2 again (should fail)
                await expect(
                    libManager.installFromDirectory(
                        path.resolve('test/data/patches/H5P.Example1-1.1.2'),
                        false
                    )
                ).resolves.toEqual(false);
            },
            { keep: false, unsafeCleanup: true }
        );
    });

    it('installs new versions (increase in major/minor version) side-by-side to existing libraries of same machine name', async () => {
        await withDir(
            async ({ path: tempDirPath }) => {
                const libManager = new LibraryManager(
                    new FileLibraryStorage(tempDirPath)
                );

                // prepare by installing library version 1.1.1
                await expect(
                    libManager.installFromDirectory(
                        path.resolve('test/data/patches/H5P.Example1-1.1.1'),
                        false
                    )
                ).resolves.toEqual(true);

                // try installing library version 1.2.0 (should success)
                await expect(
                    libManager.installFromDirectory(
                        path.resolve('test/data/patches/H5P.Example1-1.2.0'),
                        false
                    )
                ).resolves.toEqual(true);

                // check if library version 1.1.2  and 1.2.0 are now installed
                const installedLibraries = await libManager.getInstalled([
                    'H5P.Example1'
                ]);
                expect(installedLibraries['H5P.Example1'].length).toEqual(2);
                expect(installedLibraries['H5P.Example1'][0].majorVersion).toBe(
                    1
                );
                expect(installedLibraries['H5P.Example1'][0].minorVersion).toBe(
                    1
                );
                expect(installedLibraries['H5P.Example1'][0].patchVersion).toBe(
                    1
                );
                expect(installedLibraries['H5P.Example1'][1].majorVersion).toBe(
                    1
                );
                expect(installedLibraries['H5P.Example1'][1].minorVersion).toBe(
                    2
                );
                expect(installedLibraries['H5P.Example1'][1].patchVersion).toBe(
                    0
                );
            },
            { keep: false, unsafeCleanup: true }
        );
    });

    it('installs patches', async () => {
        await withDir(
            async ({ path: tempDirPath }) => {
                const libManager = new LibraryManager(
                    new FileLibraryStorage(tempDirPath)
                );

                // prepare by installing library version 1.1.1
                await expect(
                    libManager.installFromDirectory(
                        path.resolve('test/data/patches/H5P.Example1-1.1.1'),
                        false
                    )
                ).resolves.toEqual(true);

                // try installing library version 1.1.2 (should success)
                await expect(
                    libManager.installFromDirectory(
                        path.resolve('test/data/patches/H5P.Example1-1.1.2'),
                        false
                    )
                ).resolves.toEqual(true);

                // check if library version 1.1.2 is now installed
                const installedLibraries = await libManager.getInstalled([
                    'H5P.Example1'
                ]);
                expect(installedLibraries['H5P.Example1'].length).toEqual(1);
                expect(installedLibraries['H5P.Example1'][0].majorVersion).toBe(
                    1
                );
                expect(installedLibraries['H5P.Example1'][0].minorVersion).toBe(
                    1
                );
                expect(installedLibraries['H5P.Example1'][0].patchVersion).toBe(
                    2
                );
            },
            { keep: false, unsafeCleanup: true }
        );
    });

    it("doesn't leave behind broken libraries if a patch fails", async () => {
        await withDir(
            async ({ path: tempDirPath }) => {
                const libManager = new LibraryManager(
                    new FileLibraryStorage(tempDirPath)
                );

                // prepare by installing library version 1.1.1
                await expect(
                    libManager.installFromDirectory(
                        path.resolve('test/data/patches/H5P.Example1-1.1.1'),
                        false
                    )
                ).resolves.toEqual(true);

                // try installing library version 1.1.3 (should fail)
                await expect(
                    libManager.installFromDirectory(
                        path.resolve(
                            'test/data/patches/H5P.Example1-1.1.3 (missing js file)'
                        ),
                        false
                    )
                ).rejects.toThrow(
                    'Error(s) in library H5P.Example1-1.1:\ngreetingcard.js is missing.'
                );

                // check that library version 1.1.3 is NOT installed
                const installedLibraries = await libManager.getInstalled([
                    'H5P.Example1'
                ]);
                expect(installedLibraries['H5P.Example1']).toEqual(undefined);

                // make sure there is no trace of the library left
                expect(await fsExtra.readdir(tempDirPath)).toEqual([]);
            },
            { keep: false, unsafeCleanup: true }
        );
    });
});

describe('listLanguages()', () => {
    it('returns an empty array if the language folder does not exist', async () => {
        const libManager = new LibraryManager(
            new FileLibraryStorage(`${path.resolve('')}/test/data/libraries`)
        );

        const library = new Library('H5P.Example2', 1, 2, 0);

        await expect(libManager.listLanguages(library)).resolves.toEqual([]);
    });
});
