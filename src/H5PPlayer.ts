import LibraryName from './LibraryName';
import {
    ContentId,
    IAssets,
    IContentMetadata,
    IEditorConfig,
    IInstalledLibrary,
    IIntegration,
    ILibraryLoader,
    ILibraryName
} from './types';
import UrlGenerator from './UrlGenerator';

import defaultTranslation from '../assets/translations/client/en.json';
import playerAssetList from './playerAssetList.json';
import player from './renderers/player';

import Logger from './helpers/Logger';

const log = new Logger('Player');

export default class H5PPlayer {
    constructor(
        private libraryLoader: ILibraryLoader,
        private config: IEditorConfig,
        private integration: IIntegration,
        private content: any,
        private customScripts: string = ''
    ) {
        log.info('initialize');
        this.renderer = player;
        this.translation = defaultTranslation;
        this.urlGenerator = new UrlGenerator(config);
    }

    private renderer: any;
    private translation: any;
    private urlGenerator: UrlGenerator;

    public generateIntegration(
        contentId: ContentId,
        contentObject: any,
        h5pObject: IContentMetadata
    ): IIntegration {
        // see https://h5p.org/creating-your-own-h5p-plugin
        log.info(`generating integration for ${contentId}`);
        return {
            contents: {
                [`cid-${contentId}`]: {
                    ...this.content,
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
                    library: this.getMainLibraryUbername(h5pObject)
                }
            },
            l10n: {
                H5P: this.translation
            },
            postUserStatistics: false,
            saveFreq: false,
            url: this.config.baseUrl,
            ...this.integration
        };
    }

    public getCoreScripts(): string[] {
        return playerAssetList.scripts.core.map(this.urlGenerator.coreFile);
    }

    public getCoreStyles(): string[] {
        return playerAssetList.styles.core.map(this.urlGenerator.coreFile);
    }

    public render(
        contentId: ContentId,
        contentObject: any,
        h5pObject: IContentMetadata
    ): Promise<string> {
        log.info(`rendering page for ${contentId}`);
        const model = {
            contentId,
            customScripts: this.customScripts,
            downloadPath: this.generateDownloadPath(contentId),
            integration: this.generateIntegration(
                contentId,
                contentObject,
                h5pObject
            ),
            scripts: this.getCoreScripts(),
            styles: this.getCoreStyles(),
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
        log.info('changing renderer');
        this.renderer = renderer;
        return this;
    }

    private generateDownloadPath(contentId: ContentId): string {
        return this.urlGenerator.downloadPackage(contentId);
    }

    private getMainLibraryUbername(h5pObject: IContentMetadata): string {
        const library = (h5pObject.preloadedDependencies || []).find(
            lib => lib.machineName === h5pObject.mainLibrary
        );

        if (!library) return undefined;

        return LibraryName.toUberName(library, { useWhitespace: true });
    }

    private loadAssets(
        dependencies: ILibraryName[],
        assets: IAssets,
        libraries: object = {},
        loaded: object = {}
    ): void {
        log.verbose(
            `loading assets from dependencies: ${dependencies
                .map(dep => LibraryName.toUberName(dep))
                .join(', ')}`
        );
        dependencies.forEach(dependency => {
            const key = LibraryName.toUberName(dependency);
            if (key in loaded) return;

            loaded[key] = true;
            const lib = libraries[key];
            this.loadAssets(
                lib.preloadedDependencies || [],
                assets,
                libraries,
                loaded
            );
            (lib.preloadedCss || []).forEach(asset =>
                assets.styles.push(
                    this.urlGenerator.libraryFile(dependency, asset.path)
                )
            );
            (lib.preloadedJs || []).forEach(script =>
                assets.scripts.push(
                    this.urlGenerator.libraryFile(dependency, script.path)
                )
            );
        });
    }

    private loadLibraries(
        dependencies: ILibraryName[],
        loaded: object
    ): Promise<void> {
        log.verbose(
            `loading libraries from dependencies: ${dependencies
                .map(dep => LibraryName.toUberName(dep))
                .join(', ')}`
        );
        return new Promise(resolve => {
            Promise.all(
                dependencies.map(
                    dependency =>
                        new Promise(rslv => {
                            const name = dependency.machineName;
                            const majVer = dependency.majorVersion;
                            const minVer = dependency.minorVersion;

                            const key = LibraryName.toUberName(dependency);

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
    ): Promise<IInstalledLibrary> {
        log.verbose(
            `loading library ${machineName}-${majorVersion}.${minorVersion}`
        );
        return Promise.resolve(
            this.libraryLoader(machineName, majorVersion, minorVersion)
        );
    }
}
