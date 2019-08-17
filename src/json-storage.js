const fs = require('fs-extra');
const InMemoryStorage = require('./in-memory-storage');

/**
 * Reads key - value pairs from a JSON file and writes them back.
 * DO NOT initialize with regular constructor but use the static create(...) factory instead.
 */
export default class JsonStorage extends InMemoryStorage {
    constructor() {
        super();
        this._file = null;
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