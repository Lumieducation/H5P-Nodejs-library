import { Redis } from 'ioredis';
import { lock } from 'simple-redis-mutex';

import { ILockProvider, Logger } from '@lumieducation/h5p-server';

const log = new Logger('RedisLockProvider');

export default class RedisLockProvider implements ILockProvider {
    constructor(
        private redis: Redis,
        private options?: { retryTime?: number }
    ) {
        log.debug('initialize');
    }

    public async acquire<T>(
        key: string,
        callback: () => Promise<T>,
        options: { timeout: number; maxOccupationTime: number }
    ): Promise<T> {
        let unlock: { (): any; (): Promise<void> };
        try {
            log.debug(`Attempting to acquire lock for key ${key}.`);
            unlock = await lock(this.redis, key, {
                timeoutMillis: options.maxOccupationTime, // confusingly the names are reversed
                failAfterMillis: options.timeout, // confusingly the names are reversed
                retryTimeMillis: this.options?.retryTime ?? 100
            });
        } catch (error) {
            if (error.message.startsWith('Lock could not be acquire for')) {
                log.debug(
                    `There was a timeout when trying to acquire key for ${key}`
                );
                throw new Error('timeout');
            }
        }
        try {
            const timeout = setTimeout(() => {
                log.debug(
                    `The operation holding the lock for key ${key} took longer than allowed. Lock was released by Redis.`
                );
                throw new Error('occupation-time-exceeded');
            }, options.maxOccupationTime);
            log.debug(`Acquired lock for key ${key}. Calling operation.`);
            const result = await callback();
            log.debug(`Operation for lock key ${key} has finished.`);
            clearTimeout(timeout);
            return result;
        } finally {
            log.debug(`Releasing lock for key ${key}`);
            await unlock();
        }
    }
}
