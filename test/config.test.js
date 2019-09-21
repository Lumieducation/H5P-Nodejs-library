const H5PEditorConfig = require('../src/EditorConfig');
const InMemoryStorage = require('../src/InMemoryStorage');

describe('loading configuration data from storage', () => {
    it("doesn't overwrite defaults if storage is empty", async () => {
        const storage = new InMemoryStorage();
        const config = new H5PEditorConfig(storage);

        await config.load();
        expect(config.siteType).toBe('local');
    });

    it('loads previously stored settings', async () => {
        const storage = new InMemoryStorage();
        await storage.save('siteType', 'test');

        const config = new H5PEditorConfig(storage);

        await config.load();
        expect(config.siteType).toBe('test');
    });

    it('saves changed settings', async () => {
        const storage = new InMemoryStorage();
        const config = new H5PEditorConfig(storage);

        config.siteType = 'test';
        await config.save();
        expect(await storage.load('siteType')).toBe('test');

        const config2 = new H5PEditorConfig(storage);
        await config2.load();
        expect(config2.siteType).toBe('test');
    });
});
