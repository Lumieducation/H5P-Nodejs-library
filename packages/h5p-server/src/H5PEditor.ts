import { withFile, file as createTempFile, FileResult } from 'tmp-promise';
import { PassThrough, Writable, Readable } from 'stream';
import Ajv, { ValidateFunction } from 'ajv';
import ajvKeywords from 'ajv-keywords';
import fsExtra from 'fs-extra';
import imageSize from 'image-size';
import mimeTypes from 'mime-types';
import path from 'path';
import promisepipe from 'promisepipe';

import defaultClientStrings from '../assets/defaultClientStrings.json';
import defaultCopyrightSemantics from '../assets/defaultCopyrightSemantics.json';
import defaultMetadataSemantics from '../assets/defaultMetadataSemantics.json';
import defaultClientLanguageFile from '../assets/translations/client/en.json';
import defaultCopyrightSemanticsLanguageFile from '../assets/translations/copyright-semantics/en.json';
import defaultMetadataSemanticsLanguageFile from '../assets/translations/metadata-semantics/en.json';
import editorAssetList from './editorAssetList.json';
import defaultRenderer from './renderers/default';
import supportedLanguageList from '../assets/editorLanguages.json';
import variantEquivalents from '../assets/variantEquivalents.json';

import ContentUserDataManager from './ContentUserDataManager';

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
    IContentUserDataStorage,
    IEditorModel,
    IH5PConfig,
    IH5PEditorOptions,
    IHubInfo,
    IIntegration,
    IKeyValueStorage,
    ILibraryDetailedDataForClient,
    ILibraryInstallResult,
    ILibraryMetadata,
    ILibraryName,
    ILibraryOverviewForClient,
    ILibraryStorage,
    ILumiEditorIntegration,
    ISemanticsEntry,
    ITemporaryFileStorage,
    ITranslationFunction,
    IUrlGenerator,
    IUser
} from './types';
import UrlGenerator from './UrlGenerator';
import SemanticsLocalizer from './SemanticsLocalizer';
import SimpleTranslator from './helpers/SimpleTranslator';
import DependencyGetter from './DependencyGetter';
import ContentHub from './ContentHub';
import { downloadFile } from './helpers/downloadFile';
import { LaissezFairePermissionSystem } from './implementation/LaissezFairePermissionSystem';

const log = new Logger('H5PEditor');

