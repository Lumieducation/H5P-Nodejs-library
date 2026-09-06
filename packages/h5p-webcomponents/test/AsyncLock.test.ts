import { AsyncLock } from '../src/dom-utils';

describe('AsyncLock', () => {
    it('serializes concurrent acquires in FIFO order', async () => {
        const lock = new AsyncLock();
        const order: number[] = [];

        const run = async (id: number, workMs: number): Promise<void> => {
            const release = await lock.acquireAsync();
            try {
                order.push(id);
                await new Promise((res) => setTimeout(res, workMs));
            } finally {
                release();
            }
        };

        // Start out of order and with different work durations to make sure
        // the lock enforces call order rather than completion order.
        await Promise.all([run(1, 20), run(2, 5), run(3, 10)]);

        expect(order).toEqual([1, 2, 3]);
    });

    it('allows sequential acquire/release without deadlocking', async () => {
        const lock = new AsyncLock();

        const release1 = await lock.acquireAsync();
        release1();

        const release2 = await lock.acquireAsync();
        release2();
    });

    it('unblocks the next waiter even if the critical section throws', async () => {
        const lock = new AsyncLock();
        const order: string[] = [];

        const throwing = async (): Promise<void> => {
            const release = await lock.acquireAsync();
            try {
                order.push('throwing-start');
                throw new Error('boom');
            } finally {
                release();
            }
        };

        const waiting = async (): Promise<void> => {
            const release = await lock.acquireAsync();
            try {
                order.push('waiting-start');
            } finally {
                release();
            }
        };

        const results = await Promise.allSettled([throwing(), waiting()]);

        expect(results[0].status).toBe('rejected');
        expect(results[1].status).toBe('fulfilled');
        expect(order).toEqual(['throwing-start', 'waiting-start']);
    });
});
