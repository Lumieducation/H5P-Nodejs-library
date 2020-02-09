import { ReadStream, WriteStream } from 'fs';
import fsExtra from 'fs-extra';
import promisepipe from 'promisepipe';
import stream from 'stream';
import { withFile } from 'tmp-promise';

import defaultEditorIntegration from '../assets/default_editor_integration.json';
import defaultTranslation from '../assets/translations/en.json';
import editorAssetList from './editorAssetList.json';
import defaultRenderer from './renderers/default';

import ContentManager from './ContentManager';
import { ContentMetadata } from './ContentMetadata';
import ContentStorer from './ContentStorer';
import ContentTypeCache from './ContentTypeCache';
import ContentTypeInformationRepository from './ContentTypeInformationRepository';
import H5pError from './helpers/H5pError';
import LibraryManager from './LibraryManager';
import LibraryName from './LibraryName';
import PackageExporter from './PackageExporter';
import PackageImporter from './PackageImporter';
import TemporaryFileManager from './TemporaryFileManager';
import TranslationService from './TranslationService';
import {
    ContentId,
    ContentParameters,
    IAssets,
    IContentMetadata,
    IContentStorage,
    IEditorConfig,
    IEditorIntegration,
    IIntegration,
    IKeyValueStorage,
    ILibraryDetailedDataForClient,
    ILibraryName,
    ILibraryOverviewForClient,
    ILibraryStorage,
    ISemanticsEntry,
    ITemporaryFileStorage,
    IUser
} from './types';
import UrlGenerator from './UrlGenerator';

import Logger from './helpers/Logger';

const log = new Logger('Editor');

export default class H5PEditor {
    constructor(
        keyValueStorage: IKeyValueStorage,
        public config: IEditorConfig,
        libraryStorage: ILibraryStorage,
        contentStorage: IContentStorage,
        translationService: TranslationService,
        temporaryStorage: ITemporaryFileStorage
    ) {
        log.info('initialize');

        this.config = config;
        this.urlGenerator = new UrlGenerator(config);

        this.renderer = defaultRenderer;
        this.translation = defaultTranslation;
        this.contentTypeCache = new ContentTypeCache(config, keyValueStorage);
        this.libraryManager = new LibraryManager(
            libraryStorage,
            this.urlGenerator.libraryFile
        );
        this.contentManager = new ContentManager(contentStorage);
        this.contentTypeRepository = new ContentTypeInformationRepository(
            this.contentTypeCache,
            keyValueStorage,
            this.libraryManager,
            config,
            translationService
        );
        this.translationService = translationService;
        this.temporaryFileManager = new TemporaryFileManager(
            temporaryStorage,
            this.config
        );
        this.contentStorer = new ContentStorer(
            this.contentManager,
            this.libraryManager,
            this.temporaryFileManager
        );
        this.packageImporter = new PackageImporter(
            this.libraryManager,
            this.translationService,
            this.config,
            this.contentManager,
            this.contentStorer
        );
        this.packageExporter = new PackageExporter(
            this.libraryManager,
            translationService,
            config,
            this.contentManager
        );
    }

    public contentManager: ContentManager;
    public contentTypeCache: ContentTypeCache;
    public libraryManager: LibraryManager;
    public packageImporter: PackageImporter;
    public temporaryFileManager: TemporaryFileManager;
    public translationService: TranslationService;

    private contentStorer: ContentStorer;
    private contentTypeRepository: ContentTypeInformationRepository;
    private packageExporter: PackageExporter;
    private renderer: any;
    private translation: any;
    private urlGenerator: UrlGenerator;

    /**
     * Creates a .h5p-package for the specified content file and pipes it to the stream.
     * Throws H5pErrors if something goes wrong. The contents of the stream should be disregarded then.
     * @param contentId The contentId for which the package should be created.
     * @param outputStream The stream that the package is written to (e.g. the response stream fo Express)
     */
    public async exportPackage(
        contentId: ContentId,
        outputStream: WriteStream,
        user: IUser
    ): Promise<void> {
        return this.packageExporter.createPackage(
            contentId,
            outputStream,
            user
        );
    }

