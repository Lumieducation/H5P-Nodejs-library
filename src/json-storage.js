const fs = require('fs-extra');
const InMemoryStorage = require('./in-memory-storage');

/**
 * Reads key-value pairs from a JSON file and writes them back.
 * It is recommended to create it with the static create(...) factory instead of the sync constructor.
 */
class JsonStorage extends InMemoryStorage {
    /**
     * Initializes the JsonStorage. It's advised to use the async static factory method create(...) instead.
     * @param {string} file Path to the JSON file (must be read- and writable)
     */
    constructor(file) {
        super();

        if (file) {
            this._file = file;
            this._storage = fs.readJSONSync(file);
        }
    }

    /**
    * Factory for a JsonStorage object that initializes the object.
    * Throws errors is something is wrong with the file (not accessible / can't be parsed).
    * @param {string} file Path to the JSON file (must be read- and writeable)
    */
    static async create(file) {
        const storage = new JsonStorage();
        await storage._initialize(file);
        return storage;
    }

    /**
     * Initializes the storage by loading the JSON file.
     * @param {string} file Path to the JSON file (must be read- and writeable)
     */
    async _initialize(file) {
        this._storage = await fs.readJSON(file);
        this._file = file;
    }

    /**
     * Saves a key in the JSON file (supports nested values).
     * @param {string} key
     * @param {*} value 
     */
    async save(key, value) {
        const returnValue = await super.save(key, value);
        await fs.writeJSON(this._file, this._storage);
        return returnValue;
    }
}

module.exports = JsonStorage;