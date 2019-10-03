import H5PPlayer from '../src/H5PPlayer';

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
        const libraryLoader = (name, maj, min) =>
            ({
                Bar21: {
                    preloadedCss: [{ path: 'bar.css' }],
                    preloadedJs: [{ path: 'bar.js' }]
                },
                Foo42: {
                    preloadedCss: [{ path: 'foo1.css' }, { path: 'foo2.css' }],
                    preloadedJs: [{ path: 'foo1.js' }, { path: 'foo2.js' }]
                }
            }[name + maj + min]);

        return new H5PPlayer(libraryLoader, undefined, undefined, undefined)
            .useRenderer(model => model)
            .render(contentId, contentObject, h5pObject as any)
            .then(model => {
                expect((model as any).styles.slice(2)).toEqual([
                    '/h5p/libraries/Foo-4.2/foo1.css',
                    '/h5p/libraries/Foo-4.2/foo2.css',
                    '/h5p/libraries/Bar-2.1/bar.css'
                ]);
                expect((model as any).scripts.slice(8)).toEqual([
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
        const libraryLoader = (name, maj, min) =>
            new Promise(resolve => {
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
                            }[name + maj + min]
                        ),
                    100
                );
            });

        return new H5PPlayer(
            libraryLoader as any,
            undefined,
            undefined,
            undefined
        )
            .useRenderer(model => model)
            .render(contentId, contentObject, h5pObject as any)
            .then(model => {
                expect((model as any).styles.slice(2)).toEqual([
                    '/h5p/libraries/Foo-4.2/foo1.css',
                    '/h5p/libraries/Foo-4.2/foo2.css',
                    '/h5p/libraries/Bar-2.1/bar.css'
                ]);
                expect((model as any).scripts.slice(8)).toEqual([
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
        const libraryLoader = (name, maj, min) =>
            new Promise(resolve => {
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
                            }[name + maj + min]
                        ),
                    100
                );
            });

        return new H5PPlayer(
            libraryLoader as any,
            undefined,
            undefined,
            undefined
        )
            .useRenderer(model => model)
            .render(contentId, contentObject, h5pObject as any)
            .then(model => {
                expect((model as any).styles.slice(2)).toEqual([
                    '/h5p/libraries/Baz-3.3/baz.css',
                    '/h5p/libraries/Bar-2.1/bar.css',
                    '/h5p/libraries/Foo-4.2/foo.css'
                ]);
                expect((model as any).scripts.slice(8)).toEqual([
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
        const libraryLoader = (name, maj, min) =>
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
            }[name + maj + min]);

        return new H5PPlayer(libraryLoader, undefined, undefined, undefined)
            .useRenderer(model => model)
            .render(contentId, contentObject, h5pObject as any)
            .then(model => {
                expect((model as any).styles.slice(2)).toEqual([
                    '/h5p/libraries/Baz-3.3/baz.css',
                    '/h5p/libraries/Bar-2.1/bar.css',
                    '/h5p/libraries/Foo-4.2/foo.css'
                ]);
                expect((model as any).scripts.slice(8)).toEqual([
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
        const libraryLoader = (name, maj, min) =>
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
            }[name + maj + min]);

        return new H5PPlayer(libraryLoader, undefined, undefined, undefined)
            .useRenderer(model => model)
            .render(contentId, contentObject, h5pObject as any)
            .then(model => {
                expect((model as any).styles.slice(2)).toEqual([
                    '/h5p/libraries/Baz-3.3/baz.css',
                    '/h5p/libraries/Bar-2.1/bar.css',
                    '/h5p/libraries/Foo-4.2/foo.css'
                ]);
                expect((model as any).scripts.slice(8)).toEqual([
                    '/h5p/libraries/Baz-3.3/baz.js',
                    '/h5p/libraries/Bar-2.1/bar.js',
                    '/h5p/libraries/Foo-4.2/foo.js'
                ]);
            });
    });

    it('configures urls', () => {
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
        const libraryLoader = (name, maj, min) => {
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
            }[name + maj + min];
        };

        const h5p = new H5PPlayer(
            libraryLoader,
            {
                baseUrl: '/baseUrl',
                libraryUrl: `/libraryUrl`,
                scriptUrl: `/scriptUrl`,
                stylesUrl: `/stylesUrl`
            },
            undefined,
            undefined
        );

        return h5p
            .useRenderer(model => model)
            .render(contentId, contentObject, h5pObject as any)
            .then(model => {
                expect((model as any).styles.slice(2)).toEqual([
                    '/libraryUrl/Baz-3.3/baz.css',
                    '/libraryUrl/Bar-2.1/bar.css',
                    '/libraryUrl/Foo-4.2/foo.css'
                ]);

                expect(h5p.coreScripts()).toEqual([
                    '/scriptUrl/jquery.js',
                    '/scriptUrl/h5p.js',
                    '/scriptUrl/h5p-event-dispatcher.js',
                    '/scriptUrl/h5p-x-api-event.js',
                    '/scriptUrl/h5p-x-api.js',
                    '/scriptUrl/h5p-content-type.js',
                    '/scriptUrl/h5p-confirmation-dialog.js',
                    '/scriptUrl/h5p-action-bar.js'
                ]);

                expect(h5p.coreStyles()).toEqual([
                    '/stylesUrl/h5p.css',
                    '/stylesUrl/h5p-confirmation-dialog.css'
                ]);

                expect(
                    h5p.generateIntegration('contentId', {}, {} as any).url
                ).toBe('/baseUrl');
            });
    });
});
