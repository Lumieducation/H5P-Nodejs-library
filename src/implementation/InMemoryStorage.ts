import { IKeyValueStorage } from '../types';

/**
 * Stores objects in memory. It can store any key-value pairs.
 * This is just a placeholder for a proper storage implementation.
 */
export default class InMemoryStorage implements IKeyValueStorage {
    protected storage: any;

    constructor() {
        this.storage = {};
    }

    public async load(key: string): Promise<any> {
        return this.storage[key];
    }

    public async save(key: string, value: any): Promise<void> {
        this.storage[key] = value;
    }
}
