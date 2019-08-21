const MockAdapter = require('axios-mock-adapter');
const axios = require('axios');
const MockDate = require('mockdate');

const ContentTypeCache = require('../src/content-type-cache');
const H5PEditorConfig = require('../src/config');
const InMemoryStorage = require('../src/in-memory-storage');

const axiosMock = new MockAdapter(axios);

describe('registering the site at H5P Hub', () => {
     it('returns a uuid', async () => {
          const storage = new InMemoryStorage();
          const config = new H5PEditorConfig(storage);
          const cache = new ContentTypeCache(config);

          axiosMock.onPost(config.hubRegistrationEndpoint).reply(200, require('./data/content-type-cache/registration.json'));

          const uuid = await cache._registerOrGetUuid();
          expect(uuid).toBeDefined();
          expect(config.uuid).toEqual(uuid);
     });

     it('fails with an error when URL is unreachable', async () => {
          const storage = new InMemoryStorage();
          const config = new H5PEditorConfig(storage);
          const cache = new ContentTypeCache(config);

          config.uuid = '';
          axiosMock.onPost(config.hubRegistrationEndpoint).reply(408);

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

          axiosMock.onPost(config.hubRegistrationEndpoint).reply(200, require('./data/content-type-cache/registration.json'));
          axiosMock.onPost(config.hubContentTypesEndpoint).reply(200, require('./data/content-type-cache/real-content-types.json'));

          let updated = await cache.updateIfNecessary();
          expect(updated).toEqual(true);

          const cached = await cache.get();
          expect(cached).toBeDefined();

          updated = await cache.updateIfNecessary();
          expect(updated).toEqual(false);
     });
     it("doesn't overwrite existing cache if it fails to load a new one", async () => {
          const storage = new InMemoryStorage();
          const config = new H5PEditorConfig(storage);
          const cache = new ContentTypeCache(config, storage);

          config.contentTypeCacheRefreshInterval = 1;

          axiosMock.onPost(config.hubRegistrationEndpoint).reply(200, require('./data/content-type-cache/registration.json'));
          axiosMock.onPost(config.hubContentTypesEndpoint).reply(200, require('./data/content-type-cache/real-content-types.json'));

          const updated1 = await cache.updateIfNecessary();
          expect(updated1).toEqual(true);
          const cached1 = await cache.get();
          expect(cached1).toBeDefined();
          expect(cached1.length).toBeGreaterThan(10.0);

          axiosMock.onPost(config.hubContentTypesEndpoint).reply(500);

          const updated2 = await cache.updateIfNecessary();
          expect(updated2).toEqual(false);
          const cached2 = await cache.get();
          expect(cached2).toMatchObject(cached1);
     });
     it("detects outdated state", async () => {
          const storage = new InMemoryStorage();
          const config = new H5PEditorConfig(storage);
          const cache = new ContentTypeCache(config, storage);

          config.contentTypeCacheRefreshInterval = 100;

          axiosMock.onPost(config.hubRegistrationEndpoint).reply(200, require('./data/content-type-cache/registration.json'));
          axiosMock.onPost(config.hubContentTypesEndpoint).reply(200, require('./data/content-type-cache/real-content-types.json'));

          expect(await cache.isOutdated()).toEqual(true);
          await cache.updateIfNecessary();
          expect(await cache.isOutdated()).toEqual(false);
          MockDate.set(Date.now() + 200);
          expect(await cache.isOutdated()).toEqual(true);
          MockDate.reset();
     });
});
