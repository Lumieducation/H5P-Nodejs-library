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

describe('content type information repository', () => {
    it('gets content types from hub', async () => {
        const storage = new InMemoryStorage();
        const config = new H5PEditorConfig(storage);
        const libManager = new FileLibraryManager(`${path.resolve('')}/test/data`);
        const cache = new ContentTypeCache(config, storage);

        axiosMock.onPost(config.hubRegistrationEndpoint).reply(200, require('./data/registration.json'));
        axiosMock.onPost(config.hubContentTypesEndpoint).reply(200, require('./data/real-content-types.json'));

        await cache.updateIfNecessary();

        const repository = new ContentTypeInformationRepository(cache, storage, libManager, config, new User());
        const content = await repository.get();
        expect(content.outdated).toBe(false);
        expect(content.libraries.length).toEqual(require('./data/real-content-types.json').contentTypes.length);
    });
    it('doesn\'t fail if update wasn\'t called', async () => {
        const storage = new InMemoryStorage();
        const config = new H5PEditorConfig(storage);
        const libManager = new FileLibraryManager(`${path.resolve('')}/test/data`);
        const cache = new ContentTypeCache(config, storage);

        axiosMock.onPost(config.hubRegistrationEndpoint).reply(200, require('./data/registration.json'));
        axiosMock.onPost(config.hubContentTypesEndpoint).reply(200, require('./data/real-content-types.json'));

        const repository = new ContentTypeInformationRepository(cache, storage, libManager, config, new User());
        const content = await repository.get();
        expect(content.outdated).toBe(false);
        expect(content.libraries.length).toEqual(require('./data/real-content-types.json').contentTypes.length);
    });

    it('adds local libraries', async () => {
        const storage = new InMemoryStorage();
        const config = new H5PEditorConfig(storage);
        const libManager = new FileLibraryManager(`${path.resolve('')}/test/data/libraries`);
        const cache = new ContentTypeCache(config, storage);

        axiosMock.onPost(config.hubRegistrationEndpoint).reply(200, require('./data/registration.json'));
        axiosMock.onPost(config.hubContentTypesEndpoint).reply(200, require('./data/0-content-types.json'));

        const repository = new ContentTypeInformationRepository(cache, storage, libManager, config, new User());
        const content = await repository.get();
        expect(content.libraries.length).toEqual(2);
    });

    it('detects updates to local libraries', async () => {
        const storage = new InMemoryStorage();
        const config = new H5PEditorConfig(storage);
        const libManager = new FileLibraryManager(`${path.resolve('')}/test/data/libraries`);
        const cache = new ContentTypeCache(config, storage);

        axiosMock.onPost(config.hubRegistrationEndpoint).reply(200, require('./data/registration.json'));
        axiosMock.onPost(config.hubContentTypesEndpoint).reply(200, require('./data/1-content-type.json'));

        const repository = new ContentTypeInformationRepository(cache, storage, libManager, config, new User());
        const content = await repository.get();
        expect(content.libraries.length).toEqual(2);
        expect(content.libraries[0].installed).toEqual(true);
        expect(content.libraries[0].isUpToDate).toEqual(false);
    });

    it('returns local libraries if H5P Hub is unreachable', async () => {
        const storage = new InMemoryStorage();
        const config = new H5PEditorConfig(storage);
        const libManager = new FileLibraryManager(`${path.resolve('')}/test/data/libraries`);
        const cache = new ContentTypeCache(config, storage);

        axiosMock.onPost(config.hubRegistrationEndpoint).reply(200, require('./data/registration.json'));
        axiosMock.onPost(config.hubContentTypesEndpoint).reply(500);

        const repository = new ContentTypeInformationRepository(cache, storage, libManager, config, new User());
        const content = await repository.get();
        expect(content.libraries.length).toEqual(2);
    });
});
