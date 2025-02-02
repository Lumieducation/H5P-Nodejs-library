import path from 'path';

import { MalwareScanResult } from '@lumieducation/h5p-server';

import ClamAVScanner from '../src/ClamAVScanner';

describe('ClamAVScanner', () => {
    it('initializes ClamAV scanner', async () => {
        const clamAVScanner = await ClamAVScanner.create();
        expect(clamAVScanner).toBeInstanceOf(ClamAVScanner);
    });

    it('reports "Clean" for uninfected files', async () => {
        const clamAVScanner = await ClamAVScanner.create();
        await expect(
            clamAVScanner.scan(path.resolve(__dirname, 'no-virus.txt'))
        ).resolves.toMatchObject({ result: MalwareScanResult.Clean });
    });

    it('reports "MalwareFound" for infected files', async () => {
        const clamAVScanner = await ClamAVScanner.create();
        await expect(
            clamAVScanner.scan(path.resolve(__dirname, 'eicar.txt'))
        ).resolves.toMatchObject({
            result: MalwareScanResult.MalwareFound,
            viruses: 'Win.Test.EICAR_HDB-1'
        });
    });
    it("doesn't break if it is set to non-existent file", async () => {
        const clamAVScanner = await ClamAVScanner.create();
        await expect(
            clamAVScanner.scan(path.resolve(__dirname, 'doesntexist.txt'))
        ).resolves.toMatchObject({ result: MalwareScanResult.NotScanned });
    });
});
