import { withDir } from 'tmp-promise';

import H5PEditor from '../src/H5PEditor';
import H5PConfig from '../src/implementation/H5PConfig';
import FileLibraryStorage from '../src/implementation/fs/FileLibraryStorage';
import LibraryManager from '../src/LibraryManager';

describe('aggregating data from library folders for the editor', () => {
    it('returns empty data', () => {
        const h5pEditor = new H5PEditor(
            null,
            new H5PConfig(null),
            null,
            null,
            null
        );
        const libraryManager = new LibraryManager(
            new FileLibraryStorage(`${__dirname}/../../../test/data/libraries`)
        );

        Object.assign(libraryManager, {
            listAddons: () => Promise.resolve([]),
            libraryExists: () => Promise.resolve(true),
            listLanguages: () => Promise.resolve([]),
            getLanguage: () => Promise.resolve(null),
            getLibrary: () =>
                Promise.resolve({
                    editorDependencies: []
                }),
            getSemantics: () => Promise.resolve([])
        });

        h5pEditor.libraryManager = libraryManager;

        return expect(
            h5pEditor.getLibraryData('Foo', '1', '2')
        ).resolves.toEqual({
            css: [],
            defaultLanguage: null,
            javascript: [],
            language: null,
            languages: [],
            name: 'Foo',
            semantics: [],
            translations: {},
            upgradesScript: null,
            version: {
                major: 1,
                minor: 2
            }
        });
    });

    it('includes the semantics.json content', () => {
        const h5pEditor = new H5PEditor(
            null,
            new H5PConfig(null),
            null,
            null,
            null
        );
        const libraryManager = new LibraryManager(
            new FileLibraryStorage(`${__dirname}/../../../test/data/libraries`)
        );

        Object.assign(libraryManager, {
            listAddons: () => Promise.resolve([]),
            libraryExists: () => Promise.resolve(true),
            listLanguages: () => Promise.resolve([]),
            getLanguage: () => Promise.resolve(null),
            getLibrary: () =>
                Promise.resolve({
                    editorDependencies: []
                }),
            getSemantics: (library) =>
                Promise.resolve({
                    arbitrary: 'content',
                    machineName: library.machineName,
                    majorVersion: library.majorVersion,
                    minorVersion: library.minorVersion
                })
        });

        h5pEditor.libraryManager = libraryManager;

        return h5pEditor.getLibraryData('Foo', '1', '2').then((libraryData) => {
            expect(libraryData.semantics).toEqual({
                arbitrary: 'content',
                machineName: 'Foo',
                majorVersion: 1,
                minorVersion: 2
            });
        });
    });

    it('includes assets of preloaded and editor dependencies', () => {
        const h5pEditor = new H5PEditor(
            null,
            new H5PConfig(null, { baseUrl: '/h5p' }),
            null,
            null,
            null
        );
        const libraryManager = new LibraryManager(
            new FileLibraryStorage(`${__dirname}/../../../test/data/libraries`)
        );

        Object.assign(libraryManager, {
            listAddons: () => Promise.resolve([]),
            libraryExists: () => Promise.resolve(true),
            listLanguages: () => Promise.resolve([]),
            getLanguage: () => Promise.resolve(null),
            getLibrary: ({ machineName }) => {
                switch (machineName) {
                    case 'Foo':
                        return Promise.resolve({
                            editorDependencies: [
                                {
                                    machineName: 'EditorDependency',
                                    majorVersion: 1,
                                    minorVersion: 0
                                }
                            ],
                            machineName: 'Foo',
                            majorVersion: 1,
                            minorVersion: 2,
                            patchVersion: 1,
                            preloadedDependencies: [
                                {
                                    machineName: 'PreloadedDependency',
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
                            patchVersion: 1,
                            preloadedCss: [
                                {
                                    path: 'some/style.css'
                                }
                            ],
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
                            patchVersion: 1,
                            preloadedCss: [
                                {
                                    path: 'path/to/style.css'
                                }
                            ],
                            preloadedJs: [
                                {
                                    path: 'path/to/script.js'
                                }
                            ]
                        });
                    default:
                        throw new Error('unspecified');
                }
            },
            getSemantics: () => Promise.resolve({})
        });

        h5pEditor.libraryManager = libraryManager;

        return h5pEditor.getLibraryData('Foo', '1', '2').then((libraryData) => {
            expect(libraryData.javascript).toEqual([
                '/h5p/libraries/PreloadedDependency-1.0/some/script.js?version=1.0.1',
                '/h5p/libraries/EditorDependency-1.0/path/to/script.js?version=1.0.1'
            ]);
            expect(libraryData.css).toEqual([
                '/h5p/libraries/PreloadedDependency-1.0/some/style.css?version=1.0.1',
                '/h5p/libraries/EditorDependency-1.0/path/to/style.css?version=1.0.1'
            ]);
        });
    });

    it('includes dependencies of dependencies in the javascript field', () => {
        const h5pEditor = new H5PEditor(
            null,
            new H5PConfig(null, { baseUrl: '/h5p' }),
            null,
            null,
            null
        );
        const libraryManager = new LibraryManager(
            new FileLibraryStorage(`${__dirname}/../../../test/data/libraries`)
        );

        Object.assign(libraryManager, {
            listAddons: () => Promise.resolve([]),
            libraryExists: () => Promise.resolve(true),
            listLanguages: () => Promise.resolve([]),
            getLanguage: () => Promise.resolve(null),
            getLibrary: ({ machineName }) => {
                switch (machineName) {
                    case 'Foo':
                        return Promise.resolve({
                            machineName: 'Foo',
                            majorVersion: 1,
                            minorVersion: 2,
                            patchVersion: 1,
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
                            editorDependencies: [
                                {
                                    machineName: 'EditorDependency',
                                    majorVersion: 1,
                                    minorVersion: 0
                                }
                            ],
                            machineName: 'Bar',
                            majorVersion: 1,
                            minorVersion: 3,
                            patchVersion: 1,
                            preloadedDependencies: [
                                {
                                    machineName: 'PreloadedDependency',
                                    majorVersion: 1,
                                    minorVersion: 0
                                }
                            ],
                            preloadedJs: [
                                {
                                    path: 'bar/script.js'
                                }
                            ]
                        });
                    case 'PreloadedDependency':
                        return Promise.resolve({
                            machineName: 'PreloadedDependency',
                            majorVersion: 1,
                            minorVersion: 0,
                            patchVersion: 1,
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
                            patchVersion: 1,
                            preloadedJs: [
                                {
                                    path: 'path/to/script.js'
                                }
                            ]
                        });
                    default:
                        throw new Error('unspecified');
                }
            },
            getSemantics: () => Promise.resolve({})
        });

        h5pEditor.libraryManager = libraryManager;

        return h5pEditor.getLibraryData('Foo', '1', '2').then((libraryData) => {
            expect(libraryData.javascript).toEqual([
                '/h5p/libraries/PreloadedDependency-1.0/some/script.js?version=1.0.1',
                '/h5p/libraries/EditorDependency-1.0/path/to/script.js?version=1.0.1',
                '/h5p/libraries/Bar-1.3/bar/script.js?version=1.3.1'
            ]);
        });
    });

    it('loads the language', () => {
        const getLanguage = jest.fn(() =>
            Promise.resolve("{arbitrary: 'languageObject'}")
        ) as jest.Mocked<any>;

        const h5pEditor = new H5PEditor(
            null,
            new H5PConfig(null),
            null,
            null,
            null
        );
        const libraryManager = new LibraryManager(
            new FileLibraryStorage(`${__dirname}/../../../test/data/libraries`)
        );

        Object.assign(libraryManager, {
            listAddons: () => Promise.resolve([]),
            libraryExists: () => Promise.resolve(true),
            listLanguages: () => Promise.resolve([]),
            getLanguage,
            getLibrary: ({ _machineName }) => {
                switch (_machineName) {
                    case 'H5PEditor.Test':
                        return Promise.resolve({
                            machineName: 'H5PEditor.test',
                            majorVersion: 1,
                            minorVersion: 0,
                            patchVersion: 1,
                            preloadedJs: [
                                {
                                    path: 'path/to/test.js'
                                }
                            ]
                        });
                    default:
                        return Promise.resolve({
                            editorDependencies: [
                                {
                                    machineName: 'H5PEditor.Test',
                                    majorVersion: 1,
                                    minorVersion: 0
                                }
                            ],
                            machineName: 'Foo',
                            majorVersion: 1,
                            minorVersion: 2,
                            patchVersion: 1
                        });
                }
            },
            getSemantics: () => Promise.resolve({})
        });

        h5pEditor.libraryManager = libraryManager;

        const machineName = 'Foo';
        const majorVersion = 1;
        const minorVersion = 2;
        const language = 'en';

        return h5pEditor
            .getLibraryData('Foo', '1', '2', language)
            .then((libraryData) => {
                expect(libraryData.language).toEqual(
                    "{arbitrary: 'languageObject'}"
                );
                expect(getLanguage.mock.calls[1][0].machineName).toBe(
                    machineName
                );
                expect(getLanguage.mock.calls[1][0].majorVersion).toBe(
                    majorVersion
                );
                expect(getLanguage.mock.calls[1][0].minorVersion).toBe(
                    minorVersion
                );
                expect(getLanguage.mock.calls[1][1]).toBe(language);
            });
    });

    it('lists all available languages', () => {
        const listLanguages = jest.fn(() =>
            Promise.resolve(['array', 'with', 'languages'])
        ) as jest.Mock<any>;

        const h5pEditor = new H5PEditor(
            null,
            new H5PConfig(null, { baseUrl: '/h5p' }),
            null,
            null,
            null
        );
        const libraryManager = new LibraryManager(
            new FileLibraryStorage(`${__dirname}/../../../test/data/libraries`)
        );

        Object.assign(libraryManager, {
            listAddons: () => Promise.resolve([]),
            libraryExists: () => Promise.resolve(true),
            listLanguages,
            getLibrary: ({ _machineName }) => {
                switch (_machineName) {
                    case 'H5PEditor.Test':
                        return Promise.resolve({
                            machineName: 'H5PEditor.test',
                            majorVersion: 1,
                            minorVersion: 0,
                            patchVersion: 1,
                            preloadedJs: [
                                {
                                    path: 'path/to/test.js'
                                }
                            ]
                        });
                    default:
                        return Promise.resolve({
                            editorDependencies: [
                                {
                                    machineName: 'H5PEditor.Test',
                                    majorVersion: 1,
                                    minorVersion: 0
                                }
                            ],
                            machineName: 'Foo',
                            majorVersion: 1,
                            minorVersion: 2,
                            patchVersion: 1
                        });
                }
            },
            getLanguage: () => Promise.resolve([]),
            getSemantics: () => Promise.resolve({})
        });

        h5pEditor.libraryManager = libraryManager;

        const machineName = 'Foo';
        const majorVersion = 1;
        const minorVersion = 2;

        return h5pEditor.getLibraryData('Foo', '1', '2').then((libraryData) => {
            expect(libraryData.languages).toEqual([
                'array',
                'with',
                'languages'
            ]);
            expect(listLanguages.mock.calls[0][0].machineName).toBe(
                machineName
            );
            expect(listLanguages.mock.calls[0][0].majorVersion).toBe(
                majorVersion
            );
            expect(listLanguages.mock.calls[0][0].minorVersion).toBe(
                minorVersion
            );
        });
    });

    it('lists dependencies in correct order', () => {
        const h5pEditor = new H5PEditor(
            null,
            new H5PConfig(null, { baseUrl: '/h5p' }),
            null,
            null,
            null
        );
        const libraryManager = new LibraryManager(
            new FileLibraryStorage(`${__dirname}/../../../test/data/libraries`)
        );

        Object.assign(libraryManager, {
            listAddons: () => Promise.resolve([]),
            libraryExists: () => Promise.resolve(true),
            listLanguages: () => Promise.resolve([]),
            getLanguage: () => Promise.resolve(null),
            getLibrary: ({ machineName }) => {
                switch (machineName) {
                    case 'Foo':
                        return Promise.resolve({
                            machineName: 'Foo',
                            majorVersion: 1,
                            minorVersion: 0,
                            patchVersion: 1,
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
                            ],
                            preloadedJs: [
                                {
                                    path: 'script.js'
                                }
                            ]
                        });
                    case 'Bar':
                        return Promise.resolve({
                            machineName: 'Bar',
                            majorVersion: 1,
                            minorVersion: 0,
                            patchVersion: 1,
                            preloadedDependencies: [
                                {
                                    machineName: 'Jaz',
                                    majorVersion: 1,
                                    minorVersion: 0
                                }
                            ],
                            preloadedJs: [
                                {
                                    path: 'script.js'
                                }
                            ]
                        });
                    case 'Baz':
                        return Promise.resolve({
                            machineName: 'Baz',
                            majorVersion: 1,
                            minorVersion: 0,
                            patchVersion: 1,
                            preloadedDependencies: [
                                {
                                    machineName: 'Jaz',
                                    majorVersion: 1,
                                    minorVersion: 0
                                }
                            ],
                            preloadedJs: [
                                {
                                    path: 'script.js'
                                }
                            ]
                        });
                    case 'Jaz':
                        return new Promise((res) =>
                            setTimeout(
                                () =>
                                    res({
                                        machineName: 'Jaz',
                                        majorVersion: 1,
                                        minorVersion: 0,
                                        patchVersion: 1,
                                        preloadedDependencies: [
                                            {
                                                machineName: 'Bar',
                                                majorVersion: 1,
                                                minorVersion: 0
                                            }
                                        ],
                                        preloadedJs: [
                                            {
                                                path: 'script.js'
                                            }
                                        ]
                                    }),
                                10
                            )
                        );
                    default:
                        throw new Error('unspecified');
                }
            },
            getSemantics: () => Promise.resolve({})
        });

        h5pEditor.libraryManager = libraryManager;

        return h5pEditor.getLibraryData('Foo', '1', '0').then((libraryData) => {
            expect(libraryData.javascript).toEqual([
                '/h5p/libraries/Jaz-1.0/script.js?version=1.0.1',
                '/h5p/libraries/Bar-1.0/script.js?version=1.0.1',
                '/h5p/libraries/Baz-1.0/script.js?version=1.0.1',
                '/h5p/libraries/Foo-1.0/script.js?version=1.0.1'
            ]);
        });
    });

    it('throws a helpful error message when using an uninstalled library name', async () => {
        await withDir(
            async ({ path: tempDirPath }) => {
                const h5pEditor = new H5PEditor(
                    null,
                    new H5PConfig(null),
                    new FileLibraryStorage(tempDirPath),
                    null,
                    null
                );

                expect(
                    h5pEditor.getLibraryData('Foo', '1', '2')
                ).rejects.toThrow('library-not-found');
            },
            { keep: false, unsafeCleanup: true }
        );
    });
});
