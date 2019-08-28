const path = require('path');
const MockAdapter = require('axios-mock-adapter');
const axios = require('axios');

const InMemoryStorage = require('../src/in-memory-storage');
const H5PEditorConfig = require('../src/config');
const LibraryManager = require('../src/library-manager');
const FileLibraryStorage = require('../src/file-library-storage');
const ContentTypeCache = require('../src/content-type-cache');
const ContentTypeInformationRepository = require('../src/content-type-information-repository');
const User = require('../src/user');
const TranslationService = require('../src/translation-service');
const H5pError = require('../src/helpers/h5p-error');

const axiosMock = new MockAdapter(axios);

describe('Content type information repository (= connection to H5P Hub)', () => {
    it('gets content types from hub', async () => {
        const storage = new InMemoryStorage();
        const config = new H5PEditorConfig(storage);
        const libManager = new LibraryManager(new FileLibraryStorage(`${path.resolve('')}/test/data`));
        const cache = new ContentTypeCache(config, storage);

        axiosMock.onPost(config.hubRegistrationEndpoint).reply(200, require('./data/content-type-cache/registration.json'));
        axiosMock.onPost(config.hubContentTypesEndpoint).reply(200, require('./data/content-type-cache/real-content-types.json'));

        await cache.updateIfNecessary();

        const repository = new ContentTypeInformationRepository(cache, storage, libManager, config, new User(), new TranslationService({}));
        const content = await repository.get();
        expect(content.outdated).toBe(false);
        expect(content.libraries.length).toEqual(require('./data/content-type-cache/real-content-types.json').contentTypes.length);
    });
    it('doesn\'t fail if update wasn\'t called', async () => {
        const storage = new InMemoryStorage();
        const config = new H5PEditorConfig(storage);
        const libManager = new LibraryManager(new FileLibraryStorage(`${path.resolve('')}/test/data`));
        const cache = new ContentTypeCache(config, storage);

        axiosMock.onPost(config.hubRegistrationEndpoint).reply(200, require('./data/content-type-cache/registration.json'));
        axiosMock.onPost(config.hubContentTypesEndpoint).reply(200, require('./data/content-type-cache/real-content-types.json'));

        const repository = new ContentTypeInformationRepository(cache, storage, libManager, config, new User(), new TranslationService({}));
        const content = await repository.get();
        expect(content.outdated).toBe(false);
        expect(content.libraries.length).toEqual(require('./data/content-type-cache/real-content-types.json').contentTypes.length);
    });

    it('adds local libraries', async () => {
        const storage = new InMemoryStorage();
        const config = new H5PEditorConfig(storage);
        const libManager = new LibraryManager(new FileLibraryStorage(`${path.resolve('')}/test/data/libraries`));
        const cache = new ContentTypeCache(config, storage);

        axiosMock.onPost(config.hubRegistrationEndpoint).reply(200, require('./data/content-type-cache/registration.json'));
        axiosMock.onPost(config.hubContentTypesEndpoint).reply(200, require('./data/content-type-cache/0-content-types.json'));

        const repository = new ContentTypeInformationRepository(cache, storage, libManager, config, new User(), new TranslationService({}));
        const content = await repository.get();
        expect(content.libraries.length).toEqual(2);
    });

    it('detects updates to local libraries', async () => {
        const storage = new InMemoryStorage();
        const config = new H5PEditorConfig(storage);
        const libManager = new LibraryManager(new FileLibraryStorage(`${path.resolve('')}/test/data/libraries`));
        const cache = new ContentTypeCache(config, storage);

        axiosMock.onPost(config.hubRegistrationEndpoint).reply(200, require('./data/content-type-cache/registration.json'));
        axiosMock.onPost(config.hubContentTypesEndpoint).reply(200, require('./data/content-type-cache/1-content-type.json'));

        const repository = new ContentTypeInformationRepository(cache, storage, libManager, config, new User(), new TranslationService({}));
        const content = await repository.get();
        expect(content.libraries.length).toEqual(2);
        expect(content.libraries[0].installed).toEqual(true);
        expect(content.libraries[0].isUpToDate).toEqual(false);
    });

    it('returns local libraries if H5P Hub is unreachable', async () => {
        const storage = new InMemoryStorage();
        const config = new H5PEditorConfig(storage);
        const libManager = new LibraryManager(new FileLibraryStorage(`${path.resolve('')}/test/data/libraries`));
        const cache = new ContentTypeCache(config, storage);

        axiosMock.onPost(config.hubRegistrationEndpoint).reply(200, require('./data/content-type-cache/registration.json'));
        axiosMock.onPost(config.hubContentTypesEndpoint).reply(500);

        const repository = new ContentTypeInformationRepository(cache, storage, libManager, config, new User(), new TranslationService({}));
        const content = await repository.get();
        expect(content.libraries.length).toEqual(2);
    });

    it('sets LRS dependent content types to restricted', async () => {
        const storage = new InMemoryStorage();
        const config = new H5PEditorConfig(storage);
        const libManager = new LibraryManager(new FileLibraryStorage(`${path.resolve('')}/test/data/libraries`));
        const cache = new ContentTypeCache(config, storage);
        const user = new User();

        config.enableLrsContentTypes = false;
        config.lrsContentTypes = ['H5P.Example1'];
        user.canCreateRestricted = false;

        axiosMock.onPost(config.hubRegistrationEndpoint).reply(200, require('./data/content-type-cache/registration.json'));
        axiosMock.onPost(config.hubContentTypesEndpoint).reply(500);

        const repository = new ContentTypeInformationRepository(cache, storage, libManager, config, user, new TranslationService({}));
        const content = await repository.get();
        expect(content.libraries.length).toEqual(2);
        expect(content.libraries.find(l => l.machineName === 'H5P.Example1').restricted).toEqual(true);
        expect(content.libraries.find(l => l.machineName === 'H5P.Example3').restricted).toEqual(false);
    });

    it('install rejects invalid machine names', async () => {
        const storage = new InMemoryStorage();
        const config = new H5PEditorConfig(storage);
        const libManager = new LibraryManager(new FileLibraryStorage(`${path.resolve('')}/test/data/libraries`));
        const cache = new ContentTypeCache(config, storage);

        axiosMock.onPost(config.hubRegistrationEndpoint).reply(200, require('./data/content-type-cache/registration.json'));
        axiosMock.onPost(config.hubContentTypesEndpoint).reply(200, require('./data/content-type-cache/real-content-types.json'));

        await cache.updateIfNecessary();

        const repository = new ContentTypeInformationRepository(cache, storage, libManager, config, new User(), new TranslationService({
            "hub-install-no-content-type": "hub-install-no-content-type",
            "hub-install-invalid-content-type": "hub-install-invalid-content-type"
        }));
        await expect(repository.install()).rejects.toThrow("hub-install-no-content-type");
        await expect(repository.install("asd")).rejects.toThrow("hub-install-invalid-content-type");
    });

    it('install rejects unauthorized users', async () => {
        const storage = new InMemoryStorage();
        const config = new H5PEditorConfig(storage);
        const libManager = new LibraryManager(new FileLibraryStorage(`${path.resolve('')}/test/data/libraries`));
        const cache = new ContentTypeCache(config, storage);
        const user = new User();

        axiosMock.onPost(config.hubRegistrationEndpoint).reply(200, require('./data/content-type-cache/registration.json'));
        axiosMock.onPost(config.hubContentTypesEndpoint).reply(200, require('./data/content-type-cache/real-content-types.json'));

        await cache.updateIfNecessary();

        const repository = new ContentTypeInformationRepository(cache, storage, libManager, config, user, new TranslationService({
            "hub-install-denied": "hub-install-denied"
        }));

        user.canInstallRecommended = false;
        user.canUpdateAndInstallLibraries = false;
        await expect(repository.install("H5P.Blanks")).rejects.toThrow("hub-install-denied");

        user.canInstallRecommended = true;
        user.canUpdateAndInstallLibraries = false;
        await expect(repository.install("H5P.Dialogcards")).resolves.toBe(true);
        await expect(repository.install("H5P.ImageHotspotQuestion")).rejects.toThrow("hub-install-denied");
    });
});
