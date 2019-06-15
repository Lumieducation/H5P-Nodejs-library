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

    async isOutdated() {
        const lastUpdate = await this.storage.load("contentTypeCacheUpdate");
        return (!lastUpdate || (Date.now()) - lastUpdate > this.config.contentTypeCacheRefreshInterval)
    }

    /**
     * Checks if the interval between updates has been exceeded and updates the cache if necessary.
     * @returns {boolean} true if cache was updated, false if not
     */
    async updateIfNecessary() {
        const oldCache = await this.storage.load("contentTypeCache");
        if (!oldCache || await this.isOutdated()) {
            await this.forceUpdate();
            return true;
        }
        return false;
    }

    /**
     * Downloads the content type information from the H5P Hub and stores it in the storage object.
     */
    async forceUpdate() {
        const cache = await this._downloadContentTypesFromHub();
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
     * If the running site has already been registered at the H5P hub, this method will
     * return the UUID of it. If it hasn't been registered yet, it will do so and store
     * the UUID in the storage object.
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
     * @returns An object with the registration data as required by the H5P Hub
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
            core_api_version: `${this.config.coreApiVersion.major}.${this.config.coreApiVersion.minor}`
        };
    }

    /**
     * @returns An object with usage statistics as required by the H5P Hub
     */
    // eslint-disable-next-line class-methods-use-this
    _compileUsageStatistics() {
        return {
            num_authors: 0, // number of active authors
            libraries: {} // TODO: add library information here
        };
    }

    /**
     * Downloads information about available content types from the H5P Hub. This method will
     * create a UUID to identify this site if required. 
     * @returns {Array} content types
     */
    async _downloadContentTypesFromHub() {
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

        return response.data.contentTypes.map(ContentTypeCache.mapCacheEntryToLocalFormat);
    }

    static mapCacheEntryToLocalFormat(entry) {
        return {
            machineName: entry.id,
            majorVersion: entry.version.major,
            minorVersion: entry.version.minor,
            patchVersion: entry.version.patch,
            h5pMajorVersion: entry.coreApiVersionNeeded.major,
            h5pMinorVersion: entry.coreApiVersionNeeded.minor,
            title: entry.title,
            summary: entry.summary,
            description: entry.description,
            icon: entry.icon,
            createdAt: Date.parse(entry.createdAt),
            updatedAt: Date.parse(entry.updatedAt),
            isRecommended: entry.isRecommended,
            popularity: entry.popularity,
            screenshot: entry.screenshot,
            license: entry.license,
            owner: entry.owner,
            example: entry.example,
            tutorial: entry.tutorial || '',
            keywords: entry.keywords || [],
            categories: entry.categories || [],
        };
    }

    /**
     * Creates an identifier for the running instance.
     * @returns {string} id
     */
    static _generateLocalId() {
        return crc32(__dirname);
    }
}

module.exports = ContentTypeCache;
