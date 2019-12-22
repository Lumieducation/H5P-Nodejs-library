import H5PPlayer from '../src/H5PPlayer';

describe('H5PPlayer.generateIntegration()', () => {
    it('should use the passed integration', () => {
        const contentId = 'foo';
        const contentObject = {};
        const h5pObject = {};

        const integration = new H5PPlayer(
            undefined,
            undefined,
            { postUserStatistics: true } as any,
            undefined
        ).generateIntegration('test', {}, {} as any);

        expect(integration.postUserStatistics).toBeTruthy();
    });
});
