const MockAdapter = require('axios-mock-adapter');
const axios = require('axios');

const ContentTypeCache = require('../src/content-type-cache');
const H5PEditorConfig = require('../src/config');
const InMemoryStorage = require('./mockups/in-memory-storage');

const axiosMock = new MockAdapter(axios);

describe('registering the site at H5P Hub', () => {
    it('returns a uuid', async () => {
        const storage = new InMemoryStorage();
        const config = new H5PEditorConfig(storage);
        const cache = new ContentTypeCache(config);

        axiosMock.onPost(config.hubRegistrationEndpoint).reply(200, require('./data/registration.json'));

        const uuid = await cache._registerOrGetUuid();
        expect(uuid).toBeDefined();
        expect(config.uuid).toEqual(uuid);
    });

    it('fails with an error when URL is unreachable', async () => {
        const storage = new InMemoryStorage();
        const config = new H5PEditorConfig(storage);
        const cache = new ContentTypeCache(config);

        config.uuid = '';
        config.hubRegistrationEndpoint = 'https://example.org';

        let error;
        try {
            await cache._registerOrGetUuid();
        }
        catch (e) {
            error = e;
        }
        expect(error).toBeDefined();
    });
});

describe('getting H5P Hub content types', () => {
    it('should return an empty cache if it was not loaded yet', async () => {
        const storage = new InMemoryStorage();
        const config = new H5PEditorConfig(storage);
        const cache = new ContentTypeCache(config, storage);

        const cached = await cache.get();
        expect(cached).toBeUndefined();
    });
    it('loads content type information from the H5P Hub', async () => {
        const storage = new InMemoryStorage();
        const config = new H5PEditorConfig(storage);
        const cache = new ContentTypeCache(config, storage);

        axiosMock.onPost(config.hubRegistrationEndpoint).reply(200, require('./data/registration.json'));
        axiosMock.onPost(config.hubContentTypesEndpoint).reply(200, require('./data/real-content-types.json'));

        let updated = await cache.updateIfNecessary();
        expect(updated).toEqual(true);

        const cached = await cache.get();
        expect(cached).toBeDefined();

        updated = await cache.updateIfNecessary();        
        expect(updated).toEqual(false);
    });
});
