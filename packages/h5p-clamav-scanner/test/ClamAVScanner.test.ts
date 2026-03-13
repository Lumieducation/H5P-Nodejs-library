import { readFile, readdir } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';

import { File, MalwareScanResult } from '@lumieducation/h5p-server';

import ClamAVScanner from '../src/ClamAVScanner';

const createFileFromFilePath = (filePath: string, data?: Buffer): File => {
    const fileName = path.basename(filePath);
    return {
        data: data,
        mimetype: '',
        name: fileName,
        size: 0,
        tempFilePath: data ? undefined : filePath
    };
};

describe('ClamAVScanner', () => {
    it('initializes ClamAV scanner', async () => {
        const clamAVScanner = await ClamAVScanner.create();
        expect(clamAVScanner).toBeInstanceOf(ClamAVScanner);
    });

    describe('scan files', () => {
        it('reports "Clean" for uninfected files', async () => {
            const clamAVScanner = await ClamAVScanner.create();
            const filePath = path.resolve(__dirname, 'no-virus.txt');
            const file = createFileFromFilePath(filePath);
            await expect(clamAVScanner.scan(file)).resolves.toMatchObject({
                result: MalwareScanResult.Clean
            });
        });

        it('reports "MalwareFound" for infected files', async () => {
            const clamAVScanner = await ClamAVScanner.create();
            const filePath = path.resolve(__dirname, 'eicar.txt');
            const file = createFileFromFilePath(filePath);
            await expect(clamAVScanner.scan(file)).resolves.toMatchObject({
                result: MalwareScanResult.MalwareFound,
                viruses: expect.stringMatching(
                    /(^Win\.Test\.EICAR_HDB-1$)|(^Eicar-Test-Signature$)/
                )
            });
        });
        it("doesn't break if it is set to non-existent file", async () => {
            const clamAVScanner = await ClamAVScanner.create();
            const filePath = path.resolve(__dirname, 'doesntexist.txt');
            const file = createFileFromFilePath(filePath);
            await expect(clamAVScanner.scan(file)).resolves.toMatchObject({
                result: MalwareScanResult.NotScanned
            });
        });
    });

    describe('scan buffers using ClamAV binary', () => {
        it('reports "Clean" for uninfected buffers', async () => {
            const clamAVScanner = await ClamAVScanner.create();
            const filePath = path.resolve(__dirname, 'no-virus.txt');
            const fileData = await readFile(filePath);
            const data = Buffer.from(fileData);
            const file = createFileFromFilePath(filePath, data);
            await expect(clamAVScanner.scan(file)).resolves.toMatchObject({
                result: MalwareScanResult.Clean
            });
        });
        it('reports "MalwareFound" for infected buffers', async () => {
            const clamAVScanner = await ClamAVScanner.create();
            const filePath = path.resolve(__dirname, 'eicar.txt');
            const fileData = await readFile(filePath);
            const data = Buffer.from(fileData);
            const file = createFileFromFilePath(filePath, data);
            await expect(clamAVScanner.scan(file)).resolves.toMatchObject({
                result: MalwareScanResult.MalwareFound,
                viruses: 'Eicar-Test-Signature'
            });
        });
        it("doesn't break if it is an empty buffer", async () => {
            const clamAVScanner = await ClamAVScanner.create();
            const filePath = path.resolve(__dirname, 'doesntexist.txt');
            const file = createFileFromFilePath(filePath);
            file.tempFilePath = undefined;
            await expect(clamAVScanner.scan(file)).resolves.toMatchObject({
                result: MalwareScanResult.NotScanned
            });
        });

        it('cleans up temporary files after scanning', async () => {
            const clamAVScanner = await ClamAVScanner.create();
            const filePath = path.resolve(__dirname, 'no-virus.txt');
            const fileData = await readFile(filePath);
            const data = Buffer.from(fileData);
            const file = createFileFromFilePath(filePath, data);

            // Get temp directories before scan
            const tmpDirPath = tmpdir();
            const beforeScan = await readdir(tmpDirPath);
            const clamAvDirsBefore = beforeScan.filter((name) =>
                name.startsWith('clam-av-')
            );

            // Perform scan
            await clamAVScanner.scan(file);

            // Get temp directories after scan
            const afterScan = await readdir(tmpDirPath);
            const clamAvDirsAfter = afterScan.filter((name) =>
                name.startsWith('clam-av-')
            );

            // No new clam-av temp directories should remain
            const newClamAvDirs = clamAvDirsAfter.filter(
                (name) => !clamAvDirsBefore.includes(name)
            );
            expect(newClamAvDirs.length).toBe(0);
        });

        it('cleans up temporary files after multiple sequential scans', async () => {
            const clamAVScanner = await ClamAVScanner.create();
            const filePath = path.resolve(__dirname, 'no-virus.txt');
            const fileData = await readFile(filePath);
            const data = Buffer.from(fileData);

            // Get temp directories before scans
            const tmpDirPath = tmpdir();
            const beforeScan = await readdir(tmpDirPath);
            const clamAvDirsBefore = beforeScan.filter((name) =>
                name.startsWith('clam-av-')
            );

            // Perform multiple scans
            for (let i = 0; i < 3; i++) {
                const file = createFileFromFilePath(`test-file-${i}.txt`, data);
                await clamAVScanner.scan(file);
            }

            // Get temp directories after scans
            const afterScan = await readdir(tmpDirPath);
            const clamAvDirsAfter = afterScan.filter((name) =>
                name.startsWith('clam-av-')
            );

            // No new clam-av temp directories should remain
            const newClamAvDirs = clamAvDirsAfter.filter(
                (name) => !clamAvDirsBefore.includes(name)
            );
            expect(newClamAvDirs.length).toBe(0);
        });

        it('cleans up temporary files even when virus is found', async () => {
            const clamAVScanner = await ClamAVScanner.create();
            const filePath = path.resolve(__dirname, 'eicar.txt');
            const fileData = await readFile(filePath);
            const data = Buffer.from(fileData);
            const file = createFileFromFilePath(filePath, data);

            // Get temp directories before scan
            const tmpDirPath = tmpdir();
            const beforeScan = await readdir(tmpDirPath);
            const clamAvDirsBefore = beforeScan.filter((name) =>
                name.startsWith('clam-av-')
            );

            // Perform scan (should find virus)
            const result = await clamAVScanner.scan(file);
            expect(result.result).toBe(MalwareScanResult.MalwareFound);

            // Get temp directories after scan
            const afterScan = await readdir(tmpDirPath);
            const clamAvDirsAfter = afterScan.filter((name) =>
                name.startsWith('clam-av-')
            );

            // No new clam-av temp directories should remain
            const newClamAvDirs = clamAvDirsAfter.filter(
                (name) => !clamAvDirsBefore.includes(name)
            );
            expect(newClamAvDirs.length).toBe(0);
        });

        it('sanitizes filenames with path traversal attempts', async () => {
            const clamAVScanner = await ClamAVScanner.create();
            const filePath = path.resolve(__dirname, 'no-virus.txt');
            const fileData = await readFile(filePath);
            const data = Buffer.from(fileData);

            // Create a file with a path traversal attempt in the name
            const file: File = {
                data: data,
                mimetype: '',
                name: '../../../etc/passwd',
                size: 0
            };

            // Should not throw and should scan successfully
            const result = await clamAVScanner.scan(file);
            expect(result.result).toBe(MalwareScanResult.Clean);
        });

        it('handles filenames with multiple path separators', async () => {
            const clamAVScanner = await ClamAVScanner.create();
            const filePath = path.resolve(__dirname, 'no-virus.txt');
            const fileData = await readFile(filePath);
            const data = Buffer.from(fileData);

            // Create a file with path separators in the name
            const file: File = {
                data: data,
                mimetype: '',
                name: 'some/nested/path/file.txt',
                size: 0
            };

            // Should not throw and should scan successfully
            const result = await clamAVScanner.scan(file);
            expect(result.result).toBe(MalwareScanResult.Clean);
        });

        it('uses fallback filename when file.name is empty', async () => {
            const clamAVScanner = await ClamAVScanner.create();
            const filePath = path.resolve(__dirname, 'no-virus.txt');
            const fileData = await readFile(filePath);
            const data = Buffer.from(fileData);

            // Create a file with an empty name
            const file: File = {
                data: data,
                mimetype: '',
                name: '',
                size: 0
            };

            // Should not throw and should scan successfully using 'upload' as fallback
            const result = await clamAVScanner.scan(file);
            expect(result.result).toBe(MalwareScanResult.Clean);
        });
    });

    // These tests require a running ClamAV daemon and are skipped if no host/port config is provided
    const clamdHost = process.env.CLAMDSCAN_HOST || 'localhost';
    const clamdPort = process.env.CLAMDSCAN_PORT
        ? Number(process.env.CLAMDSCAN_PORT)
        : 3310;
    const describeClamD =
        process.env.CLAMDSCAN_HOST || process.env.CLAMDSCAN_PORT
            ? describe
            : describe.skip;

    describeClamD('scan buffers using ClamAV daemon', () => {
        it('reports "Clean" for uninfected buffers', async () => {
            const clamAVScanner = await ClamAVScanner.create({
                clamdscan: { host: clamdHost, port: clamdPort }
            });
            const filePath = path.resolve(__dirname, 'no-virus.txt');
            const fileData = await readFile(filePath);
            const data = Buffer.from(fileData);
            const file = createFileFromFilePath(filePath, data);
            await expect(clamAVScanner.scan(file)).resolves.toMatchObject({
                result: MalwareScanResult.Clean
            });
        });
        it('reports "MalwareFound" for infected buffers', async () => {
            const clamAVScanner = await ClamAVScanner.create({
                clamdscan: { host: clamdHost, port: clamdPort }
            });
            const filePath = path.resolve(__dirname, 'eicar.txt');
            const fileData = await readFile(filePath);
            const data = Buffer.from(fileData);
            const file = createFileFromFilePath(filePath, data);
            await expect(clamAVScanner.scan(file)).resolves.toMatchObject({
                result: MalwareScanResult.MalwareFound,
                viruses: 'Eicar-Test-Signature'
            });
        });
        it("doesn't break if it is an empty buffer", async () => {
            const clamAVScanner = await ClamAVScanner.create({
                clamdscan: { host: clamdHost, port: clamdPort }
            });
            const filePath = path.resolve(__dirname, 'doesntexist.txt');
            const file = createFileFromFilePath(filePath);
            file.tempFilePath = undefined;
            await expect(clamAVScanner.scan(file)).resolves.toMatchObject({
                result: MalwareScanResult.NotScanned
            });
        });
    });

    describe('clamdServiceEnabled logic', () => {
        describeClamD(
            'uses temp file scanning when preference is clamdscan (even with daemon config)',
            () => {
                it('scans successfully using temp files instead of stream', async () => {
                    // When preference is explicitly 'clamdscan', clamdServiceEnabled is false
                    // This means buffer scanning uses temp files, not stream scanning
                    const clamAVScanner = await ClamAVScanner.create({
                        preference: 'clamdscan',
                        clamdscan: { host: clamdHost, port: clamdPort }
                    });
                    const filePath = path.resolve(__dirname, 'no-virus.txt');
                    const fileData = await readFile(filePath);
                    const data = Buffer.from(fileData);
                    const file = createFileFromFilePath(filePath, data);

                    // Should still work (using temp file method instead of stream)
                    await expect(
                        clamAVScanner.scan(file)
                    ).resolves.toMatchObject({
                        result: MalwareScanResult.Clean
                    });
                });

                it('cleans up temp files when preference forces temp file scanning', async () => {
                    const clamAVScanner = await ClamAVScanner.create({
                        preference: 'clamdscan',
                        clamdscan: { host: clamdHost, port: clamdPort }
                    });
                    const filePath = path.resolve(__dirname, 'no-virus.txt');
                    const fileData = await readFile(filePath);
                    const data = Buffer.from(fileData);
                    const file = createFileFromFilePath(filePath, data);

                    // Get temp directories before scan
                    const tmpDirPath = tmpdir();
                    const beforeScan = await readdir(tmpDirPath);
                    const clamAvDirsBefore = beforeScan.filter((name) =>
                        name.startsWith('clam-av-')
                    );

                    // Perform scan
                    await clamAVScanner.scan(file);

                    // Get temp directories after scan
                    const afterScan = await readdir(tmpDirPath);
                    const clamAvDirsAfter = afterScan.filter((name) =>
                        name.startsWith('clam-av-')
                    );

                    // No new clam-av temp directories should remain
                    const newClamAvDirs = clamAvDirsAfter.filter(
                        (name) => !clamAvDirsBefore.includes(name)
                    );
                    expect(newClamAvDirs.length).toBe(0);
                });
            }
        );

        it('uses temp file scanning when preference is clamscan', async () => {
            // When preference is 'clamscan', there's no daemon, so temp file is used
            const clamAVScanner = await ClamAVScanner.create({
                preference: 'clamscan'
            });
            const filePath = path.resolve(__dirname, 'no-virus.txt');
            const fileData = await readFile(filePath);
            const data = Buffer.from(fileData);
            const file = createFileFromFilePath(filePath, data);

            await expect(clamAVScanner.scan(file)).resolves.toMatchObject({
                result: MalwareScanResult.Clean
            });
        });

        it('uses temp file scanning when no daemon config is provided', async () => {
            // Without socket/port/host, clamdServiceEnabled is false
            const clamAVScanner = await ClamAVScanner.create();
            const filePath = path.resolve(__dirname, 'no-virus.txt');
            const fileData = await readFile(filePath);
            const data = Buffer.from(fileData);
            const file = createFileFromFilePath(filePath, data);

            await expect(clamAVScanner.scan(file)).resolves.toMatchObject({
                result: MalwareScanResult.Clean
            });
        });
    });
});
