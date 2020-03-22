import H5PPlayer from '../src/H5PPlayer';
import EditorConfig from '../src/implementation/EditorConfig';

describe('H5P.render()', () => {
    it('should work with a callback', () => {
        const contentId = 'foo';
        const contentObject = {};
        const metadata: any = {};

        new H5PPlayer(undefined, undefined, new EditorConfig(undefined))
            .setRenderer(model => model)
            .render(contentId, contentObject, metadata)
            .then(model => {
                expect(model).toBeDefined();
                expect((model as any).contentId).toBe('foo');
            });
    });
});
