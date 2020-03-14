import H5PPlayer from '../src/H5PPlayer';
import EditorConfig from '../src/implementation/EditorConfig';

describe('H5P.render()', () => {
    it('should work with a callback', () => {
        const contentId = 'foo';
        const contentObject = {};
        const h5pObject = {};

        new H5PPlayer(
            undefined,
            new EditorConfig(undefined),
            undefined,
            undefined
        )
            .setRenderer(model => model)
            .render(contentId, contentObject, h5pObject as any)
            .then(model => {
                expect(model).toBeDefined();
                expect((model as any).contentId).toBe('foo');
            });
    });
});
