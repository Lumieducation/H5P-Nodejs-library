import UrlGenerator from '../src/UrlGenerator';
import H5PPlayer from '../src/H5PPlayer';
import H5PConfig from '../src/implementation/H5PConfig';
import { LaissezFairePermissionSystem } from '../src';
import { IPlayerModel } from '../src/types';

import User from './User';
import MockContentUserDataStorage from './__mocks__/ContentUserDataStorage';

describe('H5P.render()', () => {
    it('should work with a callback', () => {
        const contentId = 'foo';
        const contentObject = {};
        const metadata: any = {};

        new H5PPlayer(undefined, undefined, new H5PConfig(undefined))
            .setRenderer((model) => model)
            .render(contentId, new User(), 'en', {
                parametersOverride: contentObject,
                metadataOverride: metadata as any
            })
            .then((model) => {
                expect(model).toBeDefined();
                expect((model as any).contentId).toBe('foo');
            });
    });

    it('should generate AJAX URLs with CSRF token if option is set', async () => {
        const contentId = 'foo';
        const contentObject = {};
        const metadata: any = {};

        const config = new H5PConfig(undefined);

        const model = await new H5PPlayer(
            undefined,
            undefined,
            config,
            undefined,
            new UrlGenerator(config, {
                protectAjax: true,
                protectContentUserData: true,
                protectSetFinished: true,
                queryParamGenerator: (user) => ({
                    name: '_csrf',
                    value: 'token'
                })
            })
        )
            .setRenderer((m) => m)
            .render(contentId, new User(), 'en', {
                parametersOverride: contentObject,
                metadataOverride: metadata as any
            });

        expect((model as IPlayerModel).integration.ajaxPath).toBe(
            '/h5p/ajax?_csrf=token&action='
        );
    });

    it('should not generate AJAX URLs with CSRF token if option is not set', async () => {
        const contentId = 'foo';
        const contentObject = {};
        const metadata: any = {};

        const config = new H5PConfig(undefined);

        const player = new H5PPlayer(undefined, undefined, config);
        player.setRenderer((m) => m);
        const model = await player.render(contentId, new User(), 'en', {
            parametersOverride: contentObject,
            metadataOverride: metadata as any
        });
        expect((model as IPlayerModel).integration.ajaxPath).toBe(
            '/h5p/ajax?action='
        );
    });

    it('adds user information to integration', async () => {
        const contentId = 'foo';
        const contentObject = {};
        const metadata: any = {};

        const config = new H5PConfig(undefined);
        const user = new User();

        const player = new H5PPlayer(undefined, undefined, config);
        player.setRenderer((model) => model);
        const playerModel: IPlayerModel = await player.render(
            contentId,
            user,
            'en',
            {
                parametersOverride: contentObject,
                metadataOverride: metadata as any
            }
        );

        expect(playerModel.integration.user.id).toEqual(user.id);
        expect(playerModel.integration.user.mail).toEqual(user.email);
        expect(playerModel.integration.user.name).toEqual(user.name);
    });

    it('adds contentUserData to integration if a contentUserDataStorage is present and sets the contentUserData POST URL', async () => {
        const contentId = 'foo';
        const contentObject = {};
        const metadata: any = {};

        const config = new H5PConfig(undefined);
        const user = new User();

        const mockContentUserDataStorage = MockContentUserDataStorage(
            contentId,
            user.id
        );

        const player = new H5PPlayer(
            undefined,
            undefined,
            config,
            undefined,
            undefined,
            undefined,
            undefined,
            mockContentUserDataStorage
        );
        player.setRenderer((model) => model);
        const playerModel: IPlayerModel = await player.render(
            contentId,
            user,
            'en',
            {
                parametersOverride: contentObject,
                metadataOverride: metadata as any
            }
        );

        expect(
            playerModel.integration.contents[`cid-${contentId}`].contentUserData
        ).toEqual([{ state: `${contentId}-${user.id}` }]);
        expect(playerModel.integration.ajax.contentUserData).toEqual(
            '/h5p/contentUserData/:contentId/:dataType/:subContentId'
        );
    });

    it('adds the contextId to the contentUserData POST URL if contextId is used', async () => {
        const contentId = 'foo';
        const contentObject = {};
        const metadata: any = {};

        const config = new H5PConfig(undefined);
        const user = new User();

        const mockContentUserDataStorage = MockContentUserDataStorage(
            contentId,
            user.id
        );

        const player = new H5PPlayer(
            undefined,
            undefined,
            config,
            undefined,
            undefined,
            undefined,
            undefined,
            mockContentUserDataStorage
        );
        player.setRenderer((model) => model);
        const playerModel: IPlayerModel = await player.render(
            contentId,
            user,
            'en',
            {
                parametersOverride: contentObject,
                metadataOverride: metadata as any,
                contextId: '123'
            }
        );

        expect(playerModel.integration.ajax.contentUserData).toEqual(
            '/h5p/contentUserData/:contentId/:dataType/:subContentId?contextId=123'
        );
    });

    it('adds the contextId to the contentUserData POST URL with CSRF token if contextId is used', async () => {
        const contentId = 'foo';
        const contentObject = {};
        const metadata: any = {};

        const config = new H5PConfig(undefined);
        const user = new User();

        const mockContentUserDataStorage = MockContentUserDataStorage(
            contentId,
            user.id
        );

        const player = new H5PPlayer(
            undefined,
            undefined,
            config,
            undefined,
            new UrlGenerator(config, {
                protectAjax: true,
                protectContentUserData: true,
                protectSetFinished: true,
                queryParamGenerator: () => ({
                    name: '_csrf',
                    value: 'token'
                })
            }),
            undefined,
            undefined,
            mockContentUserDataStorage
        );
        player.setRenderer((model) => model);
        const playerModel: IPlayerModel = await player.render(
            contentId,
            user,
            'en',
            {
                parametersOverride: contentObject,
                metadataOverride: metadata as any,
                contextId: '123'
            }
        );

        expect(playerModel.integration.ajax.contentUserData).toEqual(
            '/h5p/contentUserData/:contentId/:dataType/:subContentId?contextId=123&_csrf=token'
        );
    });

    it('sets contentUserData to undefined if contentUserDataStorage is not present', async () => {
        const contentId = 'foo';
        const contentObject = {};
        const metadata: any = {};

        const config = new H5PConfig(undefined);
        const user = new User();

        const player = new H5PPlayer(
            undefined,
            undefined,
            config,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined
        );
        player.setRenderer((model) => model);
        const playerModel: IPlayerModel = await player.render(
            contentId,
            user,
            'en',
            {
                parametersOverride: contentObject,
                metadataOverride: metadata as any
            }
        );

        expect(
            playerModel.integration.contents[`cid-${contentId}`].contentUserData
        ).toBeUndefined();
    });

    it('sets contentUserData to undefined if no contentUserData is found for the id', async () => {
        const contentId = 'abc';
        const contentObject = {};
        const metadata: any = {};

        const config = new H5PConfig(undefined);
        const user = new User();

        const player = new H5PPlayer(
            undefined,
            undefined,
            config,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined
        );
        player.setRenderer((model) => model);
        const playerModel: IPlayerModel = await player.render(
            contentId,
            user,
            'en',
            {
                parametersOverride: contentObject,
                metadataOverride: metadata as any
            }
        );

        expect(
            playerModel.integration.contents[`cid-${contentId}`].contentUserData
        ).toBeUndefined();
    });

    it('returns your own content users data', async () => {
        const contentId = 'foo';
        const contentObject = {};
        const metadata: any = {};

        const config = new H5PConfig(undefined);
        const user = new User();

        const mockContentUserDataStorage = MockContentUserDataStorage(
            contentId,
            user.id
        );
        mockContentUserDataStorage.setMockData([
            {
                contentId,
                userId: user.id,
                dataType: 'state',
                subContentId: '0',
                userState: `{"mock": "data"}`,
                preload: true
            }
        ]);

        const player = new H5PPlayer(
            undefined,
            undefined,
            config,
            undefined,
            undefined,
            undefined,
            {},
            mockContentUserDataStorage
        );
        player.setRenderer((model) => model);
        const playerModel: IPlayerModel = await player.render(
            contentId,
            user,
            'en',
            {
                parametersOverride: contentObject,
                metadataOverride: metadata as any
            }
        );

        expect(
            playerModel.integration.contents['cid-foo'].contentUserData
        ).toMatchObject([
            {
                state: `{"mock": "data"}`
            }
        ]);
    });

    it('returns others content users data', async () => {
        const contentId = 'foo';
        const contentObject = {};
        const metadata: any = {};

        const config = new H5PConfig(undefined);
        const user = new User();

        const mockContentUserDataStorage = MockContentUserDataStorage(
            contentId,
            user.id
        );
        mockContentUserDataStorage.getContentUserDataByContentIdAndUser =
            async (cid: string, userId: string) => {
                if (userId == '2') {
                    return [
                        {
                            contentId,
                            userId: userId,
                            dataType: 'state',
                            subContentId: '0',
                            userState: `user2-state`,
                            preload: true
                        }
                    ];
                }
                if (userId == '1') {
                    return [];
                }
            };

        const player = new H5PPlayer(
            undefined,
            undefined,
            config,
            undefined,
            undefined,
            undefined,
            {},
            mockContentUserDataStorage
        );
        player.setRenderer((model) => model);
        const playerModel: IPlayerModel = await player.render(
            contentId,
            user,
            'en',
            {
                parametersOverride: contentObject,
                metadataOverride: metadata as any,
                asUserId: '2'
            }
        );

        expect(
            playerModel.integration.contents['cid-foo'].contentUserData
        ).toMatchObject([
            {
                state: `user2-state`
            }
        ]);
    });

    it("rejects viewing others content users data if you don't have the permission", async () => {
        const contentId = 'foo';
        const contentObject = {};
        const metadata: any = {};

        const config = new H5PConfig(undefined);
        const user = new User();

        const mockContentUserDataStorage = MockContentUserDataStorage(
            contentId,
            user.id
        );

        const permissionSystem = new LaissezFairePermissionSystem();
        permissionSystem.checkForUserData = async (
            actingUser,
            _permission,
            _cid,
            affectedUserId
        ) => {
            if (actingUser.id !== affectedUserId) {
                return false;
            }
            return true;
        };

        const player = new H5PPlayer(
            undefined,
            undefined,
            config,
            undefined,
            undefined,
            undefined,
            {
                permissionSystem
            },
            mockContentUserDataStorage
        );
        player.setRenderer((model) => model);

        await expect(
            player.render(contentId, user, 'en', {
                parametersOverride: contentObject,
                metadataOverride: metadata as any,
                asUserId: user.id
            })
        ).resolves.toBeDefined();

        await expect(
            player.render(contentId, user, 'en', {
                parametersOverride: contentObject,
                metadataOverride: metadata as any,
                asUserId: '2'
            })
        ).rejects.toThrowError('h5p-server:user-state-missing-view-permission');
    });
});