    /**
     * Returns a stream for a file that was uploaded for a content object.
     * The requested content file can be a temporary file uploaded for unsaved content or a
     * file in permanent content storage.
     * @param contentId the content id (undefined if retrieved for unsaved content)
     * @param filename the file to get (without 'content/' prefix!)
     * @param user the user who wants to retrieve the file
     * @returns a stream of the content file
     */
    public async getContentFileStream(
        contentId: ContentId,
        filename: string,
        user: IUser
    ): Promise<ReadStream> {
        // We have to try the regular content repository first and then fall back to the temporary storage.
        // This is necessary as the H5P client ignores the '#tmp' suffix we've added to temporary files.
        try {
            // we don't directly return the result of the getters as try - catch would not work then
            const returnStream = await this.contentManager.getContentFileStream(
                contentId,
                filename,
                user
            );
            return returnStream;
        } catch (error) {
            log.debug(
                `Couldn't find file ${filename} in storage. Trying temporary storage.`
            );
        }
        return this.temporaryFileManager.getFileStream(filename, user);
    }

    public getContentTypeCache(user: IUser): Promise<any> {
        log.info(`getting content type cache`);
        return this.contentTypeRepository.get(user);
    }

    public async getLibraryData(
        machineName: string,
        majorVersion: string,
        minorVersion: string,
        language: string = 'en'
    ): Promise<ILibraryDetailedDataForClient> {
        log.info(
            `getting data for library ${machineName}-${majorVersion}.${minorVersion}`
        );
        const majorVersionAsNr = Number.parseInt(majorVersion, 10);
        const minorVersionAsNr = Number.parseInt(minorVersion, 10);
        const library = new LibraryName(
            machineName,
            majorVersionAsNr,
            minorVersionAsNr
        );

        if (!(await this.libraryManager.libraryExists(library))) {
            throw new H5pError(
                `Library ${LibraryName.toUberName(library)} was not found.`
            );
        }

        const [
            assets,
            semantics,
            languageObject,
            languages,
            upgradeScriptPath
        ] = await Promise.all([
            this.loadAssets(
                new LibraryName(
                    machineName,
                    majorVersionAsNr,
                    minorVersionAsNr
                ),
                language
            ),
            this.libraryManager.loadSemantics(library),
            this.libraryManager.loadLanguage(library, language),
            this.libraryManager.listLanguages(library),
            this.libraryManager.getUpgradesScriptPath(library)
        ]);
        return {
            languages,
            semantics,
            // tslint:disable-next-line: object-literal-sort-keys
            css: assets.styles,
            defaultLanguage: null,
            language: languageObject,
            name: machineName,
            version: {
                major: majorVersionAsNr,
                minor: minorVersionAsNr
            },
            javascript: assets.scripts,
            translations: assets.translations,
            upgradesScript: upgradeScriptPath // we don't check whether the path is null, as we can return null
        };
    }

    /**
     * Retrieves the installed languages for libraries
     * @param libraryNames A list of libraries for which the language files should be retrieved.
     *                     In this list the names of the libraries don't use hyphens to separate
     *                     machine name and version.
     * @param language the language code to get the files for
     * @returns The strings of the language files
     */
    public async getLibraryLanguageFiles(
        libraryNames: string[],
        language: string
    ): Promise<{ [key: string]: string }> {
        log.info(
            `getting language files (${language}) for ${libraryNames.join(
                ', '
            )}`
        );
        return (
            await Promise.all(
                libraryNames.map(async name => {
                    const lib = LibraryName.fromUberName(name, {
                        useWhitespace: true
                    });
                    return {
                        languageJson: await this.libraryManager.loadLanguage(
                            lib,
                            language
                        ),
                        name
                    };
                })
            )
        ).reduce((builtObject: any, { languageJson, name }) => {
            if (languageJson) {
                builtObject[name] = JSON.stringify(languageJson);
            }
            return builtObject;
        }, {});
    }

