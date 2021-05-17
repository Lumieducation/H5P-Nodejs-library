import { AxiosInstance } from 'axios';

import HttpClient from './helpers/HttpClient';
import { IH5PConfig, IKeyValueStorage } from './types';
import H5pError from './helpers/H5pError';
import Logger from './helpers/Logger';

const log = new Logger('ContentHub');

export default class ContentHub {
    /**
     *
     * @param config The configuration to use.
     * @param storage The storage object.
     */
    constructor(private config: IH5PConfig, private storage: IKeyValueStorage) {
        log.info(`initialize`);
        this.httpClient = HttpClient(config);
    }

    private httpClient: AxiosInstance;

    getMetadata = async (lang?: string): Promise<any> => {
        const updateKey = lang
            ? `contentHubMetadataUpdate-${lang}`
            : 'contentHubMetadataUpdate';
        const metadataKey = lang
            ? `contentHubMetadata-${lang}`
            : 'contentHubMetadata';

        log.debug(`Getting content hub metadata for language ${lang}`);
        const lastUpdate = await this.storage.load(updateKey);

        if (lastUpdate) {
            log.debug(
                `Last hub metadata update was at ${new Date(
                    lastUpdate
                ).toUTCString()}`
            );
        } else {
            log.debug('Content hub metadata has never been retrieved before.');
        }

        if (
            lastUpdate &&
            lastUpdate >
                Date.now() - this.config.contentHubMetadataRefreshInterval
        ) {
            log.debug('No refresh from upstream necessary.');
            const cached = this.storage.load(metadataKey);
            if (cached) {
                return cached;
            }
            log.error('Wanted to use cached hub metadata, but none was found.');
        }

        let isoLanguage = lang;
        if (lang) {
            const match = lang.match(/^([a-zA-Z]{2,3})-?[a-zA-Z]{0,7}$/);
            if (match) {
                // eslint-disable-next-line prefer-destructuring
                isoLanguage = match[1];
            }
        }

        const response = await this.httpClient.get(
            lang
                ? `${this.config.contentHubMetadataEndpoint}?lang=${isoLanguage}`
                : this.config.contentHubMetadataEndpoint,
            {
                headers: lastUpdate
                    ? {
                          'If-Modified-Since': new Date(
                              lastUpdate
                          ).toUTCString()
                      }
                    : undefined,
                validateStatus: (status) => status === 200 || status === 304
            }
        );

        if (response.status === 304) {
            log.debug(
                'The server reported that there was no change in the content hub metadata'
            );
            this.storage.save(updateKey, Date.now());
            const cached = this.storage.load(metadataKey);
            if (cached) {
                return cached;
            }
            log.error(
                'Wanted to use cached content hub metadata, but none was found.'
            );
        }
        if (response.status === 200) {
            log.debug('Received content hub metadata. Storing in cache.');
            this.storage.save(metadataKey, response.data);
            this.storage.save(updateKey, Date.now());
            return response.data;
        }
        throw new H5pError('h5p-hub-connection-failed');
    };
}
