import AsyncLock from 'async-lock';

import { ILockProvider } from '../types';

export default class SimpleLockProvider implements ILockProvider {
    constructor() {
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
                } as any
            );
        } catch (error) {
            if (error.message == 'async-lock timed out') {
                throw new Error('timeout');
            }
            if (error.message == 'Maximum occupation time is exceeded') {
                throw new Error('occupation-time-exceeded');
            }
            throw error;
        }
        return result;
    }
}
