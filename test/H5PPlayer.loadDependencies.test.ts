import H5PPlayer from '../src/H5PPlayer';
import H5PConfig from '../src/implementation/H5PConfig';
import { ILibraryName } from '../src/types';

describe('Loading dependencies', () => {
    it('resolves main dependencies', () => {
        const contentId = 'foo';
        const contentObject = {};
        const h5pObject = {
            mainLibrary: 'Foo',
            preloadedDependencies: [
                {
                    machineName: 'Foo',
                    majorVersion: 4,
                    minorVersion: 2
                },
                {
                    machineName: 'Bar',
                    majorVersion: 2,
                    minorVersion: 1
                }
            ]
        };

        const mockLibraryStorage: any = {
            getLibrary: async (libName: ILibraryName) =>
                ({
                    Bar21: {
                        preloadedCss: [{ path: 'bar.css' }],
                        preloadedJs: [{ path: 'bar.js' }]
                    },
                    Foo42: {
                        preloadedCss: [
                            { path: 'foo1.css' },
                            { path: 'foo2.css' }
                        ],
                        preloadedJs: [{ path: 'foo1.js' }, { path: 'foo2.js' }]
                    }
                }[
                    libName.machineName +
                        libName.majorVersion +
                        libName.minorVersion
                ])
        };

        return new H5PPlayer(
            mockLibraryStorage,
            undefined,
            new H5PConfig(undefined),
            undefined,
            undefined
        )
            .setRenderer((model) => model)
            .render(contentId, contentObject, h5pObject as any)
            .then((model) => {
                expect((model as any).styles.slice(2)).toEqual([
                    '/h5p/libraries/Foo-4.2/foo1.css',
                    '/h5p/libraries/Foo-4.2/foo2.css',
                    '/h5p/libraries/Bar-2.1/bar.css'
                ]);
                expect((model as any).scripts.slice(9)).toEqual([
                    '/h5p/libraries/Foo-4.2/foo1.js',
                    '/h5p/libraries/Foo-4.2/foo2.js',
                    '/h5p/libraries/Bar-2.1/bar.js'
                ]);
            });
    });

    it('loads asynchronous dependencies', () => {
        const contentId = 'foo';
        const contentObject = {};
        const h5pObject = {
            mainLibrary: 'Foo',
            preloadedDependencies: [
                {
                    machineName: 'Foo',
                    majorVersion: 4,
                    minorVersion: 2
                },
                {
                    machineName: 'Bar',
                    majorVersion: 2,
                    minorVersion: 1
                }
            ]
        };
        const mockLibraryStorage: any = {
            getLibrary: (libName: ILibraryName) =>
                new Promise((resolve) => {
                    setTimeout(
                        () =>
                            resolve(
                                {
                                    Bar21: {
                                        preloadedCss: [{ path: 'bar.css' }],
                                        preloadedJs: [{ path: 'bar.js' }]
                                    },
                                    Foo42: {
                                        preloadedCss: [
                                            { path: 'foo1.css' },
                                            { path: 'foo2.css' }
                                        ],
                                        preloadedJs: [
                                            { path: 'foo1.js' },
                                            { path: 'foo2.js' }
                                        ]
                                    }
                                }[
                                    libName.machineName +
                                        libName.majorVersion +
                                        libName.minorVersion
                                ]
                            ),
                        100
                    );
                })
        };

        return new H5PPlayer(
            mockLibraryStorage,
            undefined,
            new H5PConfig(undefined),
            undefined,
            undefined
        )
            .setRenderer((model) => model)
            .render(contentId, contentObject, h5pObject as any)
            .then((model) => {
                expect((model as any).styles.slice(2)).toEqual([
                    '/h5p/libraries/Foo-4.2/foo1.css',
                    '/h5p/libraries/Foo-4.2/foo2.css',
                    '/h5p/libraries/Bar-2.1/bar.css'
                ]);
                expect((model as any).scripts.slice(9)).toEqual([
                    '/h5p/libraries/Foo-4.2/foo1.js',
                    '/h5p/libraries/Foo-4.2/foo2.js',
                    '/h5p/libraries/Bar-2.1/bar.js'
                ]);
            });
    });

    it('loads async dependencies in the correct order', () => {
        const contentId = 'foo';
        const contentObject = {};
        const h5pObject = {
            mainLibrary: 'Foo',
            preloadedDependencies: [
                {
                    machineName: 'Foo',
                    majorVersion: 4,
                    minorVersion: 2
                }
            ]
        };
        const mockLibraryStorage: any = {
            getLibrary: (libName: ILibraryName) =>
                new Promise((resolve) => {
                    setTimeout(
                        () =>
                            resolve(
                                {
                                    Bar21: {
                                        preloadedCss: [{ path: 'bar.css' }],
                                        preloadedDependencies: [
                                            {
                                                machineName: 'Baz',
                                                majorVersion: 3,
                                                minorVersion: 3
                                            }
                                        ],
                                        preloadedJs: [{ path: 'bar.js' }]
                                    },
                                    Baz33: {
                                        preloadedCss: [{ path: 'baz.css' }],
                                        preloadedJs: [{ path: 'baz.js' }]
                                    },
                                    Foo42: {
                                        preloadedCss: [{ path: 'foo.css' }],
                                        preloadedDependencies: [
                                            {
                                                machineName: 'Bar',
                                                majorVersion: 2,
                                                minorVersion: 1
                                            }
                                        ],
                                        preloadedJs: [{ path: 'foo.js' }]
                                    }
                                }[
                                    libName.machineName +
                                        libName.majorVersion +
                                        libName.minorVersion
                                ]
                            ),
                        100
                    );
                })
        };

        return new H5PPlayer(
            mockLibraryStorage,
            undefined,
            new H5PConfig(undefined),
            undefined,
            undefined
        )
            .setRenderer((model) => model)
            .render(contentId, contentObject, h5pObject as any)
            .then((model) => {
                expect((model as any).styles.slice(2)).toEqual([
                    '/h5p/libraries/Baz-3.3/baz.css',
                    '/h5p/libraries/Bar-2.1/bar.css',
                    '/h5p/libraries/Foo-4.2/foo.css'
                ]);
                expect((model as any).scripts.slice(9)).toEqual([
                    '/h5p/libraries/Baz-3.3/baz.js',
                    '/h5p/libraries/Bar-2.1/bar.js',
                    '/h5p/libraries/Foo-4.2/foo.js'
                ]);
            });
    });

    it('resolves deep dependencies', () => {
        const contentId = 'foo';
        const contentObject = {};
        const h5pObject = {
            mainLibrary: 'Foo',
            preloadedDependencies: [
                {
                    machineName: 'Foo',
                    majorVersion: 4,
                    minorVersion: 2
                }
            ]
        };
        const mockLibraryStorage: any = {
            getLibrary: async (libName: ILibraryName) =>
                ({
                    Bar21: {
                        preloadedCss: [{ path: 'bar.css' }],
                        preloadedDependencies: [
                            {
                                machineName: 'Baz',
                                majorVersion: 3,
                                minorVersion: 3
                            }
                        ],
                        preloadedJs: [{ path: 'bar.js' }]
                    },
                    Baz33: {
                        preloadedCss: [{ path: 'baz.css' }],

                        preloadedJs: [{ path: 'baz.js' }]
                    },
                    Foo42: {
                        preloadedCss: [{ path: 'foo.css' }],
                        preloadedDependencies: [
                            {
                                machineName: 'Bar',
                                majorVersion: 2,
                                minorVersion: 1
                            }
                        ],
                        preloadedJs: [{ path: 'foo.js' }]
                    }
                }[
                    libName.machineName +
                        libName.majorVersion +
                        libName.minorVersion
                ])
        };

        return new H5PPlayer(
            mockLibraryStorage,
            undefined,
            new H5PConfig(undefined),
            undefined,
            undefined
        )
            .setRenderer((model) => model)
            .render(contentId, contentObject, h5pObject as any)
            .then((model) => {
                expect((model as any).styles.slice(2)).toEqual([
                    '/h5p/libraries/Baz-3.3/baz.css',
                    '/h5p/libraries/Bar-2.1/bar.css',
                    '/h5p/libraries/Foo-4.2/foo.css'
                ]);
                expect((model as any).scripts.slice(9)).toEqual([
                    '/h5p/libraries/Baz-3.3/baz.js',
                    '/h5p/libraries/Bar-2.1/bar.js',
                    '/h5p/libraries/Foo-4.2/foo.js'
                ]);
            });
    });

    it('de-duplicates dependencies', () => {
        const contentId = 'foo';
        const contentObject = {};
        const h5pObject = {
            mainLibrary: 'Foo',
            preloadedDependencies: [
                {
                    machineName: 'Foo',
                    majorVersion: 4,
                    minorVersion: 2
                }
            ]
        };
        const mockLibraryStorage: any = {
            getLibrary: (libName: ILibraryName) =>
                ({
                    Bar21: {
                        preloadedCss: [{ path: 'bar.css' }],
                        preloadedDependencies: [
                            {
                                machineName: 'Baz',
                                majorVersion: 3,
                                minorVersion: 3
                            }
                        ],
                        preloadedJs: [{ path: 'bar.js' }]
                    },
                    Baz33: {
                        preloadedCss: [{ path: 'baz.css' }],
                        preloadedJs: [{ path: 'baz.js' }]
                    },
                    Foo42: {
                        preloadedCss: [{ path: 'foo.css' }],
                        preloadedDependencies: [
                            {
                                machineName: 'Bar',
                                majorVersion: 2,
                                minorVersion: 1
                            },
                            {
                                machineName: 'Baz',
                                majorVersion: 3,
                                minorVersion: 3
                            }
                        ],
                        preloadedJs: [{ path: 'foo.js' }]
                    }
                }[
                    libName.machineName +
                        libName.majorVersion +
                        libName.minorVersion
                ])
        };

        return new H5PPlayer(
            mockLibraryStorage,
            undefined,
            new H5PConfig(undefined),
            undefined,
            undefined
        )
            .setRenderer((model) => model)
            .render(contentId, contentObject, h5pObject as any)
            .then((model) => {
                expect((model as any).styles.slice(2)).toEqual([
                    '/h5p/libraries/Baz-3.3/baz.css',
                    '/h5p/libraries/Bar-2.1/bar.css',
                    '/h5p/libraries/Foo-4.2/foo.css'
                ]);
                expect((model as any).scripts.slice(9)).toEqual([
                    '/h5p/libraries/Baz-3.3/baz.js',
                    '/h5p/libraries/Bar-2.1/bar.js',
                    '/h5p/libraries/Foo-4.2/foo.js'
                ]);
            });
    });

    it('configures urls', async () => {
        const contentId = 'foo';
        const contentObject = {};
        const h5pObject = {
            mainLibrary: 'Foo',
            preloadedDependencies: [
                {
                    machineName: 'Foo',
                    majorVersion: 4,
                    minorVersion: 2
                }
            ]
        };
        const mockLibraryStorage: any = {
            getLibrary: (libName: ILibraryName) => {
                return {
                    Bar21: {
                        preloadedCss: [{ path: 'bar.css' }],
                        preloadedDependencies: [
                            {
                                machineName: 'Baz',
                                majorVersion: 3,
                                minorVersion: 3
                            }
                        ],
                        preloadedJs: [{ path: 'bar.js' }]
                    },
                    Baz33: {
                        preloadedCss: [{ path: 'baz.css' }],
                        preloadedJs: [{ path: 'baz.js' }]
                    },
                    Foo42: {
                        preloadedCss: [{ path: 'foo.css' }],
                        preloadedDependencies: [
                            {
                                machineName: 'Bar',
                                majorVersion: 2,
                                minorVersion: 1
                            },
                            {
                                machineName: 'Baz',
                                majorVersion: 3,
                                minorVersion: 3
                            }
                        ],
                        preloadedJs: [{ path: 'foo.js' }]
                    }
                }[
                    libName.machineName +
                        libName.majorVersion +
                        libName.minorVersion
                ];
            }
        };

        const h5p = new H5PPlayer(
            mockLibraryStorage,
            undefined,
            new H5PConfig(undefined, {
                baseUrl: '/baseUrl',
                coreUrl: '/coreUrl',
                librariesUrl: `/libraryUrl`
            }),
            undefined,
            undefined
        );

        h5p.setRenderer((m) => m);
        const model: any = await h5p.render(
            contentId,
            contentObject,
            h5pObject as any
        );
        expect(model.scripts).toEqual([
            '/baseUrl/coreUrl/js/jquery.js',
            '/baseUrl/coreUrl/js/h5p.js',
            '/baseUrl/coreUrl/js/h5p-event-dispatcher.js',
            '/baseUrl/coreUrl/js/h5p-x-api-event.js',
            '/baseUrl/coreUrl/js/h5p-x-api.js',
            '/baseUrl/coreUrl/js/h5p-content-type.js',
            '/baseUrl/coreUrl/js/h5p-confirmation-dialog.js',
            '/baseUrl/coreUrl/js/h5p-action-bar.js',
            '/baseUrl/coreUrl/js/request-queue.js',
            '/baseUrl/libraryUrl/Baz-3.3/baz.js',
            '/baseUrl/libraryUrl/Bar-2.1/bar.js',
            '/baseUrl/libraryUrl/Foo-4.2/foo.js'
        ]);

        expect(model.styles).toEqual([
            '/baseUrl/coreUrl/styles/h5p.css',
            '/baseUrl/coreUrl/styles/h5p-confirmation-dialog.css',
            '/baseUrl/libraryUrl/Baz-3.3/baz.css',
            '/baseUrl/libraryUrl/Bar-2.1/bar.css',
            '/baseUrl/libraryUrl/Foo-4.2/foo.css'
        ]);

        expect(model.integration.url).toBe('/baseUrl');
    });
});
