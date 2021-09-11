import H5PPlayer from '../src/H5PPlayer';
import H5PConfig from '../src/implementation/H5PConfig';
import { ILibraryName } from '../src/types';
import User from './User';

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
                        machineName: 'Bar',
                        majorVersion: 2,
                        minorVersion: 1,
                        patchVersion: 0,
                        preloadedCss: [{ path: 'bar.css' }],
                        preloadedJs: [{ path: 'bar.js' }]
                    },
                    Foo42: {
                        machineName: 'Foo',
                        majorVersion: 4,
                        minorVersion: 2,
                        patchVersion: 0,
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
            .render(contentId, new User(), 'en', {
                parametersOverride: contentObject,
                metadataOverride: h5pObject as any
            })
            .then((model) => {
                expect((model as any).styles.slice(3)).toEqual([
                    '/h5p/libraries/Foo-4.2/foo1.css?version=4.2.0',
                    '/h5p/libraries/Foo-4.2/foo2.css?version=4.2.0',
                    '/h5p/libraries/Bar-2.1/bar.css?version=2.1.0'
                ]);
                expect((model as any).scripts.slice(9)).toEqual([
                    '/h5p/libraries/Foo-4.2/foo1.js?version=4.2.0',
                    '/h5p/libraries/Foo-4.2/foo2.js?version=4.2.0',
                    '/h5p/libraries/Bar-2.1/bar.js?version=2.1.0'
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
                                        machineName: 'Bar',
                                        majorVersion: 2,
                                        minorVersion: 1,
                                        patchVersion: 0,
                                        preloadedCss: [{ path: 'bar.css' }],
                                        preloadedJs: [{ path: 'bar.js' }]
                                    },
                                    Foo42: {
                                        machineName: 'Foo',
                                        majorVersion: 4,
                                        minorVersion: 2,
                                        patchVersion: 0,
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
            .render(contentId, new User(), 'en', {
                parametersOverride: contentObject,
                metadataOverride: h5pObject as any
            })
            .then((model) => {
                expect((model as any).styles.slice(3)).toEqual([
                    '/h5p/libraries/Foo-4.2/foo1.css?version=4.2.0',
                    '/h5p/libraries/Foo-4.2/foo2.css?version=4.2.0',
                    '/h5p/libraries/Bar-2.1/bar.css?version=2.1.0'
                ]);
                expect((model as any).scripts.slice(9)).toEqual([
                    '/h5p/libraries/Foo-4.2/foo1.js?version=4.2.0',
                    '/h5p/libraries/Foo-4.2/foo2.js?version=4.2.0',
                    '/h5p/libraries/Bar-2.1/bar.js?version=2.1.0'
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
                                        machineName: 'Bar',
                                        majorVersion: 2,
                                        minorVersion: 1,
                                        patchVersion: 0,
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
                                        machineName: 'Baz',
                                        majorVersion: 3,
                                        minorVersion: 3,
                                        patchVersion: 0,
                                        preloadedCss: [{ path: 'baz.css' }],
                                        preloadedJs: [{ path: 'baz.js' }]
                                    },
                                    Foo42: {
                                        machineName: 'Foo',
                                        majorVersion: 4,
                                        minorVersion: 2,
                                        patchVersion: 0,
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
            .render(contentId, new User(), 'en', {
                parametersOverride: contentObject,
                metadataOverride: h5pObject as any
            })
            .then((model) => {
                expect((model as any).styles.slice(3)).toEqual([
                    '/h5p/libraries/Baz-3.3/baz.css?version=3.3.0',
                    '/h5p/libraries/Bar-2.1/bar.css?version=2.1.0',
                    '/h5p/libraries/Foo-4.2/foo.css?version=4.2.0'
                ]);
                expect((model as any).scripts.slice(9)).toEqual([
                    '/h5p/libraries/Baz-3.3/baz.js?version=3.3.0',
                    '/h5p/libraries/Bar-2.1/bar.js?version=2.1.0',
                    '/h5p/libraries/Foo-4.2/foo.js?version=4.2.0'
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
                        machineName: 'Bar',
                        majorVersion: 2,
                        minorVersion: 1,
                        patchVersion: 0,
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
                        machineName: 'Baz',
                        majorVersion: 3,
                        minorVersion: 3,
                        patchVersion: 0,
                        preloadedCss: [{ path: 'baz.css' }],

                        preloadedJs: [{ path: 'baz.js' }]
                    },
                    Foo42: {
                        machineName: 'Foo',
                        majorVersion: 4,
                        minorVersion: 2,
                        patchVersion: 0,
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
            .render(contentId, new User(), 'en', {
                parametersOverride: contentObject,
                metadataOverride: h5pObject as any
            })
            .then((model) => {
                expect((model as any).styles.slice(3)).toEqual([
                    '/h5p/libraries/Baz-3.3/baz.css?version=3.3.0',
                    '/h5p/libraries/Bar-2.1/bar.css?version=2.1.0',
                    '/h5p/libraries/Foo-4.2/foo.css?version=4.2.0'
                ]);
                expect((model as any).scripts.slice(9)).toEqual([
                    '/h5p/libraries/Baz-3.3/baz.js?version=3.3.0',
                    '/h5p/libraries/Bar-2.1/bar.js?version=2.1.0',
                    '/h5p/libraries/Foo-4.2/foo.js?version=4.2.0'
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
                        machineName: 'Bar',
                        majorVersion: 2,
                        minorVersion: 1,
                        patchVersion: 0,
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
                        machineName: 'Baz',
                        majorVersion: 3,
                        minorVersion: 3,
                        patchVersion: 0,
                        preloadedCss: [{ path: 'baz.css' }],
                        preloadedJs: [{ path: 'baz.js' }]
                    },
                    Foo42: {
                        machineName: 'Foo',
                        majorVersion: 4,
                        minorVersion: 2,
                        patchVersion: 0,
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
            .render(contentId, new User(), 'en', {
                parametersOverride: contentObject,
                metadataOverride: h5pObject as any
            })
            .then((model) => {
                expect((model as any).styles.slice(3)).toEqual([
                    '/h5p/libraries/Baz-3.3/baz.css?version=3.3.0',
                    '/h5p/libraries/Bar-2.1/bar.css?version=2.1.0',
                    '/h5p/libraries/Foo-4.2/foo.css?version=4.2.0'
                ]);
                expect((model as any).scripts.slice(9)).toEqual([
                    '/h5p/libraries/Baz-3.3/baz.js?version=3.3.0',
                    '/h5p/libraries/Bar-2.1/bar.js?version=2.1.0',
                    '/h5p/libraries/Foo-4.2/foo.js?version=4.2.0'
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
            getLibrary: (libName: ILibraryName) =>
                ({
                    Bar21: {
                        machineName: 'Bar',
                        majorVersion: 2,
                        minorVersion: 1,
                        patchVersion: 0,
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
                        machineName: 'Baz',
                        majorVersion: 3,
                        minorVersion: 3,
                        patchVersion: 0,
                        preloadedCss: [{ path: 'baz.css' }],
                        preloadedJs: [{ path: 'baz.js' }]
                    },
                    Foo42: {
                        machineName: 'Foo',
                        majorVersion: 4,
                        minorVersion: 2,
                        patchVersion: 0,
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
        const config = new H5PConfig(undefined, {
            baseUrl: '/baseUrl',
            coreUrl: '/coreUrl',
            librariesUrl: `/libraryUrl`
        });
        const h5p = new H5PPlayer(mockLibraryStorage, undefined, config);

        h5p.setRenderer((m) => m);
        const model: any = await h5p.render(contentId, new User(), 'en', {
            parametersOverride: contentObject,
            metadataOverride: h5pObject as any
        });
        expect(model.scripts).toEqual([
            `/baseUrl/coreUrl/js/jquery.js?version=${config.h5pVersion}`,
            `/baseUrl/coreUrl/js/h5p.js?version=${config.h5pVersion}`,
            `/baseUrl/coreUrl/js/h5p-event-dispatcher.js?version=${config.h5pVersion}`,
            `/baseUrl/coreUrl/js/h5p-x-api-event.js?version=${config.h5pVersion}`,
            `/baseUrl/coreUrl/js/h5p-x-api.js?version=${config.h5pVersion}`,
            `/baseUrl/coreUrl/js/h5p-content-type.js?version=${config.h5pVersion}`,
            `/baseUrl/coreUrl/js/h5p-confirmation-dialog.js?version=${config.h5pVersion}`,
            `/baseUrl/coreUrl/js/h5p-action-bar.js?version=${config.h5pVersion}`,
            `/baseUrl/coreUrl/js/request-queue.js?version=${config.h5pVersion}`,
            `/baseUrl/libraryUrl/Baz-3.3/baz.js?version=3.3.0`,
            `/baseUrl/libraryUrl/Bar-2.1/bar.js?version=2.1.0`,
            `/baseUrl/libraryUrl/Foo-4.2/foo.js?version=4.2.0`
        ]);

        expect(model.styles).toEqual([
            `/baseUrl/coreUrl/styles/h5p.css?version=${config.h5pVersion}`,
            `/baseUrl/coreUrl/styles/h5p-confirmation-dialog.css?version=${config.h5pVersion}`,
            `/baseUrl/coreUrl/styles/h5p-core-button.css?version=${config.h5pVersion}`,
            `/baseUrl/libraryUrl/Baz-3.3/baz.css?version=3.3.0`,
            `/baseUrl/libraryUrl/Bar-2.1/bar.css?version=2.1.0`,
            `/baseUrl/libraryUrl/Foo-4.2/foo.css?version=4.2.0`
        ]);

        expect(model.integration.url).toBe('/baseUrl');
    });
});
