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
        let unlock: { (): Promise<void> };
        try {
            log.debug(`Attempting to acquire lock for key ${key}.`);
            unlock = await lock(this.redis, key, {
                timeoutMillis: options.maxOccupationTime, // confusingly the names are reversed
                failAfterMillis: options.timeout, // confusingly the names are reversed
                retryTimeMillis: this.options?.retryTime ?? 5
            });
        } catch (error) {
            if (error.message.startsWith('Lock could not be acquire for')) {
                // the spelling mistake was made in the library...
                log.debug(
                    `There was a timeout when trying to acquire key for ${key}`
                );
                throw new Error('timeout');
            }
        }

        try {
            let timeout: NodeJS.Timeout;
            let cancelPromise: { (): void; (reason?: any): void };
            const timeoutPromise = new Promise((res, rej) => {
                cancelPromise = rej;
                timeout = setTimeout(() => {
                    res('occupation-time-exceeded');
                }, options.maxOccupationTime);
            });
            log.debug(`Acquired lock for key ${key}. Calling operation.`);
            const result = await Promise.race([timeoutPromise, callback()]);
            if (
                typeof result === 'string' &&
                result === 'occupation-time-exceeded'
            ) {
                log.debug(
                    `The operation holding the lock for key ${key} took longer than allowed. Lock was released by Redis.`
                );
                throw new Error('occupation-time-exceeded');
            }
            log.debug(`Operation for lock key ${key} has finished.`);
            clearTimeout(timeout);
            cancelPromise();
            return result as any;
        } finally {
            log.debug(`Releasing lock for key ${key}`);
            if (unlock) {
                await unlock();
            }
        }
    }
}
