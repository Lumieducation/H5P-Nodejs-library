import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import * as path from 'path';
import { withDir } from 'tmp-promise';
import fsExtra from 'fs-extra';

import ContentTypeCache from '../src/ContentTypeCache';
import ContentTypeInformationRepository from '../src/ContentTypeInformationRepository';
import H5PConfig from '../src/implementation/H5PConfig';
import FileLibraryStorage from '../src/implementation/fs/FileLibraryStorage';
import InMemoryStorage from '../src/implementation/InMemoryStorage';
import LibraryManager from '../src/LibraryManager';
import { LaissezFairePermissionSystem } from '../src/implementation/LaissezFairePermissionSystem';
import { IUser, GeneralPermission } from '../src/types';

import User from './User';

const axiosMock = new AxiosMockAdapter(axios);

describe('Content type information repository (= connection to H5P Hub)', () => {
    it('gets content types from hub', async () => {
        const storage = new InMemoryStorage();
        const config = new H5PConfig(storage);
        const libManager = new LibraryManager(
            new FileLibraryStorage(`${__dirname}/../../../test/data`)
        );
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

        await cache.updateIfNecessary();

        const repository = new ContentTypeInformationRepository(
            cache,
            libManager,
            config,
            new LaissezFairePermissionSystem()
        );
        const content = await repository.get(new User());
        expect(content.outdated).toBe(false);
        expect(content.libraries.length).toEqual(
            fsExtra.readJSONSync(
                path.resolve(
                    'test/data/content-type-cache/real-content-types.json'
                )
            ).contentTypes.length
        );
    });

    it('localizes information from hub', async () => {
        const storage = new InMemoryStorage();
        const config = new H5PConfig(storage);
        const libManager = new LibraryManager(
            new FileLibraryStorage(`${__dirname}/../../../test/data`)
        );
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

        await cache.updateIfNecessary();

        const translationSpy = jest.fn(
            (name, language) => `_translated_${name.replace('.', '#')}`
        );
        const repository = new ContentTypeInformationRepository(
            cache,
            libManager,
            config,
            new LaissezFairePermissionSystem(),
            translationSpy
        );
        const content = await repository.get(new User(), 'de');
        expect(
            content.libraries[0].description.startsWith('_translated_')
        ).toBe(true);
        expect(translationSpy).toBeCalled();
    });

    it('leaves information from hub as it is if no locale was found', async () => {
        const storage = new InMemoryStorage();
        const config = new H5PConfig(storage);
        const libManager = new LibraryManager(
            new FileLibraryStorage(`${__dirname}/../../../test/data`)
        );
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
                        'test/data/content-type-cache/1-content-type.json'
                    )
                )
            );

        await cache.updateIfNecessary();

        const translationSpy = jest.fn((key: string, language) =>
            key.substr(key.indexOf(':') + 1)
        );
        const repository = new ContentTypeInformationRepository(
            cache,
            libManager,
            config,
            new LaissezFairePermissionSystem(),
            translationSpy
        );
        const content = await repository.get(new User(), 'de');
        expect(content.libraries[0].description).toEqual(
            'The description of content type 1'
        );
        expect(translationSpy).toBeCalled();
    });

    it("doesn't fail if update wasn't called", async () => {
        const storage = new InMemoryStorage();
        const config = new H5PConfig(storage);
        const libManager = new LibraryManager(
            new FileLibraryStorage(`${__dirname}/../../../test/data`)
        );
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

        const repository = new ContentTypeInformationRepository(
            cache,
            libManager,
            config,
            new LaissezFairePermissionSystem()
        );
        const content = await repository.get(new User());
        expect(content.outdated).toBe(false);
        expect(content.libraries.length).toEqual(
            fsExtra.readJSONSync(
                path.resolve(
                    'test/data/content-type-cache/real-content-types.json'
                )
            ).contentTypes.length
        );
    });

    it('adds local libraries', async () => {
        const storage = new InMemoryStorage();
        const config = new H5PConfig(storage);
        const libManager = new LibraryManager(
            new FileLibraryStorage(`${__dirname}/../../../test/data/libraries`)
        );
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
                        'test/data/content-type-cache/0-content-types.json'
                    )
                )
            );

        const repository = new ContentTypeInformationRepository(
            cache,
            libManager,
            config,
            new LaissezFairePermissionSystem()
        );
        const content = await repository.get(new User());
        expect(content.libraries.length).toEqual(2);
    });

    it('detects updates to local libraries', async () => {
        const storage = new InMemoryStorage();
        const config = new H5PConfig(storage);
        const libManager = new LibraryManager(
            new FileLibraryStorage(`${__dirname}/../../../test/data/libraries`)
        );
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
                        'test/data/content-type-cache/1-content-type.json'
                    )
                )
            );

        const repository = new ContentTypeInformationRepository(
            cache,
            libManager,
            config,
            new LaissezFairePermissionSystem()
        );
        const content = await repository.get(new User());
        expect(content.libraries.length).toEqual(2);
        expect(content.libraries[0].installed).toEqual(true);
        expect(content.libraries[0].isUpToDate).toEqual(false);
    });

    it('returns local libraries if H5P Hub is unreachable', async () => {
        const storage = new InMemoryStorage();
        const config = new H5PConfig(storage);
        const libManager = new LibraryManager(
            new FileLibraryStorage(`${__dirname}/../../../test/data/libraries`)
        );
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
        axiosMock.onPost(config.hubContentTypesEndpoint).reply(500);

        const repository = new ContentTypeInformationRepository(
            cache,
            libManager,
            config,
            new LaissezFairePermissionSystem()
        );
        const content = await repository.get(new User());
        expect(content.libraries.length).toEqual(2);
    });

    it('sets LRS dependent content types to restricted', async () => {
        const storage = new InMemoryStorage();
        const config = new H5PConfig(storage);
        const libManager = new LibraryManager(
            new FileLibraryStorage(`${__dirname}/../../../test/data/libraries`)
        );
        const cache = new ContentTypeCache(config, storage);
        const user = new User();

        config.enableLrsContentTypes = false;
        config.lrsContentTypes = ['H5P.Example1'];

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
        axiosMock.onPost(config.hubContentTypesEndpoint).reply(500);

        const repository = new ContentTypeInformationRepository(
            cache,
            libManager,
            config,
            new (class extends LaissezFairePermissionSystem {
                async checkForGeneralAction(
                    _actingUser: IUser,
                    permission: GeneralPermission
                ): Promise<boolean> {
                    return permission !== GeneralPermission.CreateRestricted;
                }
            })()
        );
        const content = await repository.get(user);
        expect(content.libraries.length).toEqual(2);
        expect(
            content.libraries.find((l) => l.machineName === 'H5P.Example1')
                .restricted
        ).toEqual(true);
        expect(
            content.libraries.find((l) => l.machineName === 'H5P.Example3')
                .restricted
        ).toEqual(false);
    });

    it('install rejects invalid machine names', async () => {
        const storage = new InMemoryStorage();
        const config = new H5PConfig(storage);
        const libManager = new LibraryManager(
            new FileLibraryStorage(`${__dirname}/../../../test/data/libraries`)
        );
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

        await cache.updateIfNecessary();

        const repository = new ContentTypeInformationRepository(
            cache,
            libManager,
            config,
            new LaissezFairePermissionSystem()
        );
        await expect(
            repository.installContentType(undefined, new User())
        ).rejects.toThrow('hub-install-no-content-type');
        await expect(
            repository.installContentType('asd', new User())
        ).rejects.toThrow('hub-install-invalid-content-type');
    });

    it('install rejects unauthorized users', async () => {
        const storage = new InMemoryStorage();
        const config = new H5PConfig(storage);
        const libManager = new LibraryManager(
            new FileLibraryStorage(`${__dirname}/../../../test/data/libraries`)
        );
        const cache = new ContentTypeCache(config, storage);
        const user = new User();

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

        await cache.updateIfNecessary();

        let repository = new ContentTypeInformationRepository(
            cache,
            libManager,
            config,
            new (class extends LaissezFairePermissionSystem {
                async checkForGeneralAction(
                    _actingUser: IUser,
                    permission: GeneralPermission
                ): Promise<boolean> {
                    return !(
                        permission === GeneralPermission.InstallRecommended ||
                        permission ===
                            GeneralPermission.UpdateAndInstallLibraries
                    );
                }
            })()
        );

        await expect(
            repository.installContentType('H5P.Blanks', user)
        ).rejects.toThrow('hub-install-denied');

        repository = repository = new ContentTypeInformationRepository(
            cache,
            libManager,
            config,
            new (class extends LaissezFairePermissionSystem {
                async checkForGeneralAction(
                    _actingUser: IUser,
                    permission: GeneralPermission
                ): Promise<boolean> {
                    return (
                        permission !==
                        GeneralPermission.UpdateAndInstallLibraries
                    );
                }
            })()
        );
        await expect(
            repository.installContentType('H5P.ImageHotspotQuestion', user)
        ).rejects.toThrow('hub-install-denied');
    });

    it('install content types from the hub', async () => {
        const storage = new InMemoryStorage();
        const config = new H5PConfig(storage);

        await withDir(
            async ({ path: tmpDir }) => {
                const libManager = new LibraryManager(
                    new FileLibraryStorage(tmpDir)
                );
                const cache = new ContentTypeCache(config, storage);
                const user = new User();

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

                axiosMock
                    .onGet(`${config.hubContentTypesEndpoint}H5P.DragText`)
                    .reply(() => [
                        200,
                        fsExtra.createReadStream(
                            path.resolve(
                                'test/data/example-packages/H5P.DragText.h5p'
                            )
                        )
                    ]);

                await cache.updateIfNecessary();
                const repository = new ContentTypeInformationRepository(
                    cache,
                    libManager,
                    config,
                    new LaissezFairePermissionSystem()
                );

                await expect(
                    repository.installContentType('H5P.DragText', user)
                ).resolves.toBeDefined();
                const libs = await libManager.listInstalledLibraries();
                expect(Object.keys(libs).length).toEqual(11); // TODO: must be adapted to changes in the Hub file
            },
            { keep: false, unsafeCleanup: true }
        );
    }, 30000);
});
