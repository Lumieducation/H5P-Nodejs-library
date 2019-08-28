/**
 * Stores configuration options and literals that are used throughout the system.
 * Also loads and saves the configuration of changeable values (only those as "user-configurable") in the storage object.
 */
class H5PEditorConfig {
    /**
     * @param {IStorage} storage A key-value storage object that persists the changes to the disk or gets them from the implementation/plugin
     */
    constructor(storage) {
        this._storage = storage;

        /**
         * This is the name of the H5P implementation sent to the H5P for statistical reasons. 
         * Not user-configurable but should be overridden by custom custom implementations. 
         */
        this.platformName = 'H5P-Editor-NodeJs';

        /**
         * This is the version of the H5P implementation sent to the H5P when registering the site. 
         * Not user-configurable but should be overridden by custom custom implementations. 
         */
        this.platformVersion = '0.1';

        /**
         * This is the version of the PHP implementation that the NodeJS implementation imitates. 
         * It is sent to the H5P Hub when registering there.
         * Not user-configurable and should not be changed by custom implementations.
         */
        this.h5pVersion = '1.22';

        /**
         * This is the version of the H5P Core (JS + CSS) that is used by this implementation.
         * It is sent to the H5P Hub when registering there.
         * Not user-configurable and should not be changed by custom implementations.
         */
        this.coreApiVersion = { major: 1, minor: 23 };

        /**
         * Unclear. Taken over from PHP implementation and sent to the H5P Hub when registering the site.
         * User-configurable.
         */
        this.fetchingDisabled = 0;

        /**
         * Used to identify the running instance when calling the H5P Hub.
         * User-configurable, but also automatically set when the Hub is first called.
         */
        this.uuid = ''; // TODO: revert to''

        /**
         * Unclear. Taken over from PHP implementation.
         */
        this.siteType = 'local';

        /**
         * If true, the instance will send usage statistics to the H5P Hub whenever it looks for new content types or updates.
         * User-configurable.
         */
        this.sendUsageStatistics = false;

        /**
         * Called to register the running instance at the H5P Hub.
         * User-configurable.
         */
        this.hubRegistrationEndpoint = 'https://api.h5p.org/v1/sites';

        /**
         * Called to fetch information about the content types available at the H5P Hub.
         * User-configurable.
         */
        this.hubContentTypesEndpoint = 'https://api.h5p.org/v1/content-types/';

        /** 
         * Time after which the content type cache is considered to be outdated in milliseconds. 
         * User-configurable. 
         */
        this.contentTypeCacheRefreshInterval = 1 * 1000 * 60 * 60 * 24;

        /**
         * If set to true, the content types that require a Learning Record Store to make sense are 
         * offered as a choice when the user creates new content.
         * User-configurable.
         */
        this.enableLrsContentTypes = true;

        /**
         * The list of content types that are enabled when enableLrsContentTypes is set to true.
         * Not user-configurable.
         */
        this.lrsContentTypes = ['H5P.Questionnaire', 'H5P.FreeTextQuestion'];

                /**
         * A list of file extensions allowed for content files. (Extensions separated by whitespaces)
         */
        this.contentWhitelist = 'json png jpg jpeg gif bmp tif tiff svg eot ttf woff woff2 otf webm mp4 ogg mp3 m4a wav txt pdf rtf doc docx xls xlsx ppt pptx odt ods odp xml csv diff patch swf md textile vtt webvtt';

        /**
         * A list of file extensions allowed for library files. 
         * (All extensions allowed for content files are also automatically allowed for libraries).
         */
        this.libraryWhitelist = 'js css';

        /**
         * The maximum allowed file size of content and library files (in bytes).
         */
        this.maxFileSize = 16*1024*1024;

        /**
         * The maximum allowed file size of all content and library files in an uploaded h5p package (in bytes).
         */
        this.maxTotalSize = 64*1024*1024;
    }

    /**
     * Loads a settings from the storage interface. Uses the default value configured in this file if there is none in the configuration.
     * @param {string} settingName 
     * @returns {Promise<any>} the value of the setting
     */
    async loadSettingFromStorage(settingName) {
        this[settingName] = (await this._storage.load(settingName)) || this[settingName];
    }

    /**
     * Saves a setting to the storage interface.
     * @param {string} settingName 
     */
    async saveSettingToStorage(settingName) {
        await this._storage.save(settingName, this[settingName]);
    }

    /**
     * Loads all changeable settings from storage. (Should be called when the system initializes.)
     */
    async load() {
        await this.loadSettingFromStorage("fetchingDisabled");
        await this.loadSettingFromStorage("uuid");
        await this.loadSettingFromStorage("siteType");
        await this.loadSettingFromStorage("sendUsageStatistics");
        await this.loadSettingFromStorage("hubRegistrationEndpoint");
        await this.loadSettingFromStorage("hubContentTypesEndpoint");
        await this.loadSettingFromStorage("contentTypeCacheRefreshInterval");
        await this.loadSettingFromStorage("enableLrsContentTypes");
        await this.loadSettingFromStorage("contentWhitelist");
        await this.loadSettingFromStorage("libraryWhitelist");
        await this.loadSettingFromStorage("maxFileSize");
        await this.loadSettingFromStorage("maxTotalSize");
        return this
    }

    /**
     * Saves all changeable settings to storage. (Should be called when a setting was changed.)
     */
    async save() {
        await this.saveSettingToStorage("fetchingDisabled");
        await this.saveSettingToStorage("uuid");
        await this.saveSettingToStorage("siteType");
        await this.saveSettingToStorage("sendUsageStatistics");
        await this.saveSettingToStorage("hubRegistrationEndpoint");
        await this.saveSettingToStorage("hubContentTypesEndpoint");
        await this.saveSettingToStorage("contentTypeCacheRefreshInterval");
        await this.saveSettingToStorage("enableLrsContentTypes");
        await this.saveSettingToStorage("contentWhitelist");
        await this.saveSettingToStorage("libraryWhitelist");
        await this.saveSettingToStorage("maxFileSize");
        await this.saveSettingToStorage("maxTotalSize");
    }
}

module.exports = H5PEditorConfig;