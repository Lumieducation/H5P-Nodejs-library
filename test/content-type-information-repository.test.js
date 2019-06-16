const InMemoryStorage = require('../src/in-memory-storage');
const H5PEditorConfig = require('../src/config');
const FileLibraryManager = require('../src/file-library-manager');
const ContentTypeCache = require('../src/content-type-cache');
const ContentTypeInformationRepository = require('../src/content-type-information-repository');
const User = require('../src/user');

describe('basic file library manager functionality', () => {
    it('returns the list of installed library in demo directory', async () => {
        const storage = new InMemoryStorage();
        const config = new H5PEditorConfig(storage);
        const libManager = new FileLibraryManager(config);
        const cache = new ContentTypeCache(config, storage);

        await cache.updateIfNecessary();

        const repository = new ContentTypeInformationRepository(cache, storage, libManager, config, new User());
        const content = await repository.get();
        expect(content).toBeDefined();
        console.log(content);
    });
});
