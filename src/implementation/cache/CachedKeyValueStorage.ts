import { Cache, caching } from 'cache-manager';

import { IKeyValueStorage } from '../../types';

/**
 * Caches arbitrary key-value pairs.
 */
export default class CachedKeyValueStorage implements IKeyValueStorage {
    /**
     * @param cache the cache backend, if left undefined, an in-memory cache is
     * created.
     */
    constructor(private prefix: string, private cache?: Cache) {
        if (!this.cache) {
            this.cache = caching({
                store: 'memory',
                ttl: 60 * 60 * 24,
                max: 2 ** 10
            });
        }
    }

    public async load(key: string): Promise<any> {
        return this.cache.get(`${this.prefix}-${key}`);
    }

    public async save(key: string, value: any): Promise<any> {
        return this.cache.set(`${this.prefix}-${key}`, value, { ttl: 0 });
    }
}
