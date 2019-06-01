class H5PEditorConfig {
    /**
     * 
     * @param {IStorage} storage 
     */
    constructor(storage) {
        this._storage = storage;
        this.platformName = 'H5P-Editor-NodeJs';
        this.platformVersion = '0.0';
        this.h5pVersion = '1.22';
        this.coreApiVersion = '1.19';

        /**
         * Unclear.
         */
        this.fetchingDisabled = 0;

        /**
         * Used to identify the running instance when calling the H5P Hub.
         */
        this.uuid = '80b421c0-7a12-49db-90cf-489845778690'; // TODO: revert to''

        /**
         * Unclear.
         */
        this.siteType = 'local';

        /**
         * If true, the instance will send usage statistics to the H5P Hub whenever it looks for new content types or updates.
         */
        this.sendUsageStatistics = false;

        /**
         * Called to register the running instance at the H5P Hub.
         */
        this.hubRegistrationEndpoint = 'https://api.h5p.org/v1/sites';

        /**
         * Called to fetch information about the content types available at the H5P Hub.
         */
        this.hubContentTypesEndpoint = 'https://api.h5p.org/v1/content-types/';
    }

    /**
     * 
     * @param {string} settingName 
     */
    async loadSettingFromStorage(settingName) {
        this[settingName] = (await this._storage.load(settingName)) || this[settingName];
    }

    /**
     * 
     * @param {string} settingName 
     */
    async saveSettingToStorage(settingName) {
        await this._storage.save(settingName, this[settingName]);
    }

    async load() {
        await this.loadSettingFromStorage("fetchingDisabled");
        await this.loadSettingFromStorage("uuid");
        await this.loadSettingFromStorage("siteType");
        await this.loadSettingFromStorage("sendUsageStatistics");
    }

    async save() {
        await this.saveSettingToStorage("fetchingDisabled");
        await this.saveSettingToStorage("uuid");
        await this.saveSettingToStorage("siteType");
        await this.saveSettingToStorage("sendUsageStatistics");
    }
}

module.exports = H5PEditorConfig;