const path = require('path');
const fs = require('fs-extra');

const JsonStorage = require('../src/json-storage');
const Config = require('../src/config');

describe('JSON storage of configuration', () => {
    it('loads JSON valid files', async () => {
        const storage = await JsonStorage.create(path.resolve("test/data/configuration/valid-config.json"));
        const config = new Config(storage);
        await config.load();
        expect(config.hubRegistrationEndpoint).toBe("https://customhub");
        expect(config.hubContentTypesEndpoint).toBe("https://customContentTypesEndpoint");
        expect(config.enableLrsContentTypes).toBe(true);
    });

    it('saves changes', async () => {
        const file = path.resolve("test/data/configuration/temp.json");
        await fs.remove(file);
        try {
            await fs.copyFile(path.resolve("test/data/configuration/valid-config.json"),
                file);

            const storage1 = await JsonStorage.create(file);
            await storage1.save("hubRegistrationEndpoint", "XXX");
            const storage2 = await JsonStorage.create(file);
            await expect(storage2.load("hubRegistrationEndpoint")).resolves.toBe("XXX");
        } finally {
            await fs.remove(path.resolve(file));
        }
    });
});
