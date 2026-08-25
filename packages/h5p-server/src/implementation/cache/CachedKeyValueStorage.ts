import { Cache, createCache } from 'cache-manager';
import { Keyv } from 'keyv';
import { CacheableMemory } from 'cacheable';

import { IKeyValueStorage } from '../../types';

/**
 * Caches arbitrary key-value pairs.
 */
export default class CachedKeyValueStorage implements IKeyValueStorage {
    /**
     * @param cache the cache backend, if left undefined, an in-memory cache is
     * created.
     */
    constructor(
        private prefix: string,
        private cache?: Cache
    ) {
        if (!this.cache) {
            this.cache = createCache({
                stores: [
                    new Keyv({
                        store: new CacheableMemory({ lruSize: 2 ** 10 }),
                        // We store data in memory only, so there's no need
                        // to (de)serialize it to/from strings. Doing so
                        // would break on values like Date objects.
                        serialize: undefined,
                        deserialize: undefined
                    })
                ]
            });
        }
    }

    public async load(key: string): Promise<any> {
        return this.cache.get(`${this.prefix}-${key}`);
    }

    public async save(key: string, value: any): Promise<any> {
        // No ttl is passed so entries never expire (this storage class is
        // used to persist actual data, not just as a re-fetchable cache).
        return this.cache.set(`${this.prefix}-${key}`, value);
    }
}
