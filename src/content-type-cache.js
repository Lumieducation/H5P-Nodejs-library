const { crc32 } = require('crc');
const axios = require('axios');
const merge = require('merge');
const qs = require('qs');

/**
 * This class caches the information about the content types on the H5P Hub.
 * 
 * Get the content type information by calling get(). 
 * The method updateIfNecessary() should be called regularly, e.g. through a cron-job.
 * Use contentTypeCacheRefreshInterval in the H5PEditorConfig object to set how often
 * the update should be performed. You can also use forceUpdate() if you want to bypass the 
 * interval. 
 */
class ContentTypeCache {
    /**
     * 
     * @param {H5PEditorConfig} config The configuration to use.
     * @param {IStorage} storage The storage object.
     */
    constructor(config, storage) {
        this.config = config;
        this.storage = storage;
    }

    /**
     * Checks if the interval between updates has been exceeded and updates the cache if necessary.
     * @returns {boolean} true if cache was updated, false if not
     */
    async updateIfNecessary() {
        const lastUpdate = await this.storage.load("contentTypeCacheUpdate");
        const oldCache = await this.storage.load("contentTypeCache");
        if (!lastUpdate || !oldCache || (Date.now()) - lastUpdate > this.config.contentTypeCacheRefreshInterval) {
            await this.forceUpdate();
            return true;
        }
        return false;
    }

    /**
     * Downloads the content type information from the H5P Hub and stores it in the storage object.
     */
    async forceUpdate() {
        const cache = await this._fetchContentTypesFromHub();
        await this.storage.save("contentTypeCache", cache);
        await this.storage.save("contentTypeCacheUpdate", Date.now());
    }

    /**
     * Returns the cache data.
     */
    async get() {
        return this.storage.load("contentTypeCache");
    }

    /**
     * @returns {string} uuid
     */
    async _registerOrGetUuid() {
        if (this.config.uuid) {
            return this.config.uuid;
        }
        const response = await axios.post(this.config.hubRegistrationEndpoint,
            this._compileRegistrationData());
        if (response.status !== 200) {
            throw new Error(`Could not register this site at the H5P Hub. HTTP status ${response.status} ${response.statusText}`);
        }
        if (!response.data || !response.data.uuid) {
            throw new Error("Could not register this site at the H5P Hub.");
        }
        this.config.uuid = response.data.uuid;
        await this.config.save();
        return this.config.uuid;
    }

    /**
     * @returns registration data
     */
    _compileRegistrationData() {
        return {
            uuid: this.config.uuid,
            platform_name: this.config.platformName,
            platform_version: this.config.platformVersion,
            h5p_version: this.config.h5pVersion,
            disabled: this.config.fetchingDisabled,
            local_id: ContentTypeCache._generateLocalId(),
            type: this.config.siteType,
            core_api_version: this.config.coreApiVersion
        };
    }

    /**
     * @returns usage statistic
     */
    // eslint-disable-next-line class-methods-use-this
    _compileUsageStatistics() {
        return {
            num_authors: 0, // number of active authors
            libraries: {} // TODO: add library information here
        };
    }

    /**
     * @returns {Array} content types
     */
    async _fetchContentTypesFromHub() {
        await this._registerOrGetUuid();
        let formData = this._compileRegistrationData();
        if (this.config.sendUsageStatistics) {
            formData = merge.recursive(true, formData, this._compileUsageStatistics());
        }

        const response = await axios.post(this.config.hubContentTypesEndpoint, qs.stringify(formData));
        if (response.status !== 200) {
            throw new Error(`Could not fetch content type information from the H5P Hub. HTTP status ${response.status} ${response.statusText}`);
        }
        if (!response.data) {
            throw new Error("Could not fetch content type information from the H5P Hub.");
        }

        return response.data;
    }

    /**
     * @returns {string} id
     */
    static _generateLocalId() {
        return crc32(__dirname);
    }
}

module.exports = ContentTypeCache;
