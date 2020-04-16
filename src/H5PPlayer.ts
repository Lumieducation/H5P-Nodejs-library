import LibraryName from './LibraryName';
import {
    ContentId,
    ContentParameters,
    IAssets,
    IContentMetadata,
    IContentStorage,
    IH5PConfig,
    IInstalledLibrary,
    IIntegration,
    ILibraryName,
    ILibraryStorage,
    IPlayerModel
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
     * @param libraryStorage the storage for libraries (can be read only)
     * @param contentStorage the storage for content (can be read only)
     * @param config the configuration object
     * @param integrationObjectDefaults (optional) the default values to use for the integration object
     * @param globalCustomScripts (optional) references to these scripts will be added when rendering content
     */
    constructor(
        private libraryStorage: ILibraryStorage,
        private contentStorage: IContentStorage,
        private config: IH5PConfig,
        private integrationObjectDefaults?: IIntegration,
        private globalCustomScripts: string[] = []
    ) {
        log.info('initialize');
        this.renderer = player;
        this.clientTranslation = defaultTranslation;
        this.urlGenerator = new UrlGenerator(config);
    }
    private clientTranslation: any;
    private renderer: (model: IPlayerModel) => string | any;
    private urlGenerator: UrlGenerator;

    /**
     * Creates a frame for displaying H5P content. You can customize this frame by calling setRenderer(...).
     * It normally is enough to call this method with the content id. Only call it with parameters and metadata
     * if don't want to use the IContentStorage object passed into the constructor.
     * @param contentId the content id
     * @param parameters (optional) the parameters of a piece of content (=content.json)
     * @param metadata (optional) the metadata of a piece of content (=h5p.json)
     * @returns a HTML string that you can insert into your page
     */
    public async render(
        contentId: ContentId,
        parameters?: ContentParameters,
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

        const model: IPlayerModel = {
            contentId,
            customScripts: this.globalCustomScripts
                .map((script) => `<script src="${script}"></script>`)
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
    public setRenderer(
        renderer: (model: IPlayerModel) => string | any
    ): H5PPlayer {
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
                .map((dep) => LibraryName.toUberName(dep))
                .join(', ')}`
        );
        dependencies.forEach((dependency) => {
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
                (lib.preloadedCss || []).forEach((asset) =>
                    assets.styles.push(
                        this.urlGenerator.libraryFile(dependency, asset.path)
                    )
                );
                (lib.preloadedJs || []).forEach((script) =>
                    assets.scripts.push(
                        this.urlGenerator.libraryFile(dependency, script.path)
                    )
                );
            }
        });
    }

    private generateIntegration(
        contentId: ContentId,
        parameters: ContentParameters,
        metadata: IContentMetadata
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
                    jsonContent: JSON.stringify(parameters),
                    library: ContentMetadata.toUbername(metadata)
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
                .map((dep) => LibraryName.toUberName(dep))
                .join(', ')}`
        );
        await Promise.all(
            dependencies.map(async (dependency) => {
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
