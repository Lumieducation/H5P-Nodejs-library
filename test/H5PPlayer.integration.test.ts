import EditorConfig from '../examples/implementation/EditorConfig';

import H5PPlayer from '../src/H5PPlayer';

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
