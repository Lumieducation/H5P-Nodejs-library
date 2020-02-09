import H5PPlayer from '../src/H5PPlayer';
import EditorConfig from '../src/implementation/EditorConfig';

describe('H5PPlayer.generateIntegration()', () => {
    it('should use the passed integration', () => {
        const integration = new H5PPlayer(
            undefined,
            new EditorConfig(undefined),
            { postUserStatistics: true } as any,
            undefined
        ).generateIntegration('test', {}, {} as any);

        expect(integration.postUserStatistics).toBeTruthy();
    });
});
