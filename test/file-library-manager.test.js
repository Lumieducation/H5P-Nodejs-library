const fs = require('fs-extra');
const path = require('path');

const FileLibraryManager = require('./mockups/file-library-manager');

describe('basic file library manager functionality', () => {
    it('returns the list of installed library in demo directory', async () => {
        const libManager = new FileLibraryManager(`${path.resolve('')}/h5p/libraries`);

        const libraryObject = await libManager.getInstalled();
        expect(Object.keys(libraryObject).length).toEqual((await fs.readdir('h5p/libraries')).length);
    });
    it('filters the list of all installed libraries by machine names', async () => {
        const libManager = new FileLibraryManager(`${path.resolve('')}/h5p/libraries`);

        const libraryObject = await libManager.getInstalled('H5P.Blanks', 'H5P.CoursePresentation');
        expect(Object.keys(libraryObject).length).toEqual(2);
    });
    it('correctly detects patches', async () => {
        const libManager = new FileLibraryManager(`${path.resolve('')}/h5p/libraries`);
  
        const libraryObject = await libManager.getInstalled('H5P.Blanks');
        expect(await libManager.isPatchedLibrary(libraryObject["H5P.Blanks"][0])).toEqual(false);
        libraryObject["H5P.Blanks"][0].patchVersion += 1;
        expect(await libManager.isPatchedLibrary(libraryObject["H5P.Blanks"][0])).toEqual(true);
        libraryObject["H5P.Blanks"][0].patchVersion -= 2;
        expect(await libManager.isPatchedLibrary(libraryObject["H5P.Blanks"][0])).toEqual(false);
    });
  
});
