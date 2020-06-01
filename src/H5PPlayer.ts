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
    IPlayerModel,
    IUrlGenerator,
    ILibraryMetadata
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
        private globalCustomScripts: string[] = [],
        private urlGenerator: IUrlGenerator = new UrlGenerator(config)
    ) {
        log.info('initialize');
        this.renderer = player;
        this.clientTranslation = defaultTranslation;
    }
    private clientTranslation: any;
    private renderer: (model: IPlayerModel) => string | any;

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
    ): Promise<string | any> {
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
                .join('\n'),
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

        const dependencies = (metadata.preloadedDependencies || []).concat(
            await this.getAddonsForParameters(parameters)
        );

        const libraries = {};
        await this.getLibraries(dependencies, libraries);

        this.aggregateAssets(dependencies, model, libraries);
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

    /**
     * Scans the parameters for occurances of the regex pattern in any string
     * property.
     * @param parameters the parameters (= content.json)
     * @param regex the regex to look for
     * @returns true if the regex occurs in a string inside the parametres
     */
    private checkIfRegexIsInParameters(
        parameters: any,
        regex: RegExp
    ): boolean {
        const type = typeof parameters;
        if (type === 'string') {
            if (regex.test(parameters)) {
                return true;
            }
        } else if (type === 'object') {
            // tslint:disable-next-line: forin
            for (const property in parameters) {
                const found = this.checkIfRegexIsInParameters(
                    parameters[property],
                    regex
                );
                if (found) {
                    return true;
                }
            }
        }
        return false;
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
                    fullScreen: '0',
                    jsonContent: JSON.stringify(parameters),
                    library: ContentMetadata.toUbername(metadata),
                    contentUrl: this.config.contentFilesUrlPlayerOverride?.replace(
                        '{{contentId}}',
                        contentId
                    )
                }
            },
            core: {
                scripts: this.listCoreScripts().concat(
                    this.globalCustomScripts
                ),
                styles: this.listCoreStyles()
            },
            l10n: {
                H5P: this.clientTranslation
            },
            libraryConfig: this.config.libraryConfig,
            postUserStatistics: false,
            saveFreq: false,
            url: this.config.baseUrl,
            ...this.integrationObjectDefaults
        };
    }

    /**
     * Determines which addons should be used for the parameters. It will scan
     * the parameters for patterns specified by installed addons.
     * @param parameters the parameters to scan
     * @returns a list of addons that should be used
     */
    private async getAddonsForParameters(
        parameters: any
    ): Promise<ILibraryMetadata[]> {
        log.debug('Getting list of installed addons.');
        let installedAddons: ILibraryMetadata[] = [];
        if (this.libraryStorage?.listAddons) {
            installedAddons = await this.libraryStorage.listAddons();
        }

        log.debug('Checking which of the addons must be used for the content.');
        const addonsToAdd: { [key: string]: ILibraryMetadata } = {};
        for (const installedAddon of installedAddons) {
            if (!installedAddon.addTo?.content?.types) {
                continue;
            }

            for (const types of installedAddon.addTo.content.types) {
                if (types.text) {
                    // The regex pattern in the metadata is specified like this:
                    // /mypattern/ or /mypattern/g
                    // Because of this we must extract the actual pattern and
                    // the flags and pass them to the constructor of RegExp.
                    const matches = /^\/(.+?)\/([gimy]+)?$/.exec(
                        types.text.regex
                    );
                    if (matches.length < 1) {
                        log.error(
                            `The addon ${LibraryName.toUberName(
                                installedAddon
                            )} contains an invalid regexp pattern in the addTo selector: ${
                                types.text.regex
                            }. This will be silently ignored, but the addon will never be used!`
                        );
                        continue;
                    }

                    if (
                        this.checkIfRegexIsInParameters(
                            parameters,
                            new RegExp(matches[1], matches[2])
                        )
                    ) {
                        log.debug(
                            `Adding addon ${LibraryName.toUberName(
                                installedAddon
                            )} to dependencies as the regexp pattern ${
                                types.text.regex
                            } was found in the parameters.`
                        );
                        addonsToAdd[
                            installedAddon.machineName
                        ] = installedAddon;
                    }
                }
            }
        }
        return Object.values(addonsToAdd);
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
                let lib;
                try {
                    lib = await this.getLibrary(name, majVer, minVer);
                } catch {
                    log.info(
                        `Could not find library ${name}-${majVer}.${minVer} in storage. Silently ignoring...`
                    );
                }
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
