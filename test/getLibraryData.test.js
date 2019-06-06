const H5PEditor = require('../src');

describe('aggregating data from library folders for the editor', () => {
    it('returns empty data', () => {
        const h5pEditor = new H5PEditor({
            loadSemantics: () => Promise.resolve([]),
            loadLibrary: () => {
                return {
                    editorDependencies: []
                };
            }
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
            css: [],
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
            },
            loadLibrary: () => {
                return {
                    editorDependencies: []
                };
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

    it('includes the editor-dependencies in the javascript field', () => {
        const storage = {
            loadSemantics: () => Promise.resolve({}),
            loadLibrary: machineName => {
                switch (machineName) {
                    case 'H5PEditor.Test':
                        return {
                            machineName: 'H5PEditor.test',
                            majorVersion: 1,
                            minorVersion: 0,
                            preloadedJs: [
                                {
                                    path: 'path/to/test.js'
                                }
                            ]
                        };
                    default:
                        return {
                            machineName: 'Foo',
                            majorVersion: 1,
                            minorVersion: 2,
                            editorDependencies: [
                                {
                                    machineName: 'H5PEditor.Test',
                                    majorVersion: 1,
                                    minorVersion: 0
                                }
                            ]
                        };
                }
            }
        };

        return new H5PEditor(storage)
            .getLibraryData('Foo', 1, 2)
            .then(libraryData => {
                expect(libraryData.javascript).toEqual([
                    '/h5p/libraries/H5PEditor.Test-1.0/path/to/test.js'
                ]);
            });
    });
});
