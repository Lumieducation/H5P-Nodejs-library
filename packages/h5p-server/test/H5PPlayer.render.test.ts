import H5PPlayer from '../src/H5PPlayer';
import H5PConfig from '../src/implementation/H5PConfig';

describe('H5P.render()', () => {
    it('should work with a callback', () => {
        const contentId = 'foo';
        const contentObject = {};
        const metadata: any = {};

        new H5PPlayer(undefined, undefined, new H5PConfig(undefined))
            .setRenderer((model) => model)
            .render(contentId, contentObject, metadata)
            .then((model) => {
                expect(model).toBeDefined();
                expect((model as any).contentId).toBe('foo');
            });
    });
});
