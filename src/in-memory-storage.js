/**
 * Stores objects in memory.
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