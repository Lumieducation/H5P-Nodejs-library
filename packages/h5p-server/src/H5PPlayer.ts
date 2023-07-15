import LibraryName from './LibraryName';
import {
    ContentId,
    ContentParameters,
    IAssets,
    IContentMetadata,
    IContentStorage,
    IContentUserDataStorage,
    IH5PConfig,
    IH5PPlayerOptions,
    IInstalledLibrary,
    IIntegration,
    ILibraryName,
    ILibraryStorage,
    IPlayerModel,
    IUrlGenerator,
    ILibraryMetadata,
    IUser,
    ITranslationFunction
} from './types';
import UrlGenerator from './UrlGenerator';
import Logger from './helpers/Logger';
import { ContentMetadata } from './ContentMetadata';

import defaultClientStrings from '../assets/defaultClientStrings.json';
import englishClientStrings from '../assets/translations/client/en.json';
import playerAssetList from './playerAssetList.json';
import player from './renderers/player';
import H5pError from './helpers/H5pError';
import LibraryManager from './LibraryManager';
import SemanticsLocalizer from './SemanticsLocalizer';
import SimpleTranslator from './helpers/SimpleTranslator';
import ContentUserDataManager from './ContentUserDataManager';
import ContentManager from './ContentManager';
import { LaissezFairePermissionSystem } from './implementation/LaissezFairePermissionSystem';

const log = new Logger('Player');

export default class H5PPlayer {
    /**
     *
     * @param libraryStorage the storage for libraries (can be read only)
     * @param contentStorage the storage for content (can be read only)
     * @param config the configuration object
     * @param integrationObjectDefaults (optional) the default values to use for
     * the integration object
     * @param urlGenerator creates url strings for files, can be used to
     * customize the paths in an implementation application
     * @param translationCallback a function that is called to retrieve
     * translations of keys in a certain language; the keys use the i18next
     * format (e.g. namespace:key). See the ITranslationFunction documentation
     * for more details.
     * @param options more options to customize the behavior of the player; see
     * IH5PPlayerOptions documentation for more details
     */
    constructor(
        private libraryStorage: ILibraryStorage,
        private contentStorage: IContentStorage,
        private config: IH5PConfig,
        private integrationObjectDefaults?: IIntegration,
        private urlGenerator: IUrlGenerator = new UrlGenerator(config),
        translationCallback: ITranslationFunction = new SimpleTranslator({
            // We use a simplistic translation function that is hard-wired to
            // English if the implementation does not pass us a proper one.
            client: englishClientStrings
        }).t,
        private options?: IH5PPlayerOptions,
        contentUserDataStorage?: IContentUserDataStorage
    ) {
        log.info('initialize');
        this.renderer = player;
        this.libraryManager = new LibraryManager(
            libraryStorage,
            urlGenerator.libraryFile,
            undefined,
            undefined,
            undefined,
            this.options?.lockProvider,
            this.config
        );

        const permissionSystem =
            options?.permissionSystem ?? new LaissezFairePermissionSystem();

        this.contentUserDataManager = new ContentUserDataManager(
            contentUserDataStorage,
            permissionSystem
        );

        this.contentManager = new ContentManager(
            contentStorage,
            permissionSystem,
            contentUserDataStorage
        );

        this.globalCustomScripts =
            this.options?.customization?.global?.scripts || [];
        if (this.config.customization?.global?.player?.scripts) {
            this.globalCustomScripts = this.globalCustomScripts.concat(
                this.config.customization.global.player.scripts
            );
        }

        this.globalCustomStyles =
            this.options?.customization?.global?.styles || [];
        if (this.config.customization?.global?.player?.styles) {
            this.globalCustomStyles = this.globalCustomStyles.concat(
                this.config.customization.global.player.styles
            );
        }

        this.semanticsLocalizer = new SemanticsLocalizer(translationCallback);
    }
    private semanticsLocalizer: SemanticsLocalizer;
    private globalCustomScripts: string[] = [];
    private globalCustomStyles: string[] = [];
    private libraryManager: LibraryManager;
    private contentManager: ContentManager;
    private contentUserDataManager: ContentUserDataManager;
    private renderer: (model: IPlayerModel) => string | any;