export default class H5PEditor {
    /**
     * @param cache the cache is used to store key - value pairs that must be
     * accessed often; values stored in it must be accessible by ALL instances
     * of the editor (across machines)
     * @param config the configuration values for the editor; note that the
     * editor can also change these values and save them!
     * @param libraryStorage the storage object for libraries
     * @param contentStorage the storage object for content
     * @param temporaryStorage the storage object for temporary files
     * @param translationCallback a function that is called to retrieve
     * translations of keys in a certain language; the keys use the i18next
     * format (e.g. namespace:key). See the ITranslationFunction documentation
     * for more details.
     * @param urlGenerator creates url strings for files, can be used to
     * customize the paths in an implementation application
     * @param options more options to customize the behavior of the editor; see
     * IH5PEditorOptions documentation for more details
     */
    constructor(
        protected cache: IKeyValueStorage,
        public config: IH5PConfig,
        public libraryStorage: ILibraryStorage,
        public contentStorage: IContentStorage,
        public temporaryStorage: ITemporaryFileStorage,
        translationCallback: ITranslationFunction = new SimpleTranslator({
            // We use a simplistic translation function that is hard-wired to
            // English if the implementation does not pass us a proper one.
            client: defaultClientLanguageFile,
            'metadata-semantics': defaultMetadataSemanticsLanguageFile,
            'copyright-semantics': defaultCopyrightSemanticsLanguageFile
        }).t,
        private urlGenerator: IUrlGenerator = new UrlGenerator(config),
        private options?: IH5PEditorOptions,
        public contentUserDataStorage?: IContentUserDataStorage
    ) {
        log.info('initialize');

        const permissionSystem =
            options?.permissionSystem ?? new LaissezFairePermissionSystem();

        this.config = config;

        this.renderer = defaultRenderer;
        this.contentTypeCache = new ContentTypeCache(
            config,
            cache,
            this.options?.getLocalIdOverride
        );
        this.contentHub = new ContentHub(config, cache);
        this.libraryManager = new LibraryManager(
            libraryStorage,
            this.urlGenerator.libraryFile,
            this.options?.customization?.alterLibrarySemantics,
            this.options?.customization?.alterLibraryLanguageFile,
            this.options?.enableLibraryNameLocalization
                ? translationCallback
                : undefined,
            this.options?.lockProvider,
            this.config
        );
        this.contentManager = new ContentManager(
            contentStorage,
            permissionSystem,
            contentUserDataStorage
        );
        this.contentTypeRepository = new ContentTypeInformationRepository(
            this.contentTypeCache,
            this.libraryManager,
            config,
            permissionSystem,
            options?.enableHubLocalization ? translationCallback : undefined
        );
        this.temporaryFileManager = new TemporaryFileManager(
            temporaryStorage,
            this.config,
            permissionSystem
        );

        this.contentUserDataManager = new ContentUserDataManager(
            contentUserDataStorage,
            permissionSystem
        );
        this.contentStorer = new ContentStorer(
            this.contentManager,
            this.libraryManager,
            this.temporaryFileManager
        );
        this.packageImporter = new PackageImporter(
            this.libraryManager,
            this.config,
            permissionSystem,
            this.contentManager,
            this.contentStorer
        );
        this.packageExporter = new PackageExporter(
            this.libraryManager,
            this.contentStorage,
            config
        );
        this.semanticsLocalizer = new SemanticsLocalizer(translationCallback);
        this.dependencyGetter = new DependencyGetter(libraryStorage);

        this.globalCustomScripts =
            this.options?.customization?.global?.scripts || [];
        if (this.config.customization?.global?.editor?.scripts) {
            this.globalCustomScripts = this.globalCustomScripts.concat(
                this.config.customization.global?.editor.scripts
            );
        }

        this.globalCustomStyles =
            this.options?.customization?.global?.styles || [];
        if (this.config.customization?.global?.editor?.styles) {
            this.globalCustomStyles = this.globalCustomStyles.concat(
                this.config.customization.global?.editor.styles
            );
        }
        const jsonValidator = new Ajv();
        ajvKeywords(jsonValidator, 'regexp');
        const saveMetadataJsonSchema = fsExtra.readJSONSync(
            path.join(__dirname, 'schemas/save-metadata.json')
        );
        const libraryNameSchema = fsExtra.readJSONSync(
            path.join(__dirname, 'schemas/library-name-schema.json')
        );
        jsonValidator.addSchema([saveMetadataJsonSchema, libraryNameSchema]);
        this.contentMetadataValidator = jsonValidator.compile(
            saveMetadataJsonSchema
        );
    }

    public contentHub: ContentHub;
    public contentManager: ContentManager;
    public contentTypeCache: ContentTypeCache;
    public contentTypeRepository: ContentTypeInformationRepository;
    public contentUserDataManager: ContentUserDataManager;
    public libraryManager: LibraryManager;
    public packageImporter: PackageImporter;
    public temporaryFileManager: TemporaryFileManager;
    private contentMetadataValidator: ValidateFunction;

    private contentStorer: ContentStorer;
    private copyrightSemantics: ISemanticsEntry =
        defaultCopyrightSemantics as ISemanticsEntry;
    private dependencyGetter: DependencyGetter;
    private globalCustomScripts: string[] = [];
    private globalCustomStyles: string[] = [];
    private metadataSemantics: ISemanticsEntry[] =
        defaultMetadataSemantics as ISemanticsEntry[];
    private packageExporter: PackageExporter;
    private renderer: (model: IEditorModel) => string | any;
    private semanticsLocalizer: SemanticsLocalizer;

    /**
     * Generates cache buster strings that are used by the JavaScript client in
     * the browser when generating URLs of core JavaScript files (only rarely
     * used).
     *
     * If you want to customize cache busting, you can override this generator.
     * The default generator creates strings like '?version=1.24.0', which are
     * simply added to the URL.
     */
    public cacheBusterGenerator = (): string =>
        `?version=${this.config.h5pVersion}`;

    /**
     * Deletes a piece of content and all files dependent on it.
     * @param contentId the piece of content to delete
     * @param user the user who wants to delete it
     */
    public async deleteContent(
        contentId: ContentId,
        user: IUser
    ): Promise<void> {
        await this.contentManager.deleteContent(contentId, user);

        if (this.options?.hooks?.contentWasDeleted) {
            this.options.hooks.contentWasDeleted(contentId, user);
        }
    }

