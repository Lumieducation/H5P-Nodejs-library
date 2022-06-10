import * as fsExtra from 'fs-extra';

import InMemoryStorage from '../InMemoryStorage';

/**
 * Reads key-value pairs from a JSON file and writes them back. It is
 * recommended to create it with the static create(...) factory instead of the
 * sync constructor.
 */
export default class JsonStorage extends InMemoryStorage {
    /**
     * Initializes the JsonStorage. It's advised to use the async static factory
     * method create(...) instead.
     * @param file Path to the JSON file (must be read- and writable)
     */
    constructor(file?: string) {
        super();

        if (file) {
            this.file = file;
            this.storage = fsExtra.readJSONSync(file);
        }
    }

    private file: string;

    /**
     * Factory for a JsonStorage object that initializes the object. Throws
     * errors is something is wrong with the file (not accessible / can't be
     * parsed).
     * @param file Path to the JSON file (must be read- and writeable)
     */
    public static async create(file: string): Promise<JsonStorage> {
        const storage = new JsonStorage();
        await storage.initialize(file);
        return storage;
    }

    /**
     * Saves a key in the JSON file (supports nested values).
     * @param key
     * @param value
     */
    public async save(key: string, value: any): Promise<any> {
        const returnValue = await super.save(key, value);
        await fsExtra.writeJSON(this.file, this.storage);
        return returnValue;
    }

    /**
     * Initializes the storage by loading the JSON file.
     * @param file Path to the JSON file (must be read- and writeable)
     */
    private async initialize(file: string): Promise<void> {
        this.storage = await fsExtra.readJSON(file);
        this.file = file;
    }
}
