import { AxiosInstance } from 'axios';
import * as merge from 'merge';
import * as qs from 'qs';
import { machineIdSync } from 'node-machine-id';

import H5pError from './helpers/H5pError';
import Logger from './helpers/Logger';
import {
    IH5PConfig,
    IHubContentType,
    IKeyValueStorage,
    IRegistrationData,
    IUsageStatistics
} from './types';
import HttpClient from './helpers/HttpClient';

const log = new Logger('ContentTypeCache');

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
 * - Use contentTypeCacheRefreshInterval in the IH5PConfig object to set how often
 *   the update should be performed. You can also use forceUpdate() if you want to bypass the
 *   interval.
 */
export default class ContentTypeCache {
    /**
     *
     * @param config The configuration to use.
     * @param storage The storage object.
     */
    constructor(
        private config: IH5PConfig,
        private storage: IKeyValueStorage,
        private getLocalIdOverride?: () => string
    ) {
        log.info('initialize');
        this.httpClient = HttpClient(config);
    }

    private httpClient: AxiosInstance;

    /**
     * Converts an entry from the H5P Hub into a format with flattened versions and integer date values.
     * @param entry the entry as received from H5P Hub
     * @returns the local content type object
     */
    private static convertCacheEntryToLocalFormat(entry: any): IHubContentType {
        log.debug(`converting Cache Entry to local format`);
        return {
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
        };
    }

    /**
     * Downloads information about available content types from the H5P Hub. This method will
     * create a UUID to identify this site if required.
     * @returns content types
     */
    public async downloadContentTypesFromHub(): Promise<any[]> {
        log.info(
            `downloading content types from hub ${this.config.hubContentTypesEndpoint}`
        );
        await this.registerOrGetUuid();
        let formData = this.compileRegistrationData();
        if (this.config.sendUsageStatistics) {
            formData = merge.recursive(
                true,
                formData,
                this.compileUsageStatistics()
            );
        }
        const response = await this.httpClient.post(
            this.config.hubContentTypesEndpoint,
            qs.stringify(formData)
        );
        if (response.status !== 200) {
            throw new H5pError(
                'error-communicating-with-hub',
                {
                    statusCode: response.status.toString(),
                    statusText: response.statusText
                },
                504
            );
        }
        if (!response.data) {
            throw new H5pError(
                'error-communicating-with-hub-no-status',
                {},
                504
            );
        }

        return response.data.contentTypes;
    }

    /**
     * Downloads the content type information from the H5P Hub and stores it in the storage object.
     * @returns the downloaded (and saved) cache; undefined if it failed (e.g. because Hub was unreachable)
     */
    public async forceUpdate(): Promise<any> {
        log.info(`forcing update`);
        let cacheInHubFormat;
        try {
            cacheInHubFormat = await this.downloadContentTypesFromHub();
            if (!cacheInHubFormat) {
                return undefined;
            }
        } catch (error) {
            log.error(error);
            return undefined;
        }
        const cacheInInternalFormat = cacheInHubFormat.map(
            ContentTypeCache.convertCacheEntryToLocalFormat
        );
        await this.storage.save('contentTypeCache', cacheInInternalFormat);
        await this.storage.save('contentTypeCacheUpdate', Date.now());
        return cacheInInternalFormat;
    }

    /**
     * Returns the cache data.
     * @param machineNames (optional) The method only returns content type cache data for these machine names.
     * @returns Cached hub data in a format in which the version objects are flattened into the main object,
     */
    public async get(...machineNames: string[]): Promise<IHubContentType[]> {
        log.info(`getting content types`);

        let cache = await this.storage.load('contentTypeCache');
        if (!cache) {
            log.info(
                'ContentTypeCache was never updated before. Downloading it from the H5P Hub...'
            );
            // try updating cache if it is empty for some reason
            cache = await this.forceUpdate();
            // if the cache is still empty (e.g. because no connection to the H5P Hub can be established, return an empty array)
            if (!cache) {
                log.info(
                    'ContentTypeCache could not be retrieved from H5P Hub.'
                );
                return [];
            }
        }

        if (!machineNames || machineNames.length === 0) {
            return cache;
        }
        return cache.filter((contentType: IHubContentType) =>
            machineNames.some(
                (machineName) => machineName === contentType.machineName
            )
        );
    }

    /**
     * Returns the date and time of the last update of the cache.
     * @returns the date and time; undefined if the cache was never updated before.
     */
    public async getLastUpdate(): Promise<Date> {
        const lastUpdate = await this.storage.load('contentTypeCacheUpdate');
        return lastUpdate;
    }

    /**
     * Checks if the cache is not up to date anymore (update interval exceeded).
     * @returns true if cache is outdated, false if not
     */
    public async isOutdated(): Promise<boolean> {
        log.info(`checking if content type cache is up to date`);
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
        log.info(
            `registering or getting uuid from hub ${this.config.hubRegistrationEndpoint}`
        );
        if (this.config.uuid && this.config.uuid !== '') {
            return this.config.uuid;
        }
        const response = await this.httpClient.post(
            this.config.hubRegistrationEndpoint,
            this.compileRegistrationData()
        );
        if (response.status !== 200) {
            throw new H5pError(
                'error-registering-at-hub',
                {
                    statusCode: response.status.toString(),
                    statusText: response.statusText
                },
                500
            );
        }
        if (!response.data || !response.data.uuid) {
            throw new H5pError('error-registering-at-hub-no-status', {}, 500);
        }
        log.debug(`setting uuid to ${response.data.uuid}`);
        this.config.uuid = response.data.uuid;
        await this.config.save();
        return this.config.uuid;
    }

    /**
     * Checks if the interval between updates has been exceeded and updates the cache if necessary.
     * @returns true if cache was updated, false if not
     */
    public async updateIfNecessary(): Promise<boolean> {
        log.info(`checking if update is necessary`);
        const oldCache = await this.storage.load('contentTypeCache');
        if (!oldCache || (await this.isOutdated())) {
            log.info(`update is necessary`);
            return (await this.forceUpdate()) !== undefined;
        }
        log.info(`no update necessary`);
        return false;
    }

    /**
     * @returns An object with the registration data as required by the H5P Hub
     */
    private compileRegistrationData(): IRegistrationData {
        log.debug(
            `compiling registration data for hub ${this.config.hubRegistrationEndpoint}`
        );
        return {
            core_api_version: `${this.config.coreApiVersion.major}.${this.config.coreApiVersion.minor}`,
            disabled: this.config.fetchingDisabled,
            h5p_version: this.config.h5pVersion,
            local_id: this.getLocalId(),
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
        log.info(`compiling usage statistics`);
        return {
            libraries: {}, // TODO: add library information here
            num_authors: 0 // number of active authors
        };
    }

    /**
     * Creates an identifier for the running instance.
     * @returns id
     */
    private getLocalId(): string {
        if (this.getLocalIdOverride) {
            log.debug('Getting local ID from override');
            return this.getLocalIdOverride();
        } else {
            log.debug('Generating local id with node-machine-id');
            return machineIdSync();
        }
    }
}