    public async getLibraryOverview(
        libraryNames: string[]
    ): Promise<ILibraryOverviewForClient[]> {
        log.info(
            `getting library overview for libraries: ${libraryNames.join(', ')}`
        );
        return (
            await Promise.all(
                libraryNames
                    .map(name =>
                        LibraryName.fromUberName(name, {
                            useWhitespace: true
                        })
                    )
                    .filter(lib => lib !== undefined) // we filter out undefined values as Library.creatFromNames returns undefined for invalid names
                    .map(async lib => {
                        const loadedLibrary = await this.libraryManager.loadLibrary(
                            lib
                        );
                        if (!loadedLibrary) {
                            return undefined;
                        }
                        return {
                            majorVersion: loadedLibrary.majorVersion,
                            metadataSettings: null,
                            minorVersion: loadedLibrary.minorVersion,
                            name: loadedLibrary.machineName,
                            restricted: false,
                            runnable: loadedLibrary.runnable,
                            title: loadedLibrary.title,
                            tutorialUrl: '',
                            uberName: `${loadedLibrary.machineName} ${loadedLibrary.majorVersion}.${loadedLibrary.minorVersion}`
                        };
                    })
            )
        ).filter(lib => lib !== undefined); // we filter out undefined values as the last map return undefined values if a library doesn't exist
    }

    /**
     * Determines the main library and returns the ubername for it (e.g. "H5P.Example 1.0").
     * @param metadata the metadata object (=h5p.json)
     * @returns the ubername with a whitespace as separator
     */
    public getUbernameFromMetadata(metadata: IContentMetadata): string {
        const library = (metadata.preloadedDependencies || []).find(
            dependency => dependency.machineName === metadata.mainLibrary
        );
        if (!library) {
            return '';
        }
        return LibraryName.toUberName(library, { useWhitespace: true });
    }

    /**
     * Installs a content type from the H5P Hub.
     * @param {string} id The name of the content type to install (e.g. H5P.Test-1.0)
     * @returns {Promise<true>} true if successful. Will throw errors if something goes wrong.
     */
    public async installLibrary(id: string, user: IUser): Promise<boolean> {
        return this.contentTypeRepository.install(id, user);
    }

    public async loadH5P(
        contentId: ContentId,
        user?: IUser
    ): Promise<{
        h5p: IContentMetadata;
        library: string;
        params: {
            metadata: IContentMetadata;
            params: ContentParameters;
        };
    }> {
        log.info(`loading h5p for ${contentId}`);
        const [h5pJson, content] = await Promise.all([
            this.contentManager.loadH5PJson(contentId, user),
            this.contentManager.loadContent(contentId, user)
        ]);
        return {
            h5p: h5pJson,
            library: this.getUbernameFromMetadata(h5pJson),
            params: {
                metadata: h5pJson,
                params: content
            }
        };
    }

    public render(contentId: ContentId): Promise<string> {
        log.info(`rendering ${contentId}`);
        const model = {
            integration: this.integration(contentId),
            scripts: this.getCoreScripts(),
            styles: this.getCoreStyles(),
            urlGenerator: this.urlGenerator
        };

        return Promise.resolve(this.renderer(model));
    }

    /**
     * Stores an uploaded file in temporary storage.
     * @param contentId the id of the piece of content the file is attached to; Set to null/undefined if
     * the content hasn't been saved before.
     * @param field the semantic structure of the field the file is attached to.
     * @param file information about the uploaded file
     */
    public async saveContentFile(
        contentId: ContentId,
        field: ISemanticsEntry,
        file: {
            data: Buffer;
            mimetype: string;
            name: string;
            size: number;
        },
        user: IUser
    ): Promise<{ mime: string; path: string }> {
        const dataStream: any = new stream.PassThrough();
        dataStream.end(file.data);

        log.info(`Putting content file ${file.name} into temporary storage`);
        const tmpFilename = await this.temporaryFileManager.saveFile(
            file.name,
            dataStream,
            user
        );
        log.debug(`New temporary filename is ${tmpFilename}`);
        return {
            mime: file.mimetype,
            path: `${tmpFilename}#tmp`
        };
    }

