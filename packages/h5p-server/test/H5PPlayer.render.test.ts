import UrlGenerator from '../src/UrlGenerator';
import H5PPlayer from '../src/H5PPlayer';
import H5PConfig from '../src/implementation/H5PConfig';
import User from './User';
import { IPlayerModel } from '../src/types';

describe('H5P.render()', () => {
    it('should work with a callback', () => {
        const contentId = 'foo';
        const contentObject = {};
        const metadata: any = {};

        new H5PPlayer(undefined, undefined, new H5PConfig(undefined))
            .setRenderer((model) => model)
            .render(contentId, new User(), {
                parametersOverride: contentObject,
                metadataOverride: metadata as any
            })
            .then((model) => {
                expect(model).toBeDefined();
                expect((model as any).contentId).toBe('foo');
            });
    });

    it('should generate AJAX URLs with CSRF token if option is set', () => {
        const contentId = 'foo';
        const contentObject = {};
        const metadata: any = {};

        const config = new H5PConfig(undefined);

        new H5PPlayer(
            undefined,
            undefined,
            config,
            undefined,
            new UrlGenerator(config, {
                protectAjax: true,
                protectContentUserData: true,
                protectSetFinished: true,
                queryParamGenerator: (user) => {
                    return { name: '_csrf', value: 'token' };
                }
            })
        )
            .setRenderer((model) => model)
            .render(contentId, new User(), {
                parametersOverride: contentObject,
                metadataOverride: metadata as any
            })
            .then((model) => {
                expect((model as IPlayerModel).integration.ajaxPath).toBe(
                    '/h5p/ajax?_csrf=token&action='
                );
            });
    });

    it('should not generate AJAX URLs with CSRF token if option is not set', () => {
        const contentId = 'foo';
        const contentObject = {};
        const metadata: any = {};

        const config = new H5PConfig(undefined);

        new H5PPlayer(undefined, undefined, config)
            .setRenderer((model) => model)
            .render(contentId, new User(), {
                parametersOverride: contentObject,
                metadataOverride: metadata as any
            })
            .then((model) => {
                expect((model as IPlayerModel).integration.ajaxPath).toBe(
                    '/h5p/ajax?action='
                );
            });
    });

    it('adds user information to integration', async () => {
        const contentId = 'foo';
        const contentObject = {};
        const metadata: any = {};

        const config = new H5PConfig(undefined);
        const user = new User();

        const player = new H5PPlayer(undefined, undefined, config);
        player.setRenderer((model) => model);
        const playerModel: IPlayerModel = await player.render(contentId, user, {
            parametersOverride: contentObject,
            metadataOverride: metadata as any
        });

        expect(playerModel.integration.user.id).toEqual(user.id);
        expect(playerModel.integration.user.mail).toEqual(user.email);
        expect(playerModel.integration.user.name).toEqual(user.name);
    });
});
