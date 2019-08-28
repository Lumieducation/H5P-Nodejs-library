const path = require('path');

const H5PEditor = require('..').Editor;
const LibraryManager = require('../src/library-manager');
const FileLibraryStorage = require('../src/file-library-storage');

describe('getting overview about multiple libraries', () => {
    it('returns basic information about single library', () => {
        return new H5PEditor({}, null, null, new LibraryManager(new FileLibraryStorage(path.resolve("test/data/libraries"))))
            .getLibraryOverview(['H5P.Example1 1.1'])
            .then(libraries =>
                expect(libraries).toEqual([
                    {
                        uberName: 'H5P.Example1 1.1',
                        name: 'H5P.Example1',
                        majorVersion: 1,
                        minorVersion: 1,
                        tutorialUrl: '',
                        title: 'Example 1',
                        runnable: 1,
                        restricted: false,
                        metadataSettings: null
                    }
                ])
            );
    });

    it('return information about multiple libraries', () => {
        return new H5PEditor({}, null, null, new LibraryManager(new FileLibraryStorage(path.resolve("test/data/libraries"))))
            .getLibraryOverview(['H5P.Example1 1.1', 'H5P.Example3 2.1'])

            .then(libraries => {
                expect(libraries.map(l => l.uberName)).toEqual([
                    'H5P.Example1 1.1',
                    'H5P.Example3 2.1'
                ]);
            });
    });
});
