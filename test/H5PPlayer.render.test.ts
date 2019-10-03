import H5PPlayer from '../src/H5PPlayer';

describe('H5P.render()', () => {
    it('should work with a callback', () => {
        const contentId = 'foo';
        const contentObject = {};
        const h5pObject = {};

        new H5PPlayer(undefined, undefined, undefined, undefined)
            .useRenderer(model => model)
            .render(contentId, contentObject, h5pObject as any)
            .then(model => {
                expect(model).toBeDefined();
                expect((model as any).contentId).toBe('foo');
            });
    });
});
