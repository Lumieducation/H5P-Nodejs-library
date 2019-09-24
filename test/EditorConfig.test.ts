import EditorConfig from '../src/EditorConfig';
import InMemoryStorage from '../src/InMemoryStorage';

describe('loading configuration data from storage', () => {
    it("doesn't overwrite defaults if storage is empty", async () => {
        const storage = new InMemoryStorage();
        const config = new EditorConfig(storage);

        await config.load();
        expect(config.siteType).toBe('local');
    });

    it('loads previously stored settings', async () => {
        const storage = new InMemoryStorage();
        await storage.save('siteType', 'test');

        const config = new EditorConfig(storage);

        await config.load();
        expect(config.siteType).toBe('test');
    });

    it('saves changed settings', async () => {
        const storage = new InMemoryStorage();
        const config = new EditorConfig(storage);

        config.siteType = 'network';
        await config.save();
        expect(await storage.load('siteType')).toBe('network');

        const config2 = new EditorConfig(storage);
        await config2.load();
        expect(config2.siteType).toBe('network');
    });
});
