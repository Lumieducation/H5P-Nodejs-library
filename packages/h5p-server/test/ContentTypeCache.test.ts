import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import mockdate from 'mockdate';
import path from 'path';
import fsExtra from 'fs-extra';

import ContentTypeCache from '../src/ContentTypeCache';
import H5PConfig from '../src/implementation/H5PConfig';
import InMemoryStorage from '../src/implementation/InMemoryStorage';

const axiosMock = new AxiosMockAdapter(axios);

describe('registering the site at H5P Hub', () => {
    afterEach(() => {
        axiosMock.reset();
    });

    it('returns a uuid', async () => {
        const storage = new InMemoryStorage();
        const config = new H5PConfig(storage);
        const cache = new ContentTypeCache(config, undefined);

        axiosMock
            .onPost(config.hubRegistrationEndpoint)
            .reply(
                200,
                fsExtra.readJSONSync(
                    path.resolve(
                        'test/data/content-type-cache/registration.json'
                    )
                )
            );

        const uuid = await cache.registerOrGetUuid();
        expect(uuid).toBeDefined();
        expect(config.uuid).toEqual(uuid);
    });

    it('fails with an error when URL is unreachable', async () => {
        const storage = new InMemoryStorage();
        const config = new H5PConfig(storage);
        const cache = new ContentTypeCache(config, undefined);

        config.uuid = '';
        axiosMock.onPost(config.hubRegistrationEndpoint).reply(408);

        let error;
        try {
            await cache.registerOrGetUuid();
        } catch (e) {
            error = e;
        }
        expect(error).toBeDefined();
    });

    it("get ids from external if there's an override", async () => {
        const storage = new InMemoryStorage();
        const config = new H5PConfig(storage);
        const getIdSpy = jest.fn(() => 'overriden id');
        const cache = new ContentTypeCache(config, storage, getIdSpy);
        axiosMock.reset();
        axiosMock
            .onPost(config.hubRegistrationEndpoint)
            .reply(
                200,
                fsExtra.readJSONSync(
                    path.resolve(
                        'test/data/content-type-cache/registration.json'
                    )
                )
            );
        await expect(cache.registerOrGetUuid()).resolves.toEqual(
            '8de62c47-f335-42f6-909d-2d8f4b7fb7f5'
        );
        expect(getIdSpy).toHaveBeenCalled();
    });
});

describe('getting H5P Hub content types', () => {
    it('should return an empty cache if it was not loaded yet', async () => {
        const storage = new InMemoryStorage();
        const config = new H5PConfig(storage);
        const cache = new ContentTypeCache(config, storage);

        const cached = await cache.get();
        expect(cached).toEqual([]);
    });
    it('loads content type information from the H5P Hub', async () => {
        const storage = new InMemoryStorage();
        const config = new H5PConfig(storage);
        const cache = new ContentTypeCache(config, storage);

        axiosMock
            .onPost(config.hubRegistrationEndpoint)
            .reply(
                200,
                fsExtra.readJSONSync(
                    path.resolve(
                        'test/data/content-type-cache/registration.json'
                    )
                )
            );
        axiosMock
            .onPost(config.hubContentTypesEndpoint)
            .reply(
                200,
                fsExtra.readJSONSync(
                    path.resolve(
                        'test/data/content-type-cache/real-content-types.json'
                    )
                )
            );

        let updated = await cache.updateIfNecessary();
        expect(updated).toEqual(true);

        const cached = await cache.get();
        expect(cached).toBeDefined();

        updated = await cache.updateIfNecessary();
        expect(updated).toEqual(false);
    });
    it("doesn't overwrite existing cache if it fails to load a new one", async () => {
        const storage = new InMemoryStorage();
        const config = new H5PConfig(storage);
        const cache = new ContentTypeCache(config, storage);

        config.contentTypeCacheRefreshInterval = 1;

        axiosMock
            .onPost(config.hubRegistrationEndpoint)
            .reply(
                200,
                fsExtra.readJSONSync(
                    path.resolve(
                        'test/data/content-type-cache/registration.json'
                    )
                )
            );
        axiosMock
            .onPost(config.hubContentTypesEndpoint)
            .reply(
                200,
                fsExtra.readJSONSync(
                    path.resolve(
                        'test/data/content-type-cache/real-content-types.json'
                    )
                )
            );

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
    it('detects outdated state', async () => {
        const storage = new InMemoryStorage();
        const config = new H5PConfig(storage);
        const cache = new ContentTypeCache(config, storage);

        config.contentTypeCacheRefreshInterval = 100;

        axiosMock
            .onPost(config.hubRegistrationEndpoint)
            .reply(
                200,
                fsExtra.readJSONSync(
                    path.resolve(
                        'test/data/content-type-cache/registration.json'
                    )
                )
            );
        axiosMock
            .onPost(config.hubContentTypesEndpoint)
            .reply(
                200,
                fsExtra.readJSONSync(
                    path.resolve(
                        'test/data/content-type-cache/real-content-types.json'
                    )
                )
            );

        expect(await cache.isOutdated()).toEqual(true);
        await cache.updateIfNecessary();
        expect(await cache.isOutdated()).toEqual(false);
        mockdate.set(Date.now() + 200);
        expect(await cache.isOutdated()).toEqual(true);
        mockdate.reset();
    });
});
