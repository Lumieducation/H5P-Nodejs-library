const { crc32 } = require('crc');
const axios = require('axios');
const merge = require('merge');
const qs = require('qs');

const ContentType = require('./content-type');

/**
 * This class caches the information about the content types on the H5P Hub.
 * 
 * IT DOES NOT exactly correspond to the ContentTypeCache of the original PHP implementation,
 * as it only caches the data (and converts it to a local format). It DOES NOT add information
 * about locally installed libraries and user rights. ContentTypeInformationRepository is meant to do this. 
 * 
 * Usage:
 * - Get the content type information by calling get(). 
 * - The method updateIfNecessary() should be called regularly, e.g. through a cron-job.
 * - Use contentTypeCacheRefreshInterval in the H5PEditorConfig object to set how often
 *   the update should be performed. You can also use forceUpdate() if you want to bypass the 
 *   interval. 
 */
class ContentTypeCache {
    /**
     * 
     * @param {H5PEditorConfig} config The configuration to use.
     * @param {IStorage} storage The storage object.
     */
    constructor(config, storage) {
        this._config = config;
        this._storage = storage;
    }

    /**
     * Checks if the cache is not up to date anymore (update interval exceeded).
     * @returns {Promise<boolean>} true if cache is outdated, false if not
     */
    async isOutdated() {
        const lastUpdate = await this._storage.load("contentTypeCacheUpdate");
        return (!lastUpdate || (Date.now()) - lastUpdate > this._config.contentTypeCacheRefreshInterval)
    }

    /**
     * Checks if the interval between updates has been exceeded and updates the cache if necessary.
     * @returns {Promise<boolean>} true if cache was updated, false if not
     */
    async updateIfNecessary() {
        const oldCache = await this._storage.load("contentTypeCache");
        if (!oldCache || await this.isOutdated()) {
            return this.forceUpdate();
        }
        return false;
    }

    /**
     * Downloads the content type information from the H5P Hub and stores it in the storage object.
     * @returns {Promise<boolean>} true if update was done; false if it failed (e.g. because Hub was unreachable)
     */
    async forceUpdate() {
        let cacheInHubFormat;
        try {
            cacheInHubFormat = await this._downloadContentTypesFromHub();
            if (!cacheInHubFormat) {
                return false;
            }
        }
        catch (error) {
            // TODO: Add error logging
            return false;
        }
        const cacheInInternalFormat = cacheInHubFormat.map(ContentTypeCache._convertCacheEntryToLocalFormat);
        await this._storage.save("contentTypeCache", cacheInInternalFormat);
        await this._storage.save("contentTypeCacheUpdate", Date.now());
        return true;
    }

    /**
     * Returns the cache data.
     * @param {string[]} machineNames (optional) The method only returns content type cache data for these machinen ames.
     * @returns {Promise<ContentType[]>} Cached hub data in a format in which the version objects are flattened into the main object, 
     */
    async get(...machineNames) {
        if (!machineNames || machineNames.length === 0) {
            return this._storage.load("contentTypeCache");
        }
        return (await this._storage.load("contentTypeCache"))
            .filter(contentType => machineNames
                .some(machineName => machineName === contentType.machineName));
    }

    /**
     * If the running site has already been registered at the H5P hub, this method will
     * return the UUID of it. If it hasn't been registered yet, it will do so and store
     * the UUID in the storage object.
     * @returns {Promise<string>} uuid
     */
    async _registerOrGetUuid() {
        if (this._config.uuid && this._config.uuid !== "") {
            return this._config.uuid;
        }
        const response = await axios.post(this._config.hubRegistrationEndpoint,
            this._compileRegistrationData());
        if (response.status !== 200) {
            throw new Error(`Could not register this site at the H5P Hub. HTTP status ${response.status} ${response.statusText}`);
        }
        if (!response.data || !response.data.uuid) {
            throw new Error("Could not register this site at the H5P Hub.");
        }
        this._config.uuid = response.data.uuid;
        await this._config.save();
        return this._config.uuid;
    }

    /**
     * @returns An object with the registration data as required by the H5P Hub
     */
    _compileRegistrationData() {
        return {
            uuid: this._config.uuid,
            platform_name: this._config.platformName,
            platform_version: this._config.platformVersion,
            h5p_version: this._config.h5pVersion,
            disabled: this._config.fetchingDisabled,
            local_id: ContentTypeCache._generateLocalId(),
            type: this._config.siteType,
            core_api_version: `${this._config.coreApiVersion.major}.${this._config.coreApiVersion.minor}`
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
     * @returns {Promise<any[]>} content types
     */
    async _downloadContentTypesFromHub() {
        await this._registerOrGetUuid();
        let formData = this._compileRegistrationData();
        if (this._config.sendUsageStatistics) {
            formData = merge.recursive(true, formData, this._compileUsageStatistics());
        }

        const response = await axios.post(this._config.hubContentTypesEndpoint, qs.stringify(formData));
        if (response.status !== 200) {
            throw new Error(`Could not fetch content type information from the H5P Hub. HTTP status ${response.status} ${response.statusText}`);
        }
        if (!response.data) {
            throw new Error("Could not fetch content type information from the H5P Hub.");
        }

        return response.data.contentTypes;
    }

    /**
     * Converts an entry from the H5P Hub into a format with flattened versions and integer date values.
     * @param {object} entry 
     * @returns {ContentType} the local content type object
     */
    static _convertCacheEntryToLocalFormat(entry) {
        return Object.assign(new ContentType(), {
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
            screenshots: entry.screenshots,
            license: entry.license,
            owner: entry.owner,
            example: entry.example,
            tutorial: entry.tutorial || '',
            keywords: entry.keywords || [],
            categories: entry.categories || [],
        });
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
