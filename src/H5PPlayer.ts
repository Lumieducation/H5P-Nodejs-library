import {
    ContentId,
    IAssets,
    IDependency,
    IH5PJson,
    IIntegration,
    ILibraryJson,
    ILibraryLoader
} from './types';

import player from './renderers/player';
// tslint:disable-next-line: import-name
import defaultTranslation from './translations/en.player.json';

export default class H5PPlayer {
    constructor(
        libraryLoader: ILibraryLoader,
        urls: {
            baseUrl?: string;
            libraryUrl?: string;
            scriptUrl?: string;
            stylesUrl?: string;
        },
        integration: IIntegration,
        content: any,
        customScripts: string = ''
    ) {
        this.libraryLoader = libraryLoader;
        this.renderer = player;
        this.translation = defaultTranslation;

        this.integration = integration;
        this.content = content;
        this.customScripts = customScripts;

        this.urls = {
            baseUrl: '/h5p',
            libraryUrl: `/h5p/libraries`,
            scriptUrl: `/h5p/core/js`,
            stylesUrl: `/h5p/core/styles`,
            ...urls
        };

        this.baseUrl = this.urls.baseUrl;
        this.libraryUrl = this.urls.libraryUrl;
        this.stylesUrl = this.urls.stylesUrl;
        this.scriptUrl = this.urls.scriptUrl;
    }

    private baseUrl: string;
    private content: any;
    private customScripts: any;
    private integration: IIntegration;
    private libraryLoader: ILibraryLoader;
    private libraryUrl: string;
    private renderer: any;
    private scriptUrl: string;
    private stylesUrl: string;
    private translation: any;
    private urls: {
        baseUrl?: string;
        libraryUrl?: string;
        scriptUrl?: string;
        stylesUrl?: string;
    };

    public coreScripts(): string[] {
        return [
            'jquery.js',
            'h5p.js',
            'h5p-event-dispatcher.js',
            'h5p-x-api-event.js',
            'h5p-x-api.js',
            'h5p-content-type.js',
            'h5p-confirmation-dialog.js',
            'h5p-action-bar.js'
        ].map(file => `${this.scriptUrl}/${file}`);
    }

    public coreStyles(): string[] {
        return ['h5p.css', 'h5p-confirmation-dialog.css'].map(
            file => `${this.stylesUrl}/${file}`
        );
    }

    public generateIntegration(
        contentId: ContentId,
        contentObject: any,
        h5pObject: IH5PJson
    ): IIntegration {
        // see https://h5p.org/creating-your-own-h5p-plugin
        return {
            ...this.integration,
            contents: {
                [`cid-${contentId}`]: {
                    ...this.content,
                    contentUrl: `${this.baseUrl}/content/${contentId}/content`,
                    displayOptions: {
                        copy: false,
                        copyright: false,
                        embed: false,
                        export: false,
                        frame: false,
                        icon: false
                    },
                    fullScreen: false,
                    jsonContent: JSON.stringify(contentObject),
                    library: this.mainLibraryString(h5pObject)
                }
            },
            l10n: {
                H5P: this.translation
            },
            postUserStatistics: false,
            saveFreq: false,
            url: this.baseUrl
        };
    }

    public render(
        contentId: ContentId,
        contentObject: any,
        h5pObject: IH5PJson
    ): Promise<string> {
        const model = {
            contentId,
            customScripts: this.customScripts,
            integration: this.generateIntegration(
                contentId,
                contentObject,
                h5pObject
            ),
            scripts: this.coreScripts(),
            styles: this.coreStyles(),
            translations: {}
        };

        const libraries = {};
        return this.loadLibraries(
            h5pObject.preloadedDependencies || [],
            libraries
        ).then(() => {
            this.loadAssets(
                h5pObject.preloadedDependencies || [],
                model,
                libraries
            );
            return this.renderer(model);
        });
    }

    public useRenderer(renderer: any): H5PPlayer {
        this.renderer = renderer;
        return this;
    }

    private loadAssets(
        dependencies: IDependency[],
        assets: IAssets,
        libraries: object = {},
        loaded: object = {}
    ): void {
        dependencies.forEach(dependency => {
            const name = dependency.machineName;
            const majVer = dependency.majorVersion;
            const minVer = dependency.minorVersion;

            const key = `${name}-${majVer}.${minVer}`;
            if (key in loaded) return;

            loaded[key] = true;
            const lib = libraries[key];
            this.loadAssets(
                lib.preloadedDependencies || [],
                assets,
                libraries,
                loaded
            );
            const path = `${this.libraryUrl}/${key}`;
            (lib.preloadedCss || []).forEach(asset =>
                assets.styles.push(`${path}/${asset.path}`)
            );
            (lib.preloadedJs || []).forEach(script =>
                assets.scripts.push(`${path}/${script.path}`)
            );
        });
    }

    private loadLibraries(
        dependencies: IDependency[],
        loaded: object
    ): Promise<void> {
        return new Promise(resolve => {
            Promise.all(
                dependencies.map(
                    dependency =>
                        new Promise(rslv => {
                            const name = dependency.machineName;
                            const majVer = dependency.majorVersion;
                            const minVer = dependency.minorVersion;

                            const key = `${name}-${majVer}.${minVer}`;

                            if (key in loaded) return rslv();

                            return this.loadLibrary(name, majVer, minVer).then(
                                lib => {
                                    loaded[key] = lib;
                                    this.loadLibraries(
                                        lib.preloadedDependencies || [],
                                        loaded
                                    ).then(() => rslv());
                                }
                            );
                        })
                )
            ).then(() => resolve());
        });
    }

    private loadLibrary(
        machineName: string,
        majorVersion: number,
        minorVersion: number
    ): Promise<ILibraryJson> {
        return Promise.resolve(
            this.libraryLoader(machineName, majorVersion, minorVersion)
        );
    }

    private mainLibraryString(h5pObject: IH5PJson): string {
        const library = (h5pObject.preloadedDependencies || []).find(
            lib => lib.machineName === h5pObject.mainLibrary
        );

        if (!library) return undefined;

        const name = library.machineName;
        const majVer = library.majorVersion;
        const minVer = library.minorVersion;

        return `${name} ${majVer}.${minVer}`;
    }
}