    /**
     * Stores new content or updates existing content.
     * Copies over files from temporary storage if necessary.
     * @param contentId the contentId of existing content (undefined or previously unsaved content)
     * @param parameters the content parameters (=content.json)
     * @param metadata the content metadata (~h5p.json)
     * @param mainLibraryName the ubername with whitespace as separator (no hyphen!)
     * @param user the user who wants to save the piece of content
     * @returns the existing contentId or the newly assigned one
     */
    public async saveH5P(
        contentId: ContentId,
        parameters: ContentParameters,
        metadata: IContentMetadata,
        mainLibraryName: string,
        user: IUser
    ): Promise<ContentId> {
        if (contentId !== undefined) {
            log.info(`saving h5p content for ${contentId}`);
        } else {
            log.info('saving new content');
        }

        // validate library name
        let parsedLibraryName: ILibraryName;
        try {
            parsedLibraryName = LibraryName.fromUberName(mainLibraryName, {
                useWhitespace: true
            });
        } catch (error) {
            throw new H5pError(`mainLibraryName is invalid: ${error.message}`);
        }

        const h5pJson: IContentMetadata = await this.generateH5PJSON(
            metadata,
            parsedLibraryName,
            this.findLibraries(parameters)
        );

        const newContentId = await this.contentStorer.saveOrUpdateContent(
            contentId,
            parameters,
            h5pJson,
            parsedLibraryName,
            user
        );
        return newContentId;
    }

    /**
     * Adds the contents of a package to the system: Installs required libraries (if
     * the user has the permissions for this), adds files to temporary storage and
     * returns the actual content information for the editor to process.
     * Throws errors if something goes wrong.
     * @param data the raw data of the h5p package as a buffer
     * @returns the content information extracted from the package
     */
    public async uploadPackage(
        data: Buffer,
        user: IUser
    ): Promise<{ metadata: IContentMetadata; parameters: any }> {
        log.info(`uploading package`);
        const dataStream: any = new stream.PassThrough();
        dataStream.end(data);

        let returnValues: {
            metadata: IContentMetadata;
            parameters: any;
        };

        await withFile(
            async ({ path: tempPackagePath }) => {
                const writeStream = fsExtra.createWriteStream(tempPackagePath);
                try {
                    await promisepipe(dataStream, writeStream);
                } catch (error) {
                    throw new H5pError(
                        this.translationService.getTranslation(
                            'upload-package-failed-tmp'
                        )
                    );
                }

                returnValues = await this.packageImporter.addPackageLibrariesAndTemporaryFiles(
                    tempPackagePath,
                    user
                );
            },
            { postfix: '.h5p', keep: false }
        );

        return returnValues;
    }

    public useRenderer(renderer: any): H5PEditor {
        this.renderer = renderer;
        return this;
    }

    private findLibraries(object: any, collect: any = {}): ILibraryName[] {
        if (typeof object !== 'object') {
            return collect;
        }

        Object.keys(object).forEach((key: string) => {
            if (key === 'library' && typeof object[key] === 'string') {
                if (object[key].match(/.+ \d+\.\d+/)) {
                    collect[object[key]] = LibraryName.fromUberName(
                        object[key],
                        { useWhitespace: true }
                    );
                }
            } else {
                this.findLibraries(object[key], collect);
            }
        });

        return Object.values(collect);
    }

    private async generateH5PJSON(
        metadata: IContentMetadata,
        libraryName: ILibraryName,
        contentDependencies: ILibraryName[] = []
    ): Promise<IContentMetadata> {
        log.info(`generating h5p.json`);

        const library = await this.libraryManager.loadLibrary(libraryName);
        const h5pJson: IContentMetadata = new ContentMetadata(
            metadata,
            { mainLibrary: library.machineName },
            {
                preloadedDependencies: [
                    ...contentDependencies,
                    ...(library.preloadedDependencies || []), // empty array should preloadedDependencies be undefined
                    {
                        machineName: library.machineName,
                        majorVersion: library.majorVersion,
                        minorVersion: library.minorVersion
                    }
                ]
            }
        );
        return h5pJson;
    }

    private getCoreScripts(): string[] {
        return editorAssetList.scripts.core
            .map(this.urlGenerator.coreFile)
            .concat(
                editorAssetList.scripts.editor.map(
                    this.urlGenerator.editorLibraryFile
                )
            );
    }

