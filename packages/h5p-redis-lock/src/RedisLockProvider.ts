import { lock } from 'simple-redis-mutex';
import { createClient } from 'redis';
import { ILockProvider, Logger } from '@lumieducation/h5p-server';

const log = new Logger('RedisLockProvider');

export default class RedisLockProvider implements ILockProvider {
    constructor(
        private redis: ReturnType<typeof createClient>,
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
            // simple-redis-mutex@3's TypeScript types (RedisClientType |
            // RedisClusterType, both with default "any" generics) don't
            // structurally match the fully resolved client type returned by
            // redis@5's createClient() (which includes the default modules
            // such as json/search/bloom). This is a type-level mismatch
            // only; the client is used at runtime exactly as before, so the
            // cast is safe.
            unlock = await lock(this.redis as any, key, {
                timeout: options.maxOccupationTime, // confusingly the names are reversed
                failAfter: options.timeout, // confusingly the names are reversed
                pollingInterval: this.options?.retryTime ?? 5
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
