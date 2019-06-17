const path = require('path');
const MockAdapter = require('axios-mock-adapter');
const axios = require('axios');

const InMemoryStorage = require('./mockups/in-memory-storage');
const H5PEditorConfig = require('../src/config');
const FileLibraryManager = require('./mockups/file-library-manager');
const ContentTypeCache = require('../src/content-type-cache');
const ContentTypeInformationRepository = require('../src/content-type-information-repository');
const User = require('./mockups/user');

const axiosMock = new MockAdapter(axios);

describe('basic file library manager functionality', () => {
    it('returns the list of installed library in demo directory', async () => {
        const storage = new InMemoryStorage();
        const config = new H5PEditorConfig(storage);
        const libManager = new FileLibraryManager(`${path.resolve('')}/h5p/libraries`);
        const cache = new ContentTypeCache(config, storage);

        axiosMock.onPost(config.hubRegistrationEndpoint).reply(200, require('./data/registration.json'));
        axiosMock.onPost(config.hubContentTypesEndpoint).reply(200, require('./data/real-content-types.json'));

        await cache.updateIfNecessary();

        const repository = new ContentTypeInformationRepository(cache, storage, libManager, config, new User());
        const content = await repository.get();
        expect(content).toBeDefined();
    });
});
