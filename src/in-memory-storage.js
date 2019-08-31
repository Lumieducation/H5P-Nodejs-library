/**
 * Stores objects in memory. It can store any key-value pairs.
 * This is just a placeholder for a proper storage implementation.
 */
class InMemoryStorage {
    constructor() {
        this._storage = {};
    }

    async save(key, value) {
        this._storage[key] = value;
    }

    async load(key) {
        return this._storage[key];
    }
}

module.exports = InMemoryStorage;