    /**
     * Creates a .h5p-package for the specified content file and pipes it to the
     * stream. Throws H5pErrors if something goes wrong. The contents of the
     * stream should be disregarded then.
     *
     * IMPORTANT: This method's returned promise will resolve BEFORE piping to
     * the writeable has been finished. If you outputStream is directly piped to
     * a download that's not an issue, but if you do something else with this
     * stream, you have to wait for the piping to finish by subscribing to the
     * 'finish' event of the stream!
     *
     * @param contentId The contentId for which the package should be created.
     * @param outputWritable The writable that the package is written to (e.g.
     * the response stream fo Express)
     */
    public async exportContent(
        contentId: ContentId,
        outputWritable: Writable,
        user: IUser
    ): Promise<void> {
        return this.packageExporter.createPackage(
            contentId,
            outputWritable,
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
     * Returns a readable for a file that was uploaded for a content object.
     * The requested content file can be a temporary file uploaded for unsaved content or a
     * file in permanent content storage.
     * @param contentId the content id (undefined if retrieved for unsaved content)
     * @param filename the file to get (without 'content/' prefix!)
     * @param user the user who wants to retrieve the file
     * @param rangeStart (optional) the position in bytes at which the stream should start
     * @param rangeEnd (optional) the position in bytes at which the stream should end
     * @returns a readable of the content file
     */
    public async getContentFileStream(
        contentId: ContentId,
        filename: string,
        user: IUser,
        rangeStart?: number,
        rangeEnd?: number
    ): Promise<Readable> {
        // We have to try the regular content repository first and then fall back to the temporary storage.
        // This is necessary as the H5P client ignores the '#tmp' suffix we've added to temporary files.
        if (contentId) {
            try {
                // we don't directly return the result of the getters as try - catch would not work then
                const returnStream =
                    await this.contentManager.getContentFileStream(
                        contentId,
                        filename,
                        user,
                        rangeStart,
                        rangeEnd
                    );
                return returnStream;
            } catch (error) {
                log.debug(
                    `Couldn't find file ${filename} in storage. Trying temporary storage.`
                );
            }
        }
        return this.temporaryFileManager.getFileStream(
            filename,
            user,
            rangeStart,
            rangeEnd
        );
    }

    /**
     * Returns the content type cache for a specific user. This includes all
     * available content types for the user (some might be restricted) and what
     * the user can do with them (update, install from Hub).
     */
    public getContentTypeCache(
        user: IUser,
        language?: string
    ): Promise<IHubInfo> {
        log.info(`getting content type cache`);
        return this.contentTypeRepository.get(user, language);
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
        // the constructor also validates the parameters, so we don't check them
        // again
        const library = new LibraryName(
            machineName,
            majorVersionAsNr,
            minorVersionAsNr
        );
        this.validateLanguageCode(language);

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
            this.libraryManager.getLibrary(library, language),
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
    ): Promise<Readable> {
        LibraryName.validate(library);
        return this.libraryManager.getFileStream(library, filename);
    }

    /**
     * Gets a rough overview of information about the requested libraries.
     * @param ubernames
     * @param language (optional) if set, the system will try to localize the
     * title of the library (the namespace 'library-metadata' must be loaded in
     * the i18n system)
     */
    public async getLibraryOverview(
        ubernames: string[],
        language?: string
    ): Promise<ILibraryOverviewForClient[]> {
        log.debug(
            `getting library overview for libraries: ${ubernames.join(
                ', '
            )}. Requested language: ${language}`
        );
        return (
            await Promise.all(
                ubernames
                    .map((name) =>
                        LibraryName.fromUberName(name, {
                            useWhitespace: true
                        })
                    )
                    .filter((lib) => lib !== undefined) // we filter out undefined values as Library.creatFromNames returns undefined for invalid names
                    .map(async (lib) => {
                        try {
                            const loadedLibrary =
                                await this.libraryManager.getLibrary(
                                    lib,
                                    language
                                );
                            if (!loadedLibrary) {
                                return undefined;
                            }
                            return {
                                majorVersion: loadedLibrary.majorVersion,
                                metadataSettings:
                                    loadedLibrary.metadataSettings || null,
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
     * @param machineName The name of the content type to install (e.g. H5P.Test) Note that this is not a full ubername!
     * @returns a list of installed libraries if successful. Will throw errors if something goes wrong.
     */
    public async installLibraryFromHub(
        machineName: string,
        user: IUser
    ): Promise<ILibraryInstallResult[]> {
        LibraryName.validateMachineName(machineName);
        return this.contentTypeRepository.installContentType(machineName, user);
    }

    /**
     * Retrieves the installed languages for libraries
     * @param libraryUbernames A list of libraries for which the language files
     * should be retrieved. In this list the names of the libraries don't use
     * hyphens to separate machine name and version.
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
        this.validateLanguageCode(language);
        return (
            await Promise.all(
                libraryUbernames.map(async (name) => {
                    const lib = LibraryName.fromUberName(name, {
                        useWhitespace: true
                    });
                    return {
                        languageString: await this.libraryManager.getLanguage(
                            lib,
                            language
                        ),
                        name
                    };
                })
            )
        ).reduce((builtObject: any, { languageString, name }) => {
            if (languageString) {
                builtObject[name] = languageString;
            }
            return builtObject;
        }, {});
    }

    /**
     * Renders the content. This means that a frame in which the editor is
     * displayed is generated and returned. You can override the default frame
     * by calling setRenderer(...).
     * @param contentId
     * @param language the language to use; defaults to English
     * @param user the user who uses the editor
     * @returns the rendered frame that you can include in your website.
     * Normally a string, but can be anything you want it to be if you override
     * the renderer.
     */
    public render(
        contentId: ContentId,
        // eslint-disable-next-line @typescript-eslint/default-param-last
        language: string = 'en',
        user: IUser
    ): Promise<string | any> {
        log.info(`rendering ${contentId}`);
        this.validateLanguageCode(language);

        const model: IEditorModel = {
            integration: this.generateIntegration(contentId, language, user),
            scripts: this.listCoreScripts(language),
            styles: this.listCoreStyles(),
            urlGenerator: this.urlGenerator
        };

        return Promise.resolve(this.renderer(model));
    }

    /**
     * Stores an uploaded file in temporary storage.
     * @param contentId the id of the piece of content the file is attached to;
     * Set to null/undefined if the content hasn't been saved before.
     * @param field the semantic structure of the field the file is attached to.
     * @param file information about the uploaded file; either data or
     * tempFilePath must be used!
     * @returns information about the uploaded file
     */
    public async saveContentFile(
        contentId: ContentId,
        field: ISemanticsEntry,
        file: {
            data?: Buffer;
            mimetype: string;
            name: string;
            size: number;
            tempFilePath?: string;
        },
        user: IUser
    ): Promise<{
        height?: number;
        mime: string;
        path: string;
        width?: number;
    }> {
        // We extract the image size from the file as some content types need
        // the dimensions of the image.
        let imageDimensions: {
            height: number;
            width: number;
        };
        if (
            (field.type === 'image' && !file.mimetype.startsWith('image/')) ||
            (field.type === 'video' && !file.mimetype.startsWith('video/')) ||
            (field.type === 'audio' && !file.mimetype.startsWith('audio/'))
        ) {
            throw new H5pError('upload-validation-error', {}, 400);
        }

        try {
            if (file.mimetype.startsWith('image/')) {
                imageDimensions = imageSize(
                    file.data?.length > 0 ? file.data : file.tempFilePath
                );
            }
        } catch (error) {
            // A caught error means that the file format is not supported by
            // image-size. This usually means that the file is corrupt.
            log.debug(`Invalid image upload: ${error}`);
            throw new H5pError('upload-validation-error', {}, 400);
        }

        const extension = path.extname(file.name).toLowerCase();
        const cleanExtension = extension.length > 1 ? extension.substr(1) : '';
        if (!this.config.contentWhitelist.split(' ').includes(cleanExtension)) {
            throw new H5pError('not-in-whitelist', {
                filename: file.name,
                'files-allowed': this.config.contentWhitelist
            });
        }

        // We discard the old filename and construct a new one
        let cleanFilename =
            // We check if the field type is allowed to protect against
            // injections
            (field.type &&
            [
                'file',
                'text',
                'number',
                'boolean',
                'group',
                'list',
                'select',
                'library',
                'image',
                'video',
                'audio'
            ].includes(field.type)
                ? field.type
                : 'file') + extension;

        // Some PHP implementations of H5P (Moodle) expect the uploaded files to
        // be in sub-directories of the content folder. To achieve
        // compatibility, we also put them into these directories by their
        // mime-types.
        cleanFilename = this.addDirectoryByMimetype(cleanFilename);

        let dataStream;
        if (file.data?.length > 0) {
            dataStream = new PassThrough();
            dataStream.end(file.data);
        } else if (file.tempFilePath) {
            dataStream = fsExtra.createReadStream(file.tempFilePath);
        } else {
            throw new Error(
                'Either file.data or file.tempFilePath must be used!'
            );
        }

        log.info(
            `Putting content file ${cleanFilename} into temporary storage`
        );
        const tmpFilename = await this.temporaryFileManager.addFile(
            cleanFilename,
            dataStream,
            user
        );

        // We close the stream to make sure the temporary file can be deleted
        // elsewhere.
        if (dataStream.close) {
            dataStream.close();
        }

        log.debug(`New temporary filename is ${tmpFilename}`);
        return {
            height: imageDimensions?.height,
            mime: file.mimetype,
            path: `${tmpFilename}#tmp`,
            width: imageDimensions?.width
        };
    }

    /**
     * Stores new content or updates existing content.
     * Copies over files from temporary storage if necessary.
     * @param contentId the contentId of existing content (undefined or previously unsaved content)
     * @param parameters the content parameters (=content.json)
     * @param metadata the content metadata (~h5p.json)
     * @param mainLibraryUbername the ubername with whitespace as separator (no hyphen!)
     * @param user the user who wants to save the piece of content
     * @returns the existing contentId or the newly assigned one
     */
    public async saveOrUpdateContent(
        contentId: ContentId,
        parameters: ContentParameters,
        metadata: IContentMetadata,
        mainLibraryUbername: string,
        user: IUser
    ): Promise<ContentId> {
        await this.contentUserDataManager.deleteInvalidatedContentUserDataByContentId(
            contentId
        );
        return (
            await this.saveOrUpdateContentReturnMetaData(
                contentId,
                parameters,
                metadata,
                mainLibraryUbername,
                user
            )
        ).id;
    }

    /**
     * Stores new content or updates existing content.
     * Copies over files from temporary storage if necessary.
     * @param contentId the contentId of existing content (undefined or previously unsaved content)
     * @param parameters the content parameters (=content.json)
     * @param metadata the content metadata (~h5p.json)
     * @param mainLibraryUbername the ubername with whitespace as separator (no hyphen!)
     * @param user the user who wants to save the piece of content
     * @returns the existing contentId or the newly assigned one and the metatdata
     */
    public async saveOrUpdateContentReturnMetaData(
        contentId: ContentId,
        parameters: ContentParameters,
        metadata: IContentMetadata,
        mainLibraryUbername: string,
        user: IUser
    ): Promise<{ id: string; metadata: IContentMetadata }> {
        if (contentId !== undefined) {
            log.info(`saving h5p content for ${contentId}`);
        } else {
            log.info('saving new content');
        }

        // validate library name
        let libraryName: ILibraryName;
        try {
            libraryName = LibraryName.fromUberName(mainLibraryUbername, {
                useWhitespace: true
            });
        } catch (error) {
            throw new H5pError(
                'invalid-main-library-name',
                { message: error.message },
                400
            );
        }

        // Validate metadata against schema
        if (!this.contentMetadataValidator(metadata)) {
            throw new Error('Metadata does not conform to schema.');
        }

        const h5pJson: IContentMetadata = await this.generateContentMetadata(
            metadata,
            libraryName,
            this.findLibrariesInParameters(parameters)
        );

        const newContentId = await this.contentStorer.addOrUpdateContent(
            contentId,
            parameters,
            h5pJson,
            libraryName,
            user
        );

        if (contentId && this.options?.hooks?.contentWasUpdated) {
            this.options.hooks.contentWasUpdated(
                newContentId,
                h5pJson,
                parameters,
                user
            );
        }
        if (!contentId && this.options?.hooks?.contentWasCreated) {
            this.options.hooks.contentWasCreated(
                newContentId,
                h5pJson,
                parameters,
                user
            );
        }

        return { id: newContentId, metadata: h5pJson };
    }

    /**
     * By setting custom copyright semantics, you can customize what licenses
     * are displayed when editing metadata of files.
     *
     * NOTE: It is unclear if copyrightSemantics is deprecated in the H5P
     * client. Use setMetadataSemantics instead, which certainly works.
     *
     * NOTE: The semantic structure is localized before delivered to the H5P
     * client. If you change it, you must either make sure there is a appropriate
     * language file loaded in your translation library (and set one in the
     * first place).
     * @param copyrightSemantics a semantic structure similar to the one used in
     * semantics.json of regular H5P libraries. See https://h5p.org/semantics
     * for more documentation. However, you can only add one entry (which can
     * be nested). See the file assets/defaultCopyrightSemantics.json for the
     * default version which you can build on.
     * @returns the H5PEditor object that you can use to chain method calls
     */
    public setCopyrightSemantics(
        copyrightSemantics: ISemanticsEntry
    ): H5PEditor {
        this.copyrightSemantics = copyrightSemantics;
        return this;
    }

    /**
     * By setting custom metadata semantics, you can customize what licenses are
     * displayed when editing metadata of content object and files.
     *
     * NOTE: It is only trivial to change the license offered as a a selection
     * to the editors. All other semantic entries CANNOT be changed, as the
     * form displayed in the editor is hard-coded in h5peditor-metadata.js in
     * the client. You'll have to replace this file with a custom implementation
     * if you want to change more metadata.
     *
     * NOTE: The semantic structure is localized before delivered to the H5P
     * client. If you change it, you must either make sure there is a appropriate
     * language file loaded in your translation library (and set one in the
     * first place).
     * @param metadataSemantics a semantic structure similar to the one used in
     * semantics.json of regular H5P libraries. See https://h5p.org/semantics
     * for more documentation. See the file assets/defaultMetadataSemantics.json
     * for the default version which you can build on
     * @returns the H5PEditor object that you can use to chain method calls
     */
    public setMetadataSemantics(
        metadataSemantics: ISemanticsEntry[]
    ): H5PEditor {
        this.metadataSemantics = metadataSemantics;
        return this;
    }

    /**
     * By setting a custom renderer you can change the way the editor produces
     * HTML output
     * @param renderer
     * @returns the H5PEditor object that you can use to chain method calls
     */
    public setRenderer(
        renderer: (model: IEditorModel) => string | any
    ): H5PEditor {
        this.renderer = renderer;
        return this;
    }

    /**
     * Adds the contents of a package to the system: Installs required libraries
     * (if the user has the permissions for this), adds files to temporary
     * storage and returns the actual content information for the editor to
     * process. Throws errors if something goes wrong.
     * @param dataOrPath the raw data of the h5p package as a buffer or the path
     * of the file in the local filesystem
     * @param user the user who is uploading the package; optional if
     * onlyInstallLibraries is set to true
     * @param options (optional) further options:
     * @param onlyInstallLibraries true if content should be disregarded
     * @returns the content information extracted from the package. The metadata
     * and parameters property will be undefined if onlyInstallLibraries was set
     * to true.
     */
    public async uploadPackage(
        dataOrPath: Buffer | string,
        user?: IUser,
        options?: {
            onlyInstallLibraries?: boolean;
        }
    ): Promise<{
        installedLibraries: ILibraryInstallResult[];
        metadata?: IContentMetadata;
        parameters?: any;
    }> {
        log.info(`uploading package`);

        let returnValues: {
            installedLibraries: ILibraryInstallResult[];
            metadata?: IContentMetadata;
            parameters?: any;
        };

        let filename: string;
        let tempFile: FileResult;

        // if we received a buffer of the file, we write the file to the local
        // temporary storage; otherwise we can simply use the path we received
        // in the parameters
        if (typeof dataOrPath !== 'string') {
            tempFile = await createTempFile({ postfix: '.h5p', keep: false });
            filename = tempFile.path;
            try {
                const dataStream = new PassThrough();
                dataStream.end(dataOrPath);
                const writeStream = fsExtra.createWriteStream(filename);
                try {
                    await promisepipe(dataStream, writeStream);
                } catch (error) {
                    throw new H5pError('upload-package-failed-tmp');
                }
            } catch (error) {
                if (tempFile) {
                    await tempFile.cleanup();
                }
                throw error;
            }
        } else {
            filename = dataOrPath;
        }

        try {
            if (options?.onlyInstallLibraries) {
                returnValues = {
                    installedLibraries:
                        await this.packageImporter.installLibrariesFromPackage(
                            filename
                        )
                };
            } else {
                returnValues =
                    await this.packageImporter.addPackageLibrariesAndTemporaryFiles(
                        filename,
                        user
                    );
            }
        } finally {
            if (tempFile) {
                await tempFile.cleanup();
            }
        }

        return returnValues;
    }

    /**
     * Downloads a .h5p file from the content hub. Then "uploads" the file as if
     * the user uploaded the file manually.
     * @param contentHubId the content hub id; this is a id of the external
     * service and not related to local contentId
     * @param user the user who is using the content hub; relevant for temporary
     * file access rights
     * @returns the content information extracted from the package.
     */
    public async getContentHubContent(
        contentHubId: string,
        user: IUser
    ): Promise<{
        installedLibraries: ILibraryInstallResult[];
        metadata?: IContentMetadata;
        parameters?: any;
    }> {
        log.debug(`Getting content hub content with id ${contentHubId}.`);
        return withFile(
            async ({ path: tmpFile }) => {
                await downloadFile(
                    `${this.config.contentHubContentEndpoint}/${contentHubId}/export`,
                    tmpFile,
                    this.config
                );
                log.debug(`Hub content downloaded to ${tmpFile}`);
                return this.uploadPackage(tmpFile, user);
            },
            {
                postfix: '.h5p',
                keep: false
            }
        );
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

    /**
     * Recursively crawls through the parameters and finds usages of libraries.
     * @param parameters the parameters to scan
     * @param collect a collecting object used by the recursion. Do not use
     * @returns a list of libraries that are referenced in the parameters
     */
    private findLibrariesInParameters(
        parameters: any,
        collect: any = {}
    ): ILibraryName[] {
        if (
            parameters === undefined ||
            parameters === null ||
            typeof parameters !== 'object'
        ) {
            return collect;
        }

        Object.keys(parameters).forEach((key: string) => {
            if (key === 'library' && typeof parameters[key] === 'string') {
                if (parameters[key].match(/.+ \d+\.\d+/)) {
                    collect[parameters[key]] = LibraryName.fromUberName(
                        parameters[key],
                        {
                            useWhitespace: true
                        }
                    );
                }
            } else {
                this.findLibrariesInParameters(parameters[key], collect);
            }
        });

        return Object.values(collect);
    }

    private async generateContentMetadata(
        metadata: IContentMetadata,
        mainLibrary: ILibraryName,
        contentDependencies: ILibraryName[] = []
    ): Promise<IContentMetadata> {
        log.info(`generating h5p.json`);

        const mainLibraryMetadata = await this.libraryManager.getLibrary(
            mainLibrary
        );
        const newMetadata: IContentMetadata = new ContentMetadata(
            metadata,
            { mainLibrary: mainLibraryMetadata.machineName },
            {
                preloadedDependencies: [
                    ...(await this.dependencyGetter.getDependentLibraries(
                        [...contentDependencies, mainLibrary],
                        {
                            preloaded: true
                        },
                        [mainLibrary]
                    )),
                    mainLibrary
                ]
            }
        );
        return newMetadata;
    }

    private generateEditorIntegration(
        contentId: ContentId,
        language: string,
        user: IUser
    ): ILumiEditorIntegration {
        log.info(`generating integration for ${contentId}`);
        return {
            ajaxPath: this.urlGenerator.ajaxEndpoint(user),
            apiVersion: {
                majorVersion: this.config.coreApiVersion.major,
                minorVersion: this.config.coreApiVersion.minor
            },
            assets: {
                css: this.listCoreStyles(),
                js: this.listCoreScripts(language)
            },
            copyrightSemantics: this.semanticsLocalizer.localize(
                this.copyrightSemantics,
                language
            ),
            fileIcon: {
                path: this.urlGenerator.editorLibraryFile(
                    'images/binary-file.png'
                ),
                height: 100,
                width: 100
            },
            filesPath: this.urlGenerator.temporaryFiles(),
            libraryUrl: this.urlGenerator.editorLibraryFiles(),
            metadataSemantics: this.semanticsLocalizer.localize(
                this.metadataSemantics,
                language
            ),
            nodeVersionId: contentId,
            language,
            hub: {
                contentSearchUrl: `${this.config.contentHubContentEndpoint}/search`
            },
            enableContentHub: this.config.contentHubEnabled
        };
    }

    private generateIntegration(
        contentId: ContentId,
        language: string,
        user: IUser
    ): IIntegration {
        return {
            ajax: {
                contentUserData: this.urlGenerator.contentUserData(user),
                setFinished: this.urlGenerator.setFinished(user)
            },
            ajaxPath: this.urlGenerator.ajaxEndpoint(user),
            editor: this.generateEditorIntegration(contentId, language, user),
            hubIsEnabled: true,
            l10n: {
                H5P: this.semanticsLocalizer.localize(
                    defaultClientStrings,
                    language,
                    true
                )
            },
            libraryConfig: this.config.libraryConfig,
            postUserStatistics: this.config.setFinishedEnabled,
            saveFreq:
                this.config.contentUserStateSaveInterval !== false
                    ? Math.round(
                          Number(this.config.contentUserStateSaveInterval) /
                              1000
                      ) || 1
                    : false,
            libraryUrl: this.urlGenerator.coreFiles(),
            pluginCacheBuster: this.cacheBusterGenerator(),
            url: this.urlGenerator.baseUrl(),
            fullscreenDisabled: this.config.disableFullscreen ? 1 : 0,
            user: {
                mail: user.email,
                name: user.name,
                id: user.id
            },
            Hub: {
                contentSearchUrl: `${this.config.contentHubContentEndpoint}/search`
            }
        };
    }

    /**
     * Returns a list of addons that should be used for the library
     * @param machineName the library identified by its machine name
     * @returns a list of addons
     */
    private async getAddonsForLibrary(
        machineName: string
    ): Promise<ILibraryMetadata[]> {
        log.debug('Getting list of installed addons.');
        const installedAddons = await this.libraryManager.listAddons();

        const neededAddons: ILibraryMetadata[] = [];
        // add addons that are required by the H5P library metadata extension
        for (const installedAddon of installedAddons) {
            // The property addTo.editor.machineNames is a custom
            // h5p-nodejs-library extension.
            if (
                installedAddon.addTo?.editor?.machineNames?.includes(
                    machineName
                ) ||
                installedAddon.addTo?.editor?.machineNames?.includes('*')
            ) {
                log.debug(
                    `Addon ${LibraryName.toUberName(
                        installedAddon
                    )} will be added to the editor.`
                );
                neededAddons.push(installedAddon);
            }
        }
        // add addons that are required by the server configuration
        const configRequestedAddons = [
            ...(this.config.editorAddons?.[machineName] ?? []),
            ...(this.config.editorAddons?.['*'] ?? [])
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
                    `Addon ${addonMachineName} will be added to the editor.`
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
     * Returns a functions that replaces the h5p editor language file with the
     * one for the language desired. Checks if the H5P editor core supports
     * a language and falls back to English if it doesn't. Also removes region
     * suffixes like the US in 'en-US' if it can't find a language file with
     * the suffix.
     * @param language
     */
    private getLanguageReplacer(language: string): (script: string) => string {
        const cleanLanguage = language.toLocaleLowerCase();

        // obvious case: the language file exists
        if (supportedLanguageList.includes(cleanLanguage)) {
            return (f) =>
                f.replace('language/en.js', `language/${cleanLanguage}.js`);
        }

        // check if equivalent variants exist (e.g. zh-hans, zh-cn, zh)
        const variantList = variantEquivalents.find((l) =>
            l.includes(cleanLanguage)
        );
        if (variantList) {
            const alternativeVariant = variantList.find((v) =>
                supportedLanguageList.includes(v)
            );
            if (alternativeVariant) {
                return (f) =>
                    f.replace(
                        'language/en.js',
                        `language/${alternativeVariant}.js`
                    );
            }
        }

        // fallback to language without variant code
        const languageWithoutVariant = cleanLanguage.replace(/-.+$/, '');
        if (supportedLanguageList.includes(languageWithoutVariant)) {
            return (f) =>
                f.replace(
                    'language/en.js',
                    `language/${languageWithoutVariant}.js`
                );
        }
        return (f) => f;
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

        if (!library) {
            throw new H5pError(
                'library-missing',
                {
                    library: LibraryName.toUberName(libraryName)
                },
                404,
                'when calling H5PEditor.listAssets'
            );
        }

        const addonsForLibrary = await this.getAddonsForLibrary(
            library.machineName
        );

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
            ),
            addonsForLibrary
                ? this.resolveDependencies(addonsForLibrary, language, loaded)
                : undefined
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

        let cssFiles: string[] = library.preloadedCss?.map((f) => f.path) || [];
        let jsFiles: string[] = library.preloadedJs?.map((f) => f.path) || [];

        // If configured in the options, we call a hook to change the files
        // included for certain libraries.
        if (this.options?.customization?.alterLibraryFiles) {
            log.debug('Calling alterLibraryFiles hook');
            const alteredFiles = this.options.customization.alterLibraryFiles(
                libraryName,
                jsFiles,
                cssFiles
            );
            jsFiles = alteredFiles?.scripts;
            cssFiles = alteredFiles?.styles;
        }

        jsFiles.forEach((script) =>
            assets.scripts.push(this.urlGenerator.libraryFile(library, script))
        );
        cssFiles.forEach((style) =>
            assets.styles.push(this.urlGenerator.libraryFile(library, style))
        );

        let parsedLanguageObject: any;
        try {
            parsedLanguageObject = JSON.parse(translation);
        } catch {
            parsedLanguageObject = undefined;
        }

        if (parsedLanguageObject) {
            assets.translations[libraryName.machineName] = parsedLanguageObject;
        }

        return assets;
    }

    private listCoreScripts(language: string): string[] {
        const replacer = this.getLanguageReplacer(language);

        return editorAssetList.scripts.core
            .map(this.urlGenerator.coreFile)
            .concat(
                editorAssetList.scripts.editor
                    .map(replacer)
                    .map(this.urlGenerator.editorLibraryFile)
            )
            .concat(this.globalCustomScripts);
    }

    private listCoreStyles(): string[] {
        return editorAssetList.styles.core
            .map(this.urlGenerator.coreFile)
            .concat(
                editorAssetList.styles.editor.map(
                    this.urlGenerator.editorLibraryFile
                )
            )
            .concat(this.globalCustomStyles);
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

    private validateLanguageCode(languageCode: string): void {
        // We are a bit more tolerant than the ISO standard, as there are three
        // character languages codes and country codes like 'hans' for
        // 'zh-hans'.
        if (!/^[a-z]{2,3}(-[A-Z]{2,6})?$/i.test(languageCode)) {
            throw new Error(`Language code ${languageCode} is invalid.`);
        }
    }
}