    private getCoreStyles(): string[] {
        return editorAssetList.styles.core
            .map(this.urlGenerator.coreFile)
            .concat(
                editorAssetList.styles.editor.map(
                    this.urlGenerator.editorLibraryFile
                )
            );
    }

    private getEditorIntegration(contentId: ContentId): IEditorIntegration {
        log.info(`generating integration for ${contentId}`);
        return {
            ...defaultEditorIntegration,
            ajaxPath: `${this.config.baseUrl}${this.config.ajaxUrl}?action=`,
            apiVersion: {
                majorVersion: this.config.coreApiVersion.major,
                minorVersion: this.config.coreApiVersion.minor
            },
            assets: {
                css: this.getCoreStyles(),
                js: editorAssetList.scripts.integrationCore
                    .map(this.urlGenerator.coreFile)
                    .concat(
                        editorAssetList.scripts.editor.map(
                            this.urlGenerator.editorLibraryFile
                        )
                    )
            },
            filesPath: this.config.baseUrl + this.config.temporaryFilesUrl,
            libraryUrl: this.config.baseUrl + this.config.editorLibraryUrl,
            nodeVersionId: contentId
        };
    }

    private integration(contentId: ContentId): IIntegration {
        return {
            ajax: {
                contentUserData: '',
                setFinished: ''
            },
            ajaxPath: `${this.config.baseUrl}${this.config.ajaxUrl}?action=`,
            editor: this.getEditorIntegration(contentId),
            hubIsEnabled: true,
            l10n: {
                H5P: this.translation
            },
            postUserStatistics: false,
            saveFreq: false,
            url: this.config.baseUrl,
            user: {
                mail: '',
                name: ''
            }
        };
    }

    private loadAssets(
        libraryName: ILibraryName,
        language: string,
        loaded: object = {}
    ): Promise<IAssets> {
        const key: string = LibraryName.toUberName(libraryName);
        if (key in loaded) return Promise.resolve(null);
        loaded[key] = true;

        const assets: IAssets = {
            scripts: [],
            styles: [],
            translations: {}
        };

        return Promise.all([
            this.libraryManager.loadLibrary(libraryName),
            this.libraryManager.loadLanguage(libraryName, language || 'en')
        ])
            .then(([library, translation]) =>
                Promise.all([
                    this.resolveDependencies(
                        library.preloadedDependencies || [],
                        language,
                        loaded
                    ),
                    this.resolveDependencies(
                        library.editorDependencies || [],
                        language,
                        loaded
                    )
                ]).then(combinedDependencies => {
                    combinedDependencies.forEach(dependencies =>
                        dependencies.forEach(dependency => {
                            dependency.scripts.forEach(script =>
                                assets.scripts.push(script)
                            );
                            dependency.styles.forEach(script =>
                                assets.styles.push(script)
                            );
                            Object.keys(dependency.translations).forEach(k => {
                                assets.translations[k] =
                                    dependency.translations[k];
                            });
                        })
                    );

                    (library.preloadedJs || []).forEach(script =>
                        assets.scripts.push(
                            this.urlGenerator.libraryFile(
                                libraryName,
                                script.path
                            )
                        )
                    );
                    (library.preloadedCss || []).forEach(style =>
                        assets.styles.push(
                            this.urlGenerator.libraryFile(
                                libraryName,
                                style.path
                            )
                        )
                    );
                    assets.translations[libraryName.machineName] =
                        translation || undefined;
                })
            )

            .then(() => assets);
    }

    private resolveDependencies(
        originalDependencies: ILibraryName[],
        language: string,
        loaded: object
    ): Promise<IAssets[]> {
        const dependencies: ILibraryName[] = originalDependencies.slice();
        const resolved: IAssets[] = [];

        const resolve: (dependency: ILibraryName) => Promise<any> = (
            dependency: ILibraryName
        ) => {
            if (!dependency) return Promise.resolve(resolved);

            return this.loadAssets(dependency, language, loaded)
                .then((assets: IAssets) =>
                    assets ? resolved.push(assets) : null
                )
                .then(() => resolve(dependencies.shift()));
        };

        return resolve(dependencies.shift());
    }
}
