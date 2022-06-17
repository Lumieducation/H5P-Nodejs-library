import H5PPlayer from '../src/H5PPlayer';
import H5PConfig from '../src/implementation/H5PConfig';
import { ILibraryName, ILibraryMetadata } from '../src/types';
import User from './User';

describe('Rendering the HTML page', () => {
    it('uses default renderer and integration values', async () => {
        const contentId = 'foo';
        const contentObject = {
            my: 'content'
        };
        const h5pObject = {};
        const config = new H5PConfig(undefined);
        const player = new H5PPlayer(undefined, undefined, config);
        const html = await player.render(contentId, new User(), 'en', {
            parametersOverride: contentObject,
            metadataOverride: h5pObject as any
        });
        expect(html).toMatchSnapshot();
    });

    it('resolves the main library', () => {
        const contentId = 'foo';
        const contentObject = {};
        const h5pObject = {
            mainLibrary: 'Foo',
            preloadedDependencies: [
                {
                    machineName: 'Bar',
                    majorVersion: 1,
                    minorVersion: 0
                },
                {
                    machineName: 'Foo',
                    majorVersion: 4,
                    minorVersion: 2
                }
            ]
        };

        const mockLibraryStorage: any = {
            getLibrary: async (libName: ILibraryName) => ({})
        };

        return new H5PPlayer(
            mockLibraryStorage,
            undefined,
            new H5PConfig(undefined)
        )
            .setRenderer((model) => model)
            .render(contentId, new User(), 'en', {
                parametersOverride: contentObject,
                metadataOverride: h5pObject as any
            })
            .then((model) => {
                expect(
                    (model as any).integration.contents['cid-foo'].library
                ).toBe('Foo 4.2');
            });
    });

    it('includes custom scripts and styles', async () => {
        const contentId = 'foo';
        const contentObject = {};
        const h5pObject = {};

        const mockLibraryStorage: any = {
            getLibrary: async (libName: ILibraryName) => ({})
        };

        const player = new H5PPlayer(
            mockLibraryStorage,
            undefined,
            new H5PConfig(undefined),
            undefined,
            undefined,
            undefined,
            {
                customization: {
                    global: {
                        scripts: ['/test.js'],
                        styles: ['/test.css']
                    }
                }
            }
        );
        player.setRenderer((mod) => mod);
        const model = await player.render(contentId, new User(), 'en', {
            parametersOverride: contentObject,
            metadataOverride: h5pObject as any
        });

        expect((model as any).scripts.includes('/test.js')).toEqual(true);
        expect((model as any).styles.includes('/test.css')).toEqual(true);
    });

    it('includes custom integration', () => {
        const contentId = 'foo';
        const contentObject = {};
        const h5pObject = {};

        return new H5PPlayer(undefined, undefined, new H5PConfig(undefined), {
            integration: 'test'
        } as any)
            .setRenderer((model) => model)
            .render(contentId, new User(), 'en', {
                parametersOverride: contentObject,
                metadataOverride: h5pObject as any
            })
            .then((model) => {
                expect((model as any).integration.integration).toBe('test');
            });
    });

    it('includes custom scripts and styles in the generated html', async () => {
        const contentId = 'foo';
        const contentObject = {
            my: 'content'
        };
        const h5pObject = {};
        const config = new H5PConfig(undefined);

        const html = await new H5PPlayer(
            undefined,
            undefined,
            new H5PConfig(undefined),
            undefined,
            undefined,
            undefined,
            {
                customization: {
                    global: {
                        scripts: ['/test.js'],
                        styles: ['/test.css']
                    }
                }
            }
        ).render(contentId, new User(), 'en', {
            parametersOverride: contentObject,
            metadataOverride: h5pObject as any
        });
        expect(html).toMatchSnapshot();
    });

    it('includes custom scripts and styles for certain content types', async () => {
        const contentId = 'foo';
        const contentObject = {};
        const h5pObject = {
            mainLibrary: 'Foo',
            preloadedDependencies: [
                {
                    machineName: 'Foo',
                    majorVersion: 1,
                    minorVersion: 0
                }
            ]
        };

        const mockLibraryStorage: any = {
            getLibrary: async (
                libName: ILibraryName
            ): Promise<ILibraryMetadata> => ({
                machineName: 'Foo',
                majorVersion: 1,
                minorVersion: 0,
                patchVersion: 0,
                runnable: 1,
                title: 'Foo',
                preloadedCss: [
                    { path: 'preload1.css' },
                    { path: 'preload2.css' }
                ],
                preloadedJs: [{ path: 'preload1.js' }, { path: 'preload2.js' }]
            })
        };

        const player = new H5PPlayer(
            mockLibraryStorage,
            undefined,
            new H5PConfig(undefined),
            undefined,
            undefined,
            undefined,
            {
                customization: {
                    alterLibraryFiles: (lib, scripts, styles) => {
                        if (
                            lib.machineName === 'Foo' &&
                            lib.majorVersion === 1 &&
                            lib.minorVersion === 0
                        ) {
                            return {
                                scripts: [
                                    ...scripts,
                                    'preload3.js',
                                    '/preload4.js',
                                    'https://example.com/script.js'
                                ],
                                styles: [styles[0], styles[1]]
                            };
                        }
                        return { scripts, styles };
                    }
                }
            }
        );
        player.setRenderer((mod) => mod);
        const model = await player.render(contentId, new User(), 'en', {
            parametersOverride: contentObject,
            metadataOverride: h5pObject as any
        });

        expect(
            (model as any).scripts.includes(
                '/h5p/libraries/Foo-1.0/preload1.js?version=1.0.0'
            )
        ).toBe(true);
        expect(
            (model as any).scripts.includes(
                '/h5p/libraries/Foo-1.0/preload2.js?version=1.0.0'
            )
        ).toBe(true);
        expect(
            (model as any).scripts.includes(
                '/h5p/libraries/Foo-1.0/preload3.js?version=1.0.0'
            )
        ).toBe(true);
        expect((model as any).scripts.includes('/preload4.js')).toBe(true);
        expect(
            (model as any).scripts.includes('https://example.com/script.js')
        ).toBe(true);

        expect(
            (model as any).styles.includes(
                '/h5p/libraries/Foo-1.0/preload2.css?version=1.0.0'
            )
        ).toBe(true);
    });

    it("doesn't include custom scripts and styles for other content types", async () => {
        const contentId = 'foo';
        const contentObject = {};
        const h5pObject = {
            mainLibrary: 'Foo',
            preloadedDependencies: [
                {
                    machineName: 'Foo',
                    majorVersion: 1,
                    minorVersion: 0
                }
            ]
        };

        const mockLibraryStorage: any = {
            getLibrary: async (
                libName: ILibraryName
            ): Promise<ILibraryMetadata> => ({
                machineName: 'Foo',
                majorVersion: 1,
                minorVersion: 0,
                patchVersion: 0,
                runnable: 1,
                title: 'Foo',
                preloadedCss: [
                    { path: 'preload1.css' },
                    { path: 'preload2.css' }
                ],
                preloadedJs: [{ path: 'preload1.js' }, { path: 'preload2.js' }]
            })
        };

        const player = new H5PPlayer(
            mockLibraryStorage,
            undefined,
            new H5PConfig(undefined),
            undefined,
            undefined,
            undefined,
            {
                customization: {
                    alterLibraryFiles: (lib, scripts, styles) => {
                        if (
                            lib.machineName === 'Bar' &&
                            lib.majorVersion === 1 &&
                            lib.minorVersion === 0
                        ) {
                            return {
                                scripts: [
                                    ...scripts,
                                    'preload3.js',
                                    'https://example.com/script.js'
                                ],
                                styles: [styles[1], styles[2]]
                            };
                        }
                        return { scripts, styles };
                    }
                }
            }
        );
        player.setRenderer((mod) => mod);
        const model = await player.render(contentId, new User(), 'en', {
            parametersOverride: contentObject,
            metadataOverride: h5pObject as any
        });

        expect(
            (model as any).scripts.includes(
                '/h5p/libraries/Foo-1.0/preload1.js?version=1.0.0'
            )
        ).toBe(true);
        expect(
            (model as any).scripts.includes(
                '/h5p/libraries/Foo-1.0/preload2.js?version=1.0.0'
            )
        ).toBe(true);

        expect(
            (model as any).styles.includes(
                '/h5p/libraries/Foo-1.0/preload1.css?version=1.0.0'
            )
        ).toBe(true);
        expect(
            (model as any).styles.includes(
                '/h5p/libraries/Foo-1.0/preload2.css?version=1.0.0'
            )
        ).toBe(true);
    });
});
