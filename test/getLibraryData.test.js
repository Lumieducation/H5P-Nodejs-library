const H5PEditor = require('../src');

describe('aggregating data from library folders for the editor', () => {
    it('returns empty data', () => {
        const h5pEditor = new H5PEditor({
            loadSemantics: () => Promise.resolve([]),
            loadLibrary: () => {
                return Promise.resolve({
                    editorDependencies: []
                });
            },
            loadLanguage: () => Promise.resolve(null),
            listLanguages: () => Promise.resolve([])
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
            translations: {},
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
                return Promise.resolve({
                    editorDependencies: []
                });
            },
            loadLanguage: () => Promise.resolve(null),
            listLanguages: () => Promise.resolve([])
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

    it('includes assets of preloaded and editor dependencies', () => {
        const storage = {
            loadSemantics: () => Promise.resolve({}),
            loadLibrary: machineName => {
                switch (machineName) {
                    case 'Foo':
                        return Promise.resolve({
                            machineName: 'Foo',
                            majorVersion: 1,
                            minorVersion: 2,
                            preloadedDependencies: [
                                {
                                    machineName: 'PreloadedDependency',
                                    majorVersion: 1,
                                    minorVersion: 0
                                }
                            ],
                            editorDependencies: [
                                {
                                    machineName: 'EditorDependency',
                                    majorVersion: 1,
                                    minorVersion: 0
                                }
                            ]
                        });
                    case 'PreloadedDependency':
                        return Promise.resolve({
                            machineName: 'PreloadedDependency',
                            majorVersion: 1,
                            minorVersion: 0,
                            preloadedJs: [
                                {
                                    path: 'some/script.js'
                                }
                            ],
                            preloadedCss: [
                                {
                                    path: 'some/style.css'
                                }
                            ]
                        });
                    case 'EditorDependency':
                        return Promise.resolve({
                            machineName: 'EditorDependency',
                            majorVersion: 1,
                            minorVersion: 0,
                            preloadedJs: [
                                {
                                    path: 'path/to/script.js'
                                }
                            ],
                            preloadedCss: [
                                {
                                    path: 'path/to/style.css'
                                }
                            ]
                        });
                }
            },
            loadLanguage: () => Promise.resolve(null),
            listLanguages: () => Promise.resolve([])
        };

        return new H5PEditor(storage)
            .getLibraryData('Foo', 1, 2)
            .then(libraryData => {
                expect(libraryData.javascript).toEqual([
                    '/h5p/libraries/PreloadedDependency-1.0/some/script.js',
                    '/h5p/libraries/EditorDependency-1.0/path/to/script.js',
                ]);
                expect(libraryData.css).toEqual([
                    '/h5p/libraries/PreloadedDependency-1.0/some/style.css',
                    '/h5p/libraries/EditorDependency-1.0/path/to/style.css',
                ]);
            });
    });

    it('includes dependencies of dependencies in the javascript field', () => {
        const storage = {
            loadSemantics: () => Promise.resolve({}),
            loadLibrary: machineName => {
                switch (machineName) {
                    case 'Foo':
                        return Promise.resolve({
                            machineName: 'Foo',
                            majorVersion: 1,
                            minorVersion: 2,
                            preloadedDependencies: [
                                {
                                    machineName: 'Bar',
                                    majorVersion: 1,
                                    minorVersion: 3
                                }
                            ]
                        });
                    case 'Bar':
                        return Promise.resolve({
                            machineName: 'Bar',
                            majorVersion: 1,
                            minorVersion: 3,
                            preloadedJs: [
                                {
                                    path: 'bar/script.js'
                                }
                            ],
                            preloadedDependencies: [
                                {
                                    machineName: 'PreloadedDependency',
                                    majorVersion: 1,
                                    minorVersion: 0
                                }
                            ],
                            editorDependencies: [
                                {
                                    machineName: 'EditorDependency',
                                    majorVersion: 1,
                                    minorVersion: 0
                                }
                            ]
                        });
                    case 'PreloadedDependency':
                        return Promise.resolve({
                            machineName: 'PreloadedDependency',
                            majorVersion: 1,
                            minorVersion: 0,
                            preloadedJs: [
                                {
                                    path: 'some/script.js'
                                }
                            ]
                        });
                    case 'EditorDependency':
                        return Promise.resolve({
                            machineName: 'EditorDependency',
                            majorVersion: 1,
                            minorVersion: 0,
                            preloadedJs: [
                                {
                                    path: 'path/to/script.js'
                                }
                            ]
                        });
                }
            },
            loadLanguage: () => Promise.resolve(null),
            listLanguages: () => Promise.resolve([])
        };

        return new H5PEditor(storage)
            .getLibraryData('Foo', 1, 2)
            .then(libraryData => {
                expect(libraryData.javascript).toEqual([
                    '/h5p/libraries/PreloadedDependency-1.0/some/script.js',
                    '/h5p/libraries/EditorDependency-1.0/path/to/script.js',
                    '/h5p/libraries/Bar-1.3/bar/script.js'
                ]);
            });
    });

    it('loads the language', () => {
        const loadLanguage = jest.fn(() => {
            return Promise.resolve({ arbitrary: 'languageObject' });
        });

        const storage = {
            loadSemantics: () => Promise.resolve({}),
            loadLibrary: machineName => {
                switch (machineName) {
                    case 'H5PEditor.Test':
                        return Promise.resolve({
                            machineName: 'H5PEditor.test',
                            majorVersion: 1,
                            minorVersion: 0,
                            preloadedJs: [
                                {
                                    path: 'path/to/test.js'
                                }
                            ]
                        });
                    default:
                        return Promise.resolve({
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
                        });
                }
            },
            loadLanguage,
            listLanguages: () => Promise.resolve([])
        };

        const machineName = 'Foo';
        const majorVersion = 1;
        const minorVersion = 2;
        const language = 'en';

        return new H5PEditor(storage)
            .getLibraryData('Foo', 1, 2, language)
            .then(libraryData => {
                expect(libraryData.language).toEqual({
                    arbitrary: 'languageObject'
                });
                expect(loadLanguage.mock.calls[1][0]).toBe(machineName);
                expect(loadLanguage.mock.calls[1][1]).toBe(majorVersion);
                expect(loadLanguage.mock.calls[1][2]).toBe(minorVersion);
                expect(loadLanguage.mock.calls[1][3]).toBe(language);
            });
    });

    it('lists all available languages', () => {
        const listLanguages = jest.fn(() => {
            return Promise.resolve(['array', 'with', 'languages']);
        });

        const storage = {
            loadSemantics: () => Promise.resolve({}),
            loadLibrary: machineName => {
                switch (machineName) {
                    case 'H5PEditor.Test':
                        return Promise.resolve({
                            machineName: 'H5PEditor.test',
                            majorVersion: 1,
                            minorVersion: 0,
                            preloadedJs: [
                                {
                                    path: 'path/to/test.js'
                                }
                            ]
                        });
                    default:
                        return Promise.resolve({
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
                        });
                }
            },
            loadLanguage: () => Promise.resolve([]),
            listLanguages
        };

        const machineName = 'Foo';
        const majorVersion = 1;
        const minorVersion = 2;

        return new H5PEditor(storage)
            .getLibraryData('Foo', 1, 2)
            .then(libraryData => {
                expect(libraryData.languages).toEqual([
                    'array',
                    'with',
                    'languages'
                ]);
                expect(listLanguages.mock.calls[0][0]).toBe(machineName);
                expect(listLanguages.mock.calls[0][1]).toBe(majorVersion);
                expect(listLanguages.mock.calls[0][2]).toBe(minorVersion);
            });
    });

    it('lists dependencies in correct order', () => {
        const storage = {
            loadSemantics: () => Promise.resolve({}),
            loadLibrary: machineName => {
                switch (machineName) {
                    case 'Foo':
                        return Promise.resolve({
                            machineName: 'Foo',
                            majorVersion: 1,
                            minorVersion: 0,
                            preloadedJs: [
                                {
                                    path: 'script.js'
                                }
                            ],
                            preloadedDependencies: [
                                {
                                    machineName: 'Bar',
                                    majorVersion: 1,
                                    minorVersion: 0
                                },
                                {
                                    machineName: 'Baz',
                                    majorVersion: 1,
                                    minorVersion: 0
                                }
                            ]
                        });
                    case 'Bar':
                        return Promise.resolve({
                            machineName: 'Bar',
                            majorVersion: 1,
                            minorVersion: 0,
                            preloadedJs: [
                                {
                                    path: 'script.js'
                                }
                            ],
                            preloadedDependencies: [
                                {
                                    machineName: 'Jaz',
                                    majorVersion: 1,
                                    minorVersion: 0
                                }
                            ]
                        });
                    case 'Baz':
                        return Promise.resolve({
                            machineName: 'Baz',
                            majorVersion: 1,
                            minorVersion: 0,
                            preloadedJs: [
                                {
                                    path: 'script.js'
                                }
                            ],
                            preloadedDependencies: [
                                {
                                    machineName: 'Jaz',
                                    majorVersion: 1,
                                    minorVersion: 0
                                }
                            ]
                        });
                    case 'Jaz':
                        return new Promise(y => setTimeout(() => y({
                            machineName: 'Bar',
                            majorVersion: 1,
                            minorVersion: 0,
                            preloadedJs: [
                                {
                                    path: 'script.js'
                                }
                            ],
                            preloadedDependencies: [
                                {
                                    machineName: 'Jaz',
                                    majorVersion: 1,
                                    minorVersion: 0
                                }
                            ]
                        }), 10));
                }
            },
            loadLanguage: () => Promise.resolve(null),
            listLanguages: () => Promise.resolve([])
        };

        return new H5PEditor(storage)
            .getLibraryData('Foo', 1, 0)
            .then(libraryData => {
                expect(libraryData.javascript).toEqual([
                    '/h5p/libraries/Jaz-1.0/script.js',
                    '/h5p/libraries/Bar-1.0/script.js',
                    '/h5p/libraries/Baz-1.0/script.js',
                    '/h5p/libraries/Foo-1.0/script.js',
                ]);
            });
    });
});
