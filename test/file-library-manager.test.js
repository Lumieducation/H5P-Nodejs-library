const fs = require('fs-extra');

const InMemoryStorage = require('../src/in-memory-storage');
const H5PEditorConfig = require('../src/config');
const FileLibraryManager = require('../src/file-library-manager');

describe('basic file library manager functionality', () => {
    it('returns the list of installed library in demo directory', async () => {
        const storage = new InMemoryStorage();
        const config = new H5PEditorConfig(storage);
        const libManager = new FileLibraryManager(config);

        const libraryObject = await libManager.getInstalled();
        expect(Object.keys(libraryObject).length).toEqual((await fs.readdir('h5p/libraries')).length);
    });
});
