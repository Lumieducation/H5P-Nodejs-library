const { crc32 } = require('crc');
const axios = require('axios');
const merge = require('merge');
const qs = require('qs');

class ContentTypeCache {
    constructor(config) {
        this.config = config;
    }

    /**
     * The actual cache data.
     */
    getCache() {
        return this._fetchContentTypes();
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
    _compileUsageStatistics() {
        return {
            num_authors: 0, // number of active authors
            libraries: {} // TODO: add library information here
        };
    }

    /**
     * @returns {Array} content types
     */
    async _fetchContentTypes() {
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
