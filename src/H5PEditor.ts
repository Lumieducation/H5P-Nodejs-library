import { ReadStream, WriteStream } from 'fs';
import { withFile } from 'tmp-promise';
import fsExtra from 'fs-extra';
import mimeTypes from 'mime-types';
import promisepipe from 'promisepipe';
import sanitize from 'sanitize-filename';
import stream from 'stream';

import defaultEditorIntegration from '../assets/default_editor_integration.json';
import defaultTranslation from '../assets/translations/client/en.json';
import editorAssetList from './editorAssetList.json';
import defaultRenderer from './renderers/default';

import ContentManager from './ContentManager';
import { ContentMetadata } from './ContentMetadata';
import ContentStorer from './ContentStorer';
import ContentTypeCache from './ContentTypeCache';
import ContentTypeInformationRepository from './ContentTypeInformationRepository';
import H5pError from './helpers/H5pError';
import Logger from './helpers/Logger';
import LibraryManager from './LibraryManager';
import LibraryName from './LibraryName';
import PackageExporter from './PackageExporter';
import PackageImporter from './PackageImporter';
import TemporaryFileManager from './TemporaryFileManager';
import {
    ContentId,
    ContentParameters,
    IAssets,
    IContentMetadata,
    IContentStorage,
    IH5PConfig,
    IEditorIntegration,
    IIntegration,
    IKeyValueStorage,
    ILibraryDetailedDataForClient,
    ILibraryInstallResult,
    ILibraryName,
    ILibraryOverviewForClient,
    ILibraryStorage,
    ISemanticsEntry,
    ITemporaryFileStorage,
    IUser,
    IHubInfo
} from './types';
import UrlGenerator from './UrlGenerator';

const log = new Logger('Editor');

