const H5PEditor = require('../src');

describe('aggregating data from library folders for the editor', () => {
    it('returns empty data', () => {
        const h5pEditor = new H5PEditor({
            loadSemantics: () => Promise.resolve([])
        });

        return expect(h5pEditor.getLibraryData('Foo', 1, 2)).resolves.toEqual({
            name: 'Foo',
            version: {
                major: 1,
                minor: 2
            },
            semantics: [],
            language: null,
            defaultLanguage: null,
            javascript: [],
            translations: [],
            languages: []
        });
    });

    it('includes the semantics.json content', () => {
        const storage = {
            loadSemantics: (machineName, majorVersion, minorVersion) => {
                return Promise.resolve({
                    machineName,
                    majorVersion,
                    minorVersion,
                    arbitrary: 'content'
                });
            }
        };

        return new H5PEditor(storage)
            .getLibraryData('Foo', 1, 2)
            .then(libraryData => {
                expect(libraryData.semantics).toEqual({
                    machineName: 'Foo',
                    majorVersion: 1,
                    minorVersion: 2,
                    arbitrary: 'content'
                });
            });
    });
});
