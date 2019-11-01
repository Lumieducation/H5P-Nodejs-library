import { IEditorConfig, IKeyValueStorage } from '../../src/types';

/**
 * Stores configuration options and literals that are used throughout the system.
 * Also loads and saves the configuration of changeable values (only those as "user-configurable") in the storage object.
 */
export default class EditorConfig implements IEditorConfig {
    /**
     * @param {IStorage} storage A key-value storage object that persists the changes to the disk or gets them from the implementation/plugin
     */
    constructor(storage: IKeyValueStorage) {
        this.storage = storage;
    }

    public ajaxPath: string = '/ajax?action=';

    public baseUrl: string = '/h5p';

    /**
     * Time after which the content type cache is considered to be outdated in milliseconds.
     * User-configurable.
     */
    public contentTypeCacheRefreshInterval: number = 1 * 1000 * 60 * 60 * 24;

    /**
     * A list of file extensions allowed for content files. (Extensions separated by whitespaces)
     */
    public contentWhitelist: string =
        'json png jpg jpeg gif bmp tif tiff svg eot ttf woff woff2 otf webm mp4 ogg mp3 m4a wav txt pdf rtf doc docx xls xlsx ppt pptx odt ods odp xml csv diff patch swf md textile vtt webvtt';

    /**
     * This is the version of the H5P Core (JS + CSS) that is used by this implementation.
     * It is sent to the H5P Hub when registering there.
     * Not user-configurable and should not be changed by custom implementations.
     */
    public coreApiVersion: { major: number; minor: number } = {
        major: 1,
        minor: 23
    };

    /**
     * If set to true, the content types that require a Learning Record Store to make sense are
     * offered as a choice when the user creates new content.
     * User-configurable.
     */
    public enableLrsContentTypes: boolean = true;

    /**
     * Unclear. Taken over from PHP implementation and sent to the H5P Hub when registering the site.
     * User-configurable.
     */
    public fetchingDisabled: 0 | 1 = 0;

    /**
     * This is where the client will look for image, video etc. files added to content.
     */
    public filesPath: string = '/h5p/content';

    /**
     * This is the version of the PHP implementation that the NodeJS implementation imitates.
     * It is sent to the H5P Hub when registering there.
     * Not user-configurable and should not be changed by custom implementations.
     */
    public h5pVersion: string = '1.24';

    /**
     * Called to fetch information about the content types available at the H5P Hub.
     * User-configurable.
     */
    public hubContentTypesEndpoint: string =
        'https://api.h5p.org/v1/content-types/';

    /**
     * Called to register the running instance at the H5P Hub.
     * User-configurable.
     */
    public hubRegistrationEndpoint: string = 'https://api.h5p.org/v1/sites';

    /**
     * The EDITOR LIBRARY FILES are loaded from here (needed for the ckeditor), NOT
     * the libraries itself.
     */
    public libraryUrl: string = '/h5p/editor/';

    /**
     * A list of file extensions allowed for library files.
     * (All extensions allowed for content files are also automatically allowed for libraries).
     */
    public libraryWhitelist: string = 'js css';

    /**
     * The list of content types that are enabled when enableLrsContentTypes is set to true.
     * Not user-configurable.
     */
    public lrsContentTypes: string[] = [
        'H5P.Questionnaire',
        'H5P.FreeTextQuestion'
    ];

    /**
     * The maximum allowed file size of content and library files (in bytes).
     */
    public maxFileSize: number = 16 * 1024 * 1024;

    /**
     * The maximum allowed file size of all content and library files in an uploaded h5p package (in bytes).
     */
    public maxTotalSize: number = 64 * 1024 * 1024;

    /**
     * This is the name of the H5P implementation sent to the H5P for statistical reasons.
     * Not user-configurable but should be overridden by custom custom implementations.
     */
    public platformName: string = 'H5P-Editor-NodeJs';

    /**
     * This is the version of the H5P implementation sent to the H5P when registering the site.
     * Not user-configurable but should be overridden by custom custom implementations.
     */
    public platformVersion: string = '0.1';

    /**
     * If true, the instance will send usage statistics to the H5P Hub whenever it looks for new content types or updates.
     * User-configurable.
     */
    public sendUsageStatistics: boolean = false;

    /**
     * Indicates on what kind of network the site is running. Can be "local", "network" or "internet".
     * TODO: This value should not be user-configurable, but has to be determined by the system on startup.
     * (If possible.)
     */
    public siteType: 'local' | 'network' | 'internet' = 'local';

    /**
     * Temporary files will be deleted after this time. (in milliseconds)
     */
    public temporaryFileLifetime: number = 120 * 60 * 1000; // 120 minutes

    /**
     * The URL path of temporary file storage (used for image, video etc. uploads of
     * unsaved content).
     */
    public temporaryFilesPath: string = '/h5p/temp-files';

    /**
     * Used to identify the running instance when calling the H5P Hub.
     * User-configurable, but also automatically set when the Hub is first called.
     */
    public uuid: string = ''; // TODO: revert to''

    private storage: IKeyValueStorage;

    /**
     * Loads all changeable settings from storage. (Should be called when the system initializes.)
     */
    public async load(): Promise<EditorConfig> {
        await this.loadSettingFromStorage('fetchingDisabled');
        await this.loadSettingFromStorage('uuid');
        await this.loadSettingFromStorage('siteType');
        await this.loadSettingFromStorage('sendUsageStatistics');
        await this.loadSettingFromStorage('hubRegistrationEndpoint');
        await this.loadSettingFromStorage('hubContentTypesEndpoint');
        await this.loadSettingFromStorage('contentTypeCacheRefreshInterval');
        await this.loadSettingFromStorage('enableLrsContentTypes');
        await this.loadSettingFromStorage('contentWhitelist');
        await this.loadSettingFromStorage('libraryWhitelist');
        await this.loadSettingFromStorage('maxFileSize');
        await this.loadSettingFromStorage('maxTotalSize');
        return this;
    }

    /**
     * Saves all changeable settings to storage. (Should be called when a setting was changed.)
     */
    public async save(): Promise<void> {
        await this.saveSettingToStorage('fetchingDisabled');
        await this.saveSettingToStorage('uuid');
        await this.saveSettingToStorage('siteType');
        await this.saveSettingToStorage('sendUsageStatistics');
        await this.saveSettingToStorage('hubRegistrationEndpoint');
        await this.saveSettingToStorage('hubContentTypesEndpoint');
        await this.saveSettingToStorage('contentTypeCacheRefreshInterval');
        await this.saveSettingToStorage('enableLrsContentTypes');
        await this.saveSettingToStorage('contentWhitelist');
        await this.saveSettingToStorage('libraryWhitelist');
        await this.saveSettingToStorage('maxFileSize');
        await this.saveSettingToStorage('maxTotalSize');
    }

    /**
     * Loads a settings from the storage interface. Uses the default value configured in this file if there is none in the configuration.
     * @param settingName
     * @returns the value of the setting
     */
    private async loadSettingFromStorage(settingName: string): Promise<any> {
        this[settingName] =
            (await this.storage.load(settingName)) || this[settingName];
    }

    /**
     * Saves a setting to the storage interface.
     * @param settingName
     */
    private async saveSettingToStorage(settingName: string): Promise<void> {
        await this.storage.save(settingName, this[settingName]);
    }
}
