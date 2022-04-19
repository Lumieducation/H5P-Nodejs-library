import AsyncLock from 'async-lock';

import { ILockProvider } from '../types';
import Logger from '../helpers/Logger';

const log = new Logger('SimpleLockProvider');

export default class SimpleLockProvider implements ILockProvider {
    constructor() {
        log.debug('initialize');
        this.lock = new AsyncLock();
    }

    private lock: AsyncLock;

    public async acquire<T>(
        key: string,
        callback: () => Promise<T>,
        options: { timeout: number; maxOccupationTime: number }
    ): Promise<T> {
        let result: T;
        try {
            log.debug(`Attempting to acquire lock for key ${key}`);
            result = await this.lock.acquire<T>(
                key,
                (done) => {
                    callback()
                        .then((ret) => done(null, ret))
                        .catch((reason) => done(reason));
                },
                {
                    timeout: options.timeout,
                    maxOccupationTime: options.maxOccupationTime
                } as any // the typescript typings are out of date
            );
        } catch (error) {
            if (error.message.startsWith('async-lock timed out')) {
                log.debug(
                    `There was a timeout when acquiring lock for key ${key}.`
                );
                throw new Error('timeout');
            }
            if (
                error.message.startsWith('Maximum occupation time is exceeded')
            ) {
                log.debug(
                    `The operation holding the lock for key ${key} took longer than allowed. Releasing key.`
                );
                throw new Error('occupation-time-exceeded');
            }
            throw error;
        }
        log.debug(`The lock for key ${key} was released`);
        return result;
    }
}
