const fs = require('fs-extra');
const path = require('path');

const LibraryManager = require('../src/library-manager');
const FileLibraryStorage = require('../src/file-library-storage');

describe('basic file library manager functionality', () => {
    it('returns the list of installed library in demo directory', async () => {
        const libManager = new LibraryManager(new FileLibraryStorage(`${path.resolve('')}/test/data/libraries`));

        const libraryObject = await libManager.getInstalled();
        expect(Object.keys(libraryObject).length).toEqual((await fs.readdir('test/data/libraries')).length);
    });
    it('filters the list of all installed libraries by machine names', async () => {
        const libManager = new LibraryManager(new FileLibraryStorage(`${path.resolve('')}/test/data/libraries`));

        const libraryObject = await libManager.getInstalled('H5P.Example3');
        expect(Object.keys(libraryObject).length).toEqual(1);
    });
    it('correctly detects patches', async () => {
        const libManager = new LibraryManager(new FileLibraryStorage(`${path.resolve('')}/test/data/libraries`));
  
        const libraryObject = await libManager.getInstalled('H5P.Example1');
        expect(await libManager.isPatchedLibrary(libraryObject["H5P.Example1"][0])).toEqual(false);
        libraryObject["H5P.Example1"][0].patchVersion += 1;
        expect(await libManager.isPatchedLibrary(libraryObject["H5P.Example1"][0])).toEqual(true);
        libraryObject["H5P.Example1"][0].patchVersion -= 2;
        expect(await libManager.isPatchedLibrary(libraryObject["H5P.Example1"][0])).toEqual(false);
    });
  
});