    /**
     * Creates a frame for displaying H5P content. You can customize this frame
     * by calling setRenderer(...). It normally is enough to call this method
     * with the content id. Only call it with parameters and metadata if don't
     * want to use the IContentStorage object passed into the constructor.
     * @param contentId the content id
     * @param actingUser the user who wants to access the content
     * @param options.ignoreUserPermission (optional) If set to true, the user
     * object won't be passed to the storage classes for permission checks. You
     * can use this option if you have already checked the user's permission in
     * a different layer.
     * @param options.parametersOverride (optional) the parameters of a piece of
     * content (=content.json); if you use this option, the parameters won't be
     * loaded from storage
     * @param options.metadataOverride (optional) the metadata of a piece of
     * content (=h5p.json); if you use this option, the parameters won't be
     * loaded from storage
     * @param options.contextId (optional) allows implementations to have
     * multiple content states for a single content object and user tuple
     * @param options.asUserId (optional) allows you to impersonate another
     * user. You will see their user state instead of yours.
     * @param options.readOnlyState (optional) allows you to disable saving of
        the user state. You will still see the state, but changes won't be
        persisted. This is useful if you want to review other users' states by
        setting `asUserId` and don't want to change their state. Note that the
        H5P doesn't support this behavior and we use a workaround to implement
        it. The workaround includes setting the query parameter `ignorePost=yes`
        in the URL of the content state Ajax call. The h5p-express adapter
        ignores posts that have this query parameter. You should, however, still
        prevent malicious users from writing other users' states in the
        permission system! 
     * @returns a HTML string that you can insert into your page
     */
    public async render(
        contentId: ContentId,
        actingUser: IUser,
        language: string = 'en',
        options?: {
            ignoreUserPermissions?: boolean;
            metadataOverride?: ContentMetadata;
            parametersOverride?: ContentParameters;
            showCopyButton?: boolean;
            showDownloadButton?: boolean;
            showEmbedButton?: boolean;
            showFrame?: boolean;
            showH5PIcon?: boolean;
            showLicenseButton?: boolean;
            contextId?: string;
            asUserId?: string; // the user for which the content state should be displayed;
            readOnlyState?: boolean;
        }
    ): Promise<string | any> {
        log.debug(`rendering page for ${contentId} in language ${language}`);
        if (options?.asUserId) {
            log.debug(`Personifying ${options.asUserId}`);
        }

        let parameters: ContentParameters;
        if (!options?.parametersOverride) {
            try {
                parameters = await this.contentManager.getContentParameters(
                    contentId,
                    options?.ignoreUserPermissions ? undefined : actingUser
                );
            } catch (error) {
                throw new H5pError('h5p-player:content-missing', {}, 404);
            }
        } else {
            parameters = options.parametersOverride;
        }

        let metadata: ContentMetadata;
        if (!options?.metadataOverride) {
            try {
                metadata = await this.contentManager.getContentMetadata(
                    contentId,
                    options?.ignoreUserPermissions ? undefined : actingUser
                );
            } catch (error) {
                throw new H5pError('h5p-player:content-missing', {}, 404);
            }
        } else {
            metadata = options.metadataOverride;
        }

        log.debug('Getting list of installed addons.');
        let installedAddons: ILibraryMetadata[] = [];
        if (this.libraryStorage?.listAddons) {
            installedAddons = await this.libraryStorage.listAddons();
        }
        // We remove duplicates from the dependency list by converting it to
        // a set and then back.
        const dependencies = Array.from(
            new Set(
                (metadata.preloadedDependencies || [])
                    .concat(
                        await this.getAddonsByParameters(
                            parameters,
                            installedAddons
                        )
                    )
                    .concat(
                        await this.getAddonsByLibrary(
                            metadata.mainLibrary,
                            installedAddons
                        )
                    )
            )
        );

        // Getting lists of scripts and styles needed for the main library.
        const libraries = await this.getMetadataRecursive(dependencies);
        const assets = this.aggregateAssetsRecursive(dependencies, libraries);

        const mainLibrarySupportsFullscreen = !metadata.mainLibrary
            ? false
            : libraries[
                  LibraryName.toUberName(
                      metadata.preloadedDependencies.find(
                          (dep) => dep.machineName === metadata.mainLibrary
                      )
                  )
              ].fullscreen === 1;

        const model: IPlayerModel = {
            contentId,
            dependencies,
            downloadPath: this.getDownloadPath(contentId),
            integration: await this.generateIntegration(
                contentId,
                parameters,
                metadata,
                assets,
                mainLibrarySupportsFullscreen,
                actingUser,
                language,
                {
                    showCopyButton: options?.showCopyButton ?? false,
                    showDownloadButton: options?.showDownloadButton ?? false,
                    showEmbedButton: options?.showEmbedButton ?? false,
                    showFrame: options?.showFrame ?? false,
                    showH5PIcon: options?.showH5PIcon ?? false,
                    showLicenseButton: options?.showLicenseButton ?? false
                },
                options?.contextId,
                options?.asUserId,
                options?.readOnlyState
            ),
            scripts: this.listCoreScripts().concat(assets.scripts),
            styles: this.listCoreStyles().concat(assets.styles),
            translations: {},
            embedTypes: metadata.embedTypes, // TODO: check if the library supports the embed type!
            user: actingUser
        };

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

    /**
     *
     * @param dependencies
     * @param libraries
     * @param assets
     * @param loaded
     * @returns aggregated asset lists
     */
    private aggregateAssetsRecursive(
        dependencies: ILibraryName[],
        libraries: { [ubername: string]: IInstalledLibrary },
        assets: IAssets = { scripts: [], styles: [], translations: {} },
        loaded: { [ubername: string]: boolean } = {}
    ): IAssets {
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
                this.aggregateAssetsRecursive(
                    lib.preloadedDependencies || [],
                    libraries,
                    assets,
                    loaded
                );
                let cssFiles: string[] =
                    lib.preloadedCss?.map((f) => f.path) || [];
                let jsFiles: string[] =
                    lib.preloadedJs?.map((f) => f.path) || [];

                // If configured in the options, we call a hook to change the files
                // included for certain libraries.
                if (this.options?.customization?.alterLibraryFiles) {
                    log.debug('Calling alterLibraryFiles hook');
                    const alteredFiles =
                        this.options.customization.alterLibraryFiles(
                            lib,
                            jsFiles,
                            cssFiles
                        );
                    jsFiles = alteredFiles?.scripts;
                    cssFiles = alteredFiles?.styles;
                }
                (cssFiles || []).forEach((style) =>
                    assets.styles.push(
                        this.urlGenerator.libraryFile(lib, style)
                    )
                );
                (jsFiles || []).forEach((script) =>
                    assets.scripts.push(
                        this.urlGenerator.libraryFile(lib, script)
                    )
                );
            }
        });
        return assets;
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
            // eslint-disable-next-line guard-for-in
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

    private async generateIntegration(
        contentId: ContentId,
        parameters: ContentParameters,
        metadata: IContentMetadata,
        assets: IAssets,
        supportsFullscreen: boolean,
        actingUser: IUser,
        language: string,
        displayOptions: {
            showCopyButton: boolean;
            showDownloadButton: boolean;
            showEmbedButton: boolean;
            showFrame: boolean;
            showH5PIcon: boolean;
            showLicenseButton: boolean;
        },
        contextId: string,
        asUserId?: string,
        readOnlyState?: boolean
    ): Promise<IIntegration> {
        // see https://h5p.org/creating-your-own-h5p-plugin
        log.info(`generating integration for ${contentId}`);

        return {
            ajax: {
                contentUserData: this.urlGenerator.contentUserData(
                    actingUser,
                    contextId,
                    asUserId,
                    { readonly: readOnlyState }
                ),
                setFinished: this.urlGenerator.setFinished(actingUser)
            },
            ajaxPath: this.urlGenerator.ajaxEndpoint(actingUser),
            contents: {
                [`cid-${contentId}`]: {
                    displayOptions: {
                        copy: displayOptions.showCopyButton,
                        copyright: displayOptions.showLicenseButton,
                        embed: displayOptions.showEmbedButton,
                        export: displayOptions.showDownloadButton,
                        frame: displayOptions.showFrame,
                        icon: displayOptions.showH5PIcon
                    },
                    fullScreen: supportsFullscreen ? '1' : '0',
                    jsonContent: JSON.stringify(parameters),
                    library: ContentMetadata.toUbername(metadata),
                    contentUrl: this.urlGenerator.contentFilesUrl(contentId),
                    contentUserData:
                        await this.contentUserDataManager.generateContentUserDataIntegration(
                            contentId,
                            actingUser,
                            contextId,
                            asUserId
                        ),
                    metadata: {
                        license: metadata.license || 'U',
                        title: metadata.title || '',
                        defaultLanguage: metadata.language || 'en',
                        authors: metadata.authors,
                        changes: metadata.changes,
                        contentType: metadata.contentType,
                        licenseExtras: metadata.licenseExtras,
                        a11yTitle: metadata.a11yTitle,
                        authorComments: metadata.authorComments,
                        licenseVersion: metadata.licenseVersion,
                        source: metadata.source,
                        yearFrom: metadata.yearFrom,
                        yearTo: metadata.yearTo
                    },
                    scripts: assets.scripts,
                    styles: assets.styles,
                    url: this.urlGenerator.uniqueContentUrl(contentId),
                    exportUrl: this.urlGenerator.downloadPackage(contentId)
                }
            },
            core: {
                scripts: this.listCoreScripts(),
                styles: this.listCoreStyles()
            },
            l10n: {
                H5P: this.semanticsLocalizer.localize(
                    defaultClientStrings,
                    language,
                    true
                )
            },
            libraryConfig: this.config.libraryConfig,
            postUserStatistics: this.config.setFinishedEnabled,
            saveFreq: this.getSaveFreq(readOnlyState),
            url: this.urlGenerator.baseUrl(),
            hubIsEnabled: true,
            fullscreenDisabled: this.config.disableFullscreen ? 1 : 0,
            ...this.integrationObjectDefaults,
            user: {
                name: actingUser.name,
                mail: actingUser.email,
                id: actingUser.id
            }
        };
    }

    private getSaveFreq(readOnlyState: boolean): number | boolean {
        if (readOnlyState) {
            return Number.MAX_SAFE_INTEGER;
        }
        if (this.config.contentUserStateSaveInterval !== false) {
            return (
                Math.round(
                    Number(this.config.contentUserStateSaveInterval) / 1000
                ) || 1
            );
        }
        return false;
    }

    /**
     * Finds out which adds should be added to the library due to the settings
     * in the global configuration or in the library metadata.
     * @param machineName the machine name of the library to which addons should
     * be added
     * @param installedAddons a list of installed addons on the system
     * @returns the list of addons to install
     */
    private async getAddonsByLibrary(
        machineName: string,
        installedAddons: ILibraryMetadata[]
    ): Promise<ILibraryMetadata[]> {
        const neededAddons: ILibraryMetadata[] = [];
        // add addons that are required by the H5P library metadata extension
        for (const installedAddon of installedAddons) {
            // The property addTo.player.machineNames is a custom
            // h5p-nodejs-library extension.
            if (
                installedAddon.addTo?.player?.machineNames?.includes(
                    machineName
                ) ||
                installedAddon.addTo?.player?.machineNames?.includes('*')
            ) {
                log.debug(
                    `Addon ${LibraryName.toUberName(
                        installedAddon
                    )} will be added to the player.`
                );
                neededAddons.push(installedAddon);
            }
        }

        // add addons that are required by the server configuration
        const configRequestedAddons = [
            ...(this.config.playerAddons?.[machineName] ?? []),
            ...(this.config.playerAddons?.['*'] ?? [])
        ];
        for (const addonMachineName of configRequestedAddons) {
            const installedAddonVersions =
                await this.libraryManager.listInstalledLibraries(
                    addonMachineName
                );
            if (
                !neededAddons
                    .map((a) => a.machineName)
                    .includes(addonMachineName) &&
                installedAddonVersions[addonMachineName] !== undefined
            ) {
                log.debug(
                    `Addon ${addonMachineName} will be added to the player.`
                );

                neededAddons.push(
                    installedAddonVersions[addonMachineName].sort()[
                        installedAddonVersions[addonMachineName].length - 1
                    ]
                );
            }
        }

        return neededAddons;
    }

    /**
     * Determines which addons should be used for the parameters. It will scan
     * the parameters for patterns specified by installed addons.
     * @param parameters the parameters to scan
     * @param installedAddons a list of addons installed on the system
     * @returns a list of addons that should be used
     */
    private async getAddonsByParameters(
        parameters: any,
        installedAddons: ILibraryMetadata[]
    ): Promise<ILibraryMetadata[]> {
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
                        addonsToAdd[installedAddon.machineName] =
                            installedAddon;
                    }
                }
            }
        }
        return Object.values(addonsToAdd);
    }

    private getDownloadPath(contentId: ContentId): string {
        return this.urlGenerator.downloadPackage(contentId);
    }

    private async getMetadata(
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

    /**
     *
     * @param dependencies
     * @param loaded can be left out in initial call
     */
    private async getMetadataRecursive(
        dependencies: ILibraryName[],
        loaded: { [ubername: string]: IInstalledLibrary } = {}
    ): Promise<{ [ubername: string]: IInstalledLibrary }> {
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
                    lib = await this.getMetadata(name, majVer, minVer);
                } catch {
                    log.info(
                        `Could not find library ${name}-${majVer}.${minVer} in storage. Silently ignoring...`
                    );
                }
                if (lib) {
                    loaded[key] = lib;
                    await this.getMetadataRecursive(
                        lib.preloadedDependencies || [],
                        loaded
                    );
                }
            })
        );
        return loaded;
    }

    private listCoreScripts(): string[] {
        return playerAssetList.scripts.core
            .map(this.urlGenerator.coreFile)
            .concat(this.globalCustomScripts);
    }

    private listCoreStyles(): string[] {
        return playerAssetList.styles.core
            .map(this.urlGenerator.coreFile)
            .concat(this.globalCustomStyles);
    }
}
