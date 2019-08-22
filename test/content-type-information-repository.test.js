const path = require('path');
const MockAdapter = require('axios-mock-adapter');
const axios = require('axios');
const fs = require('fs-extra');
const shortid = require('shortid');

const InMemoryStorage = require('../build/in-memory-storage');
const H5PEditorConfig = require('../build/config');
const LibraryManager = require('../build/library-manager');
const FileLibraryStorage = require('../build/file-library-storage');
const ContentTypeCache = require('../build/content-type-cache');
const ContentTypeInformationRepository = require('../build/content-type-information-repository');
const User = require('./mockups/user');
const TranslationService = require('../build/translation-service');
const H5pError = require('../build/helpers/h5p-error'); // eslint-disable-line no-unused-vars

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
        await expect(repository.install("H5P.Blanks")).rejects.toThrow("hub-install-denied");
    });

    it('install content types from the hub', async () => {
        const storage = new InMemoryStorage();
        const config = new H5PEditorConfig(storage);

        const tmpDir = `${path.resolve('')}/test/tmp-${shortid()}`;
        try {
            const libManager = new LibraryManager(new FileLibraryStorage(tmpDir));
            const cache = new ContentTypeCache(config, storage);
            const user = new User();

            axiosMock.onPost(config.hubRegistrationEndpoint).reply(200, require('./data/content-type-cache/registration.json'));
            axiosMock.onPost(config.hubContentTypesEndpoint).reply(200, require('./data/content-type-cache/real-content-types.json'));

            await cache.updateIfNecessary();
            const repository = new ContentTypeInformationRepository(cache, storage, libManager, config, user, new TranslationService({
            }));

            axiosMock.restore(); // TOO: It would be nicer if the download of the Hub File could be mocked as well, but this is not possible as axios-mock-adapter doesn't support stream yet ()
            await expect(repository.install("H5P.DragText")).resolves.toEqual(true);
            const libs = await libManager.getInstalled();
            expect(Object.keys(libs).length).toEqual(11); // TODO: must be adapted to changes in the Hub file
        }
        finally {
            await fs.remove(tmpDir);
        }
    }, 30000);
});