export default class H5PEditor {
    /**
     * @param cache the cache is used to store key - value pairs that must be accessed often; values stored in it must be accessible by ALL instances of the editor (across machines)
     * @param config the configuration values for the editor; note that the editor can also change these values and save them!
     * @param libraryStorage the storage object for libraries
     * @param contentStorage the storage object for content
     * @param temporaryStorage the storage object for temporary files
     */
    constructor(
        protected cache: IKeyValueStorage,
        public config: IH5PConfig,
        public libraryStorage: ILibraryStorage,
        public contentStorage: IContentStorage,
        temporaryStorage: ITemporaryFileStorage
    ) {
        log.info('initialize');

        this.config = config;
        this.urlGenerator = new UrlGenerator(config);

        this.renderer = defaultRenderer;
        this.clientTranslation = defaultTranslation;
        this.contentTypeCache = new ContentTypeCache(config, cache);
        this.libraryManager = new LibraryManager(
            libraryStorage,
            this.urlGenerator.libraryFile
        );
        this.contentManager = new ContentManager(contentStorage);
        this.contentTypeRepository = new ContentTypeInformationRepository(
            this.contentTypeCache,
            this.libraryManager,
            config
        );
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
            this.config,
            this.contentManager,
            this.contentStorer
        );
        this.packageExporter = new PackageExporter(
            this.libraryManager,
            this.contentManager
        );
    }

    public contentManager: ContentManager;
    public contentTypeCache: ContentTypeCache;
    public contentTypeRepository: ContentTypeInformationRepository;
    public libraryManager: LibraryManager;
    public packageImporter: PackageImporter;
    public temporaryFileManager: TemporaryFileManager;

    private clientTranslation: any;
    private contentStorer: ContentStorer;
    private packageExporter: PackageExporter;
    private renderer: any;
    private urlGenerator: UrlGenerator;

    /**
     * Deletes a piece of content and all files dependent on it.
     * @param contentId the piece of content to delete
     * @param user the user who wants to delete it
     */
    public async deleteContent(
        contentId: ContentId,
        user: IUser
    ): Promise<void> {
        return this.contentManager.deleteContent(contentId, user);
    }

    /**
     * Creates a .h5p-package for the specified content file and pipes it to the stream.
     * Throws H5pErrors if something goes wrong. The contents of the stream should be disregarded then.
     * @param contentId The contentId for which the package should be created.
     * @param outputStream The stream that the package is written to (e.g. the response stream fo Express)
     */
    public async exportContent(
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
     * Returns all the data needed to editor or display content
     * @param contentId the content id
     * @param user (optional) the user who wants to access the content; if undefined, access will be granted
     * @returns all relevant information for the content (you can send it back to the GET request for content)
     */
    public async getContent(
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
            this.contentManager.getContentMetadata(contentId, user),
            this.contentManager.getContentParameters(contentId, user)
        ]);
        return {
            h5p: h5pJson,
            library: ContentMetadata.toUbername(h5pJson),
            params: {
                metadata: h5pJson,
                params: content
            }
        };
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

    /**
     * Returns the content type cache for a specific user. This includes all available content types for the user (some
     * might be restricted) and what the user can do with them (update, install from Hub).
     */
    public getContentTypeCache(user: IUser): Promise<IHubInfo> {
        log.info(`getting content type cache`);
        return this.contentTypeRepository.get(user);
    }

    /**
     * Returns detailed information about an installed library.
     */
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
                'library-not-found',
                { name: LibraryName.toUberName(library) },
                404
            );
        }

        const [
            assets,
            semantics,
            languageObject,
            languages,
            installedLibrary,
            upgradeScriptPath
        ] = await Promise.all([
            this.listAssets(
                new LibraryName(
                    machineName,
                    majorVersionAsNr,
                    minorVersionAsNr
                ),
                language
            ),
            this.libraryManager.getSemantics(library),
            this.libraryManager.getLanguage(library, language),
            this.libraryManager.listLanguages(library),
            this.libraryManager.getLibrary(library),
            this.libraryManager.getUpgradesScriptPath(library)
        ]);
        return {
            languages,
            semantics,
            css: assets.styles,
            defaultLanguage: null,
            language: languageObject,
            name: machineName,
            version: {
                major: majorVersionAsNr,
                minor: minorVersionAsNr
            },
            javascript: assets.scripts,
            title: installedLibrary.title,
            translations: assets.translations,
            upgradesScript: upgradeScriptPath // we don't check whether the path is null, as we can return null
        };
    }

    /**
     * Returns a readable stream of a library file's contents.
     * Throws an exception if the file does not exist.
     * @param library library
     * @param filename the relative path inside the library
     * @returns a readable stream of the file's contents
     */
    public async getLibraryFileStream(
        library: ILibraryName,
        filename: string
    ): Promise<ReadStream> {
        return this.libraryManager.getFileStream(library, filename);
    }

    /**
     * Gets a rough overview of information about the requested libraries.
     * @param libraryNames
     */
    public async getLibraryOverview(
        libraryNames: string[]
    ): Promise<ILibraryOverviewForClient[]> {
        log.info(
            `getting library overview for libraries: ${libraryNames.join(', ')}`
        );
        return (
            await Promise.all(
                libraryNames
                    .map((name) =>
                        LibraryName.fromUberName(name, {
                            useWhitespace: true
                        })
                    )
                    .filter((lib) => lib !== undefined) // we filter out undefined values as Library.creatFromNames returns undefined for invalid names
                    .map(async (lib) => {
                        try {
                            const loadedLibrary = await this.libraryManager.getLibrary(
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
                        } catch (error) {
                            // if a library can't be loaded the whole call should still succeed
                            return undefined;
                        }
                    })
            )
        ).filter((lib) => lib !== undefined); // we filter out undefined values as the last map return undefined values if a library doesn't exist
    }

    /**
     * Installs a content type from the H5P Hub.
     * @param libraryName The name of the content type to install (e.g. H5P.Test) Note that this is not a full ubername!
     * @returns a list of installed libraries if successful. Will throw errors if something goes wrong.
     */
    public async installLibraryFromHub(
        libraryName: string,
        user: IUser
    ): Promise<ILibraryInstallResult[]> {
        return this.contentTypeRepository.installContentType(libraryName, user);
    }

    /**
     * Retrieves the installed languages for libraries
     * @param libraryUbernames A list of libraries for which the language files should be retrieved.
     *                     In this list the names of the libraries don't use hyphens to separate
     *                     machine name and version.
     * @param language the language code to get the files for
     * @returns The strings of the language files
     */
    public async listLibraryLanguageFiles(
        libraryUbernames: string[],
        language: string
    ): Promise<{ [key: string]: string }> {
        log.info(
            `getting language files (${language}) for ${libraryUbernames.join(
                ', '
            )}`
        );
        return (
            await Promise.all(
                libraryUbernames.map(async (name) => {
                    const lib = LibraryName.fromUberName(name, {
                        useWhitespace: true
                    });
                    return {
                        languageJson: await this.libraryManager.getLanguage(
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

    /**
     * Renders the content. This means that a frame in which the editor is displayed is generated and returned. You can
     * override the default frame by calling setRenderer(...).
     * @param contentId
     * @returns the rendered frame that you can include in your website. Normally a string, but can be anything you want it to be if you override the renderer.
     */
    public render(contentId: ContentId): Promise<string | any> {
        log.info(`rendering ${contentId}`);
        const model = {
            integration: this.generateIntegration(contentId),
            scripts: this.listCoreScripts(),
            styles: this.listCoreStyles(),
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
        // We must make sure to avoid illegal characters in filenames.
        let cleanFilename = sanitize(file.name).replace(' ', '_');
        // Same PHP implementations of H5P (Moodle) expect the uploaded files to be in sub-directories of the content
        // folder. To achieve compatibility, we also put them into these directories by their mime-types.
        cleanFilename = this.addDirectoryByMimetype(cleanFilename);

        const dataStream: any = new stream.PassThrough();
        dataStream.end(file.data);

        log.info(
            `Putting content file ${cleanFilename} into temporary storage`
        );
        const tmpFilename = await this.temporaryFileManager.addFile(
            cleanFilename,
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
    public async saveOrUpdateContent(
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
            throw new H5pError(
                'invalid-main-library-name',
                { message: error.message },
                400
            );
        }

        const h5pJson: IContentMetadata = await this.generateH5PJson(
            metadata,
            parsedLibraryName,
            this.findLibraries(parameters)
        );

        const newContentId = await this.contentStorer.addOrUpdateContent(
            contentId,
            parameters,
            h5pJson,
            parsedLibraryName,
            user
        );
        return newContentId;
    }

    public setRenderer(renderer: any): H5PEditor {
        this.renderer = renderer;
        return this;
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
    ): Promise<{
        installedLibraries: ILibraryInstallResult[];
        metadata: IContentMetadata;
        parameters: any;
    }> {
        log.info(`uploading package`);
        const dataStream: any = new stream.PassThrough();
        dataStream.end(data);

        let returnValues: {
            installedLibraries: ILibraryInstallResult[];
            metadata: IContentMetadata;
            parameters: any;
        };

        await withFile(
            async ({ path: tempPackagePath }) => {
                const writeStream = fsExtra.createWriteStream(tempPackagePath);
                try {
                    await promisepipe(dataStream, writeStream);
                } catch (error) {
                    throw new H5pError('upload-package-failed-tmp');
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

    /**
     * If a file is a video, an audio file or an image, the filename is suffixed
     * with the corresponding directory (videos, audios, images).
     * @param filename the filename including the file extension
     * @returns the path including the directory; the same if the filename is not a video, audio file or image
     */
    private addDirectoryByMimetype(filename: string): string {
        const mimetype = mimeTypes.lookup(filename);
        if (mimetype !== false) {
            if (mimetype.startsWith('video')) {
                return `videos/${filename}`;
            }
            if (mimetype.startsWith('audio')) {
                return `audios/${filename}`;
            }
            if (mimetype.startsWith('image')) {
                return `images/${filename}`;
            }
        }
        return filename;
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

    private generateEditorIntegration(
        contentId: ContentId
    ): IEditorIntegration {
        log.info(`generating integration for ${contentId}`);
        return {
            ...defaultEditorIntegration,
            ajaxPath: `${this.config.baseUrl}${this.config.ajaxUrl}?action=`,
            apiVersion: {
                majorVersion: this.config.coreApiVersion.major,
                minorVersion: this.config.coreApiVersion.minor
            },
            assets: {
                css: this.listCoreStyles(),
                js: editorAssetList.scripts.integrationCore
                    .map(this.urlGenerator.coreFile)
                    .concat(
                        editorAssetList.scripts.editor.map(
                            this.urlGenerator.editorLibraryFile
                        )
                    )
            },
            filesPath: this.urlGenerator.temporaryFiles(),
            libraryUrl: this.urlGenerator.editorLibraryFiles(),
            nodeVersionId: contentId
        };
    }

    private async generateH5PJson(
        metadata: IContentMetadata,
        libraryName: ILibraryName,
        contentDependencies: ILibraryName[] = []
    ): Promise<IContentMetadata> {
        log.info(`generating h5p.json`);

        const library = await this.libraryManager.getLibrary(libraryName);
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

    private generateIntegration(contentId: ContentId): IIntegration {
        return {
            ajax: {
                contentUserData: '',
                setFinished: ''
            },
            ajaxPath: `${this.config.baseUrl}${this.config.ajaxUrl}?action=`,
            editor: this.generateEditorIntegration(contentId),
            hubIsEnabled: true,
            l10n: {
                H5P: this.clientTranslation
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

    private async listAssets(
        libraryName: ILibraryName,
        language: string,
        loaded: object = {}
    ): Promise<IAssets> {
        const key: string = LibraryName.toUberName(libraryName);
        if (key in loaded) {
            return null;
        }
        loaded[key] = true;

        const assets: IAssets = {
            scripts: [],
            styles: [],
            translations: {}
        };

        const [library, translation] = await Promise.all([
            this.libraryManager.getLibrary(libraryName),
            this.libraryManager.getLanguage(libraryName, language || 'en')
        ]);
        const combinedDependencies = await Promise.all([
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
        ]);
        combinedDependencies.forEach((dependencies) =>
            dependencies.forEach((dependency) => {
                dependency.scripts.forEach((script) =>
                    assets.scripts.push(script)
                );
                dependency.styles.forEach((script) =>
                    assets.styles.push(script)
                );
                Object.keys(dependency.translations).forEach((k) => {
                    assets.translations[k] = dependency.translations[k];
                });
            })
        );

        (library.preloadedJs || []).forEach((script) =>
            assets.scripts.push(
                this.urlGenerator.libraryFile(libraryName, script.path)
            )
        );
        (library.preloadedCss || []).forEach((style) =>
            assets.styles.push(
                this.urlGenerator.libraryFile(libraryName, style.path)
            )
        );
        assets.translations[libraryName.machineName] = translation || undefined;

        return assets;
    }

    private listCoreScripts(): string[] {
        return editorAssetList.scripts.core
            .map(this.urlGenerator.coreFile)
            .concat(
                editorAssetList.scripts.editor.map(
                    this.urlGenerator.editorLibraryFile
                )
            );
    }

    private listCoreStyles(): string[] {
        return editorAssetList.styles.core
            .map(this.urlGenerator.coreFile)
            .concat(
                editorAssetList.styles.editor.map(
                    this.urlGenerator.editorLibraryFile
                )
            );
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

            return this.listAssets(dependency, language, loaded)
                .then((assets: IAssets) =>
                    assets ? resolved.push(assets) : null
                )
                .then(() => resolve(dependencies.shift()));
        };

        return resolve(dependencies.shift());
    }
}
