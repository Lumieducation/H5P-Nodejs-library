import LibraryName from './LibraryName';
import {
    ContentId,
    IAssets,
    IContentMetadata,
    IContentStorage,
    IEditorConfig,
    IInstalledLibrary,
    IIntegration,
    ILibraryName,
    ILibraryStorage
} from './types';
import UrlGenerator from './UrlGenerator';
import Logger from './helpers/Logger';
import { ContentMetadata } from './ContentMetadata';

import defaultTranslation from '../assets/translations/client/en.json';
import playerAssetList from './playerAssetList.json';
import player from './renderers/player';
import H5pError from './helpers/H5pError';

const log = new Logger('Player');

export default class H5PPlayer {
    /**
     *
     * @param libraryLoader a delegate that returns information about installed libraries
     * @param config the configuration object
     * @param integrationObjectDefaults (optional) the default values to use for the integration object
     * @param globalCustomScripts (optional) references to these scripts will be added when rendering content
     */
    constructor(
        private libraryStorage: ILibraryStorage,
        private contentStorage: IContentStorage,
        private config: IEditorConfig,
        private integrationObjectDefaults?: IIntegration,
        private globalCustomScripts: string[] = []
    ) {
        log.info('initialize');
        this.renderer = player;
        this.clientTranslation = defaultTranslation;
        this.urlGenerator = new UrlGenerator(config);
    }
    private clientTranslation: any;
    private renderer: any;
    private urlGenerator: UrlGenerator;

    /**
     * @returns a HTML string that you can insert into your page
     */
    public async render(
        contentId: ContentId,
        parameters?: any,
        metadata?: IContentMetadata
    ): Promise<string> {
        log.info(`rendering page for ${contentId}`);

        try {
            if (!parameters) {
                // tslint:disable-next-line: no-parameter-reassignment
                parameters = await this.contentStorage.getParameters(contentId);
            }
        } catch (error) {
            throw new H5pError('h5p-player:content-missing', {}, 404);
        }

        try {
            if (!metadata) {
                // tslint:disable-next-line: no-parameter-reassignment
                metadata = await this.contentStorage.getMetadata(contentId);
            }
        } catch (error) {
            throw new H5pError('h5p-player:content-missing', {}, 404);
        }

        const model = {
            contentId,
            customScripts: this.globalCustomScripts
                .map(script => `<script src="${script}"/>`)
                .join(),
            downloadPath: this.getDownloadPath(contentId),
            integration: this.generateIntegration(
                contentId,
                parameters,
                metadata
            ),
            scripts: this.listCoreScripts(),
            styles: this.listCoreStyles(),
            translations: {}
        };

        const libraries = {};
        await this.getLibraries(
            metadata.preloadedDependencies || [],
            libraries
        );
        this.aggregateAssets(
            metadata.preloadedDependencies || [],
            model,
            libraries
        );
        return this.renderer(model);
    }

    /**
     * Overrides the default renderer.
     * @param renderer
     */
    public setRenderer(renderer: any): H5PPlayer {
        log.info('changing renderer');
        this.renderer = renderer;
        return this;
    }

    private aggregateAssets(
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
            if (lib) {
                this.aggregateAssets(
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
            }
        });
    }

    private generateIntegration(
        contentId: ContentId,
        contentObject: any,
        h5pObject: IContentMetadata
    ): IIntegration {
        // see https://h5p.org/creating-your-own-h5p-plugin
        log.info(`generating integration for ${contentId}`);
        return {
            contents: {
                [`cid-${contentId}`]: {
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
                    library: ContentMetadata.toUbername(h5pObject)
                }
            },
            l10n: {
                H5P: this.clientTranslation
            },
            postUserStatistics: false,
            saveFreq: false,
            url: this.config.baseUrl,
            ...this.integrationObjectDefaults
        };
    }

    private getDownloadPath(contentId: ContentId): string {
        return this.urlGenerator.downloadPackage(contentId);
    }

    private async getLibraries(
        dependencies: ILibraryName[],
        loaded: object
    ): Promise<void> {
        log.verbose(
            `loading libraries from dependencies: ${dependencies
                .map(dep => LibraryName.toUberName(dep))
                .join(', ')}`
        );
        await Promise.all(
            dependencies.map(async dependency => {
                const name = dependency.machineName;
                const majVer = dependency.majorVersion;
                const minVer = dependency.minorVersion;

                const key = LibraryName.toUberName(dependency);
                if (key in loaded) {
                    return;
                }

                const lib = await this.getLibrary(name, majVer, minVer);
                if (lib) {
                    loaded[key] = lib;
                    await this.getLibraries(
                        lib.preloadedDependencies || [],
                        loaded
                    );
                }
            })
        );
    }

    private async getLibrary(
        machineName: string,
        majorVersion: number,
        minorVersion: number
    ): Promise<IInstalledLibrary> {
        log.verbose(
            `loading library ${machineName}-${majorVersion}.${minorVersion}`
        );
        return this.libraryStorage.getLibrary(
            new LibraryName(machineName, majorVersion, minorVersion)
        );
    }

    private listCoreScripts(): string[] {
        return playerAssetList.scripts.core.map(this.urlGenerator.coreFile);
    }

    private listCoreStyles(): string[] {
        return playerAssetList.styles.core.map(this.urlGenerator.coreFile);
    }
}
