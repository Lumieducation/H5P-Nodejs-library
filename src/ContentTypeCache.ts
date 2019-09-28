import axios from 'axios';
import { crc32 } from 'crc';
import * as merge from 'merge';
import * as qs from 'qs';

import ContentType from './ContentType';
import EditorConfig from './EditorConfig';
import { IKeyValueStorage, IRegistrationData, IUsageStatistics } from './types';

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
export default class ContentTypeCache {
    /**
     *
     * @param {EditorConfig} config The configuration to use.
     * @param {IStorage} storage The storage object.
     */
    constructor(config: EditorConfig, storage: IKeyValueStorage) {
        this.config = config;
        this.storage = storage;
    }

    private config: EditorConfig;
    private storage: IKeyValueStorage;
    /**
     * Converts an entry from the H5P Hub into a format with flattened versions and integer date values.
     * @param entry the entry as received from H5P Hub
     * @returns the local content type object
     */
    private static convertCacheEntryToLocalFormat(entry: any): ContentType {
        return new ContentType({
            categories: entry.categories || [],
            createdAt: Date.parse(entry.createdAt),
            description: entry.description,
            example: entry.example,
            h5pMajorVersion: entry.coreApiVersionNeeded.major,
            h5pMinorVersion: entry.coreApiVersionNeeded.minor,
            icon: entry.icon,
            isRecommended: entry.isRecommended,
            keywords: entry.keywords || [],
            license: entry.license,
            machineName: entry.id,
            majorVersion: entry.version.major,
            minorVersion: entry.version.minor,
            owner: entry.owner,
            patchVersion: entry.version.patch,
            popularity: entry.popularity,
            screenshots: entry.screenshots,
            summary: entry.summary,
            title: entry.title,
            tutorial: entry.tutorial || '',
            updatedAt: Date.parse(entry.updatedAt)
        });
    }

    /**
     * Creates an identifier for the running instance.
     * @returns {string} id
     */
    private static generateLocalId(): string {
        return crc32(__dirname);
    }

    /**
     * Downloads information about available content types from the H5P Hub. This method will
     * create a UUID to identify this site if required.
     * @returns content types
     */
    public async downloadContentTypesFromHub(): Promise<any[]> {
        await this.registerOrGetUuid();
        let formData = this.compileRegistrationData();
        if (this.config.sendUsageStatistics) {
            formData = merge.recursive(
                true,
                formData,
                this.compileUsageStatistics()
            );
        }

        const response = await axios.post(
            this.config.hubContentTypesEndpoint,
            qs.stringify(formData)
        );
        if (response.status !== 200) {
            throw new Error(
                `Could not fetch content type information from the H5P Hub. HTTP status ${response.status} ${response.statusText}`
            );
        }
        if (!response.data) {
            throw new Error(
                'Could not fetch content type information from the H5P Hub.'
            );
        }

        return response.data.contentTypes;
    }

    /**
     * Downloads the content type information from the H5P Hub and stores it in the storage object.
     * @returns {Promise<boolean>} true if update was done; false if it failed (e.g. because Hub was unreachable)
     */
    public async forceUpdate(): Promise<boolean> {
        let cacheInHubFormat;
        try {
            cacheInHubFormat = await this.downloadContentTypesFromHub();
            if (!cacheInHubFormat) {
                return false;
            }
        } catch (error) {
            // TODO: Add error logging
            return false;
        }
        const cacheInInternalFormat = cacheInHubFormat.map(
            ContentTypeCache.convertCacheEntryToLocalFormat
        );
        await this.storage.save('contentTypeCache', cacheInInternalFormat);
        await this.storage.save('contentTypeCacheUpdate', Date.now());
        return true;
    }

    /**
     * Returns the cache data.
     * @param {string[]} machineNames (optional) The method only returns content type cache data for these machinen ames.
     * @returns {Promise<ContentType[]>} Cached hub data in a format in which the version objects are flattened into the main object,
     */
    public async get(...machineNames: string[]): Promise<ContentType[]> {
        if (!machineNames || machineNames.length === 0) {
            return this.storage.load('contentTypeCache');
        }
        return (await this.storage.load('contentTypeCache')).filter(
            (contentType: ContentType) =>
                machineNames.some(
                    (machineName: string) =>
                        machineName === contentType.machineName
                )
        );
    }

    /**
     * Checks if the cache is not up to date anymore (update interval exceeded).
     * @returns {Promise<boolean>} true if cache is outdated, false if not
     */
    public async isOutdated(): Promise<boolean> {
        const lastUpdate = await this.storage.load('contentTypeCacheUpdate');
        return (
            !lastUpdate ||
            Date.now() - lastUpdate >
                this.config.contentTypeCacheRefreshInterval
        );
    }

    /**
     * If the running site has already been registered at the H5P hub, this method will
     * return the UUID of it. If it hasn't been registered yet, it will do so and store
     * the UUID in the storage object.
     * @returns uuid
     */
    public async registerOrGetUuid(): Promise<string> {
        if (this.config.uuid && this.config.uuid !== '') {
            return this.config.uuid;
        }
        const response = await axios.post(
            this.config.hubRegistrationEndpoint,
            this.compileRegistrationData()
        );
        if (response.status !== 200) {
            throw new Error(
                `Could not register this site at the H5P Hub. HTTP status ${response.status} ${response.statusText}`
            );
        }
        if (!response.data || !response.data.uuid) {
            throw new Error('Could not register this site at the H5P Hub.');
        }
        this.config.uuid = response.data.uuid;
        await this.config.save();
        return this.config.uuid;
    }

    /**
     * Checks if the interval between updates has been exceeded and updates the cache if necessary.
     * @returns {Promise<boolean>} true if cache was updated, false if not
     */
    public async updateIfNecessary(): Promise<boolean> {
        const oldCache = await this.storage.load('contentTypeCache');
        if (!oldCache || (await this.isOutdated())) {
            return this.forceUpdate();
        }
        return false;
    }

    /**
     * @returns An object with the registration data as required by the H5P Hub
     */
    private compileRegistrationData(): IRegistrationData {
        return {
            core_api_version: `${this.config.coreApiVersion.major}.${this.config.coreApiVersion.minor}`,
            disabled: this.config.fetchingDisabled,
            h5p_version: this.config.h5pVersion,
            local_id: ContentTypeCache.generateLocalId(),
            platform_name: this.config.platformName,
            platform_version: this.config.platformVersion,
            type: this.config.siteType,
            uuid: this.config.uuid
        };
    }

    /**
     * @returns An object with usage statistics as required by the H5P Hub
     */
    private compileUsageStatistics(): IUsageStatistics {
        return {
            libraries: {}, // TODO: add library information here
            num_authors: 0 // number of active authors
        };
    }
}
