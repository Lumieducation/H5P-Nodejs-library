import { readFile, readdir } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';

import { H5PFileBuffer, MalwareScanResult } from '@lumieducation/h5p-server';

import ClamAVScanner from '../src/ClamAVScanner';

const createFileBuffer = (
    filePath: string,
    data: Buffer,
    name?: string
): H5PFileBuffer => ({
    data,
    mimetype: '',
    name: name ?? path.basename(filePath),
    size: data.length
});

describe('ClamAVScanner', () => {
    it('initializes ClamAV scanner', async () => {
        const clamAVScanner = await ClamAVScanner.create();
        expect(clamAVScanner).toBeInstanceOf(ClamAVScanner);
    });

    describe('scan files', () => {
        it('reports "Clean" for uninfected files', async () => {
            const clamAVScanner = await ClamAVScanner.create();
            const filePath = path.resolve(__dirname, 'no-virus.txt');
            await expect(clamAVScanner.scan(filePath)).resolves.toMatchObject({
                result: MalwareScanResult.Clean
            });
        });

        it('reports "MalwareFound" for infected files', async () => {
            const clamAVScanner = await ClamAVScanner.create();
            const filePath = path.resolve(__dirname, 'eicar.txt');
            await expect(clamAVScanner.scan(filePath)).resolves.toMatchObject({
                result: MalwareScanResult.MalwareFound,
                viruses: expect.stringMatching(
                    /(^Win\.Test\.EICAR_HDB-1$)|(^Eicar-Test-Signature$)/
                )
            });
        });
        it("doesn't break if it is set to non-existent file", async () => {
            const clamAVScanner = await ClamAVScanner.create();
            const filePath = path.resolve(__dirname, 'doesntexist.txt');
            await expect(clamAVScanner.scan(filePath)).resolves.toMatchObject({
                result: MalwareScanResult.NotScanned
            });
        });
    });

    describe('scan buffers using ClamAV binary', () => {
        it('reports "Clean" for uninfected buffers', async () => {
            const clamAVScanner = await ClamAVScanner.create();
            const filePath = path.resolve(__dirname, 'no-virus.txt');
            const data = await readFile(filePath);
            const file = createFileBuffer(filePath, data);
            await expect(clamAVScanner.scanBuffer(file)).resolves.toMatchObject(
                {
                    result: MalwareScanResult.Clean
                }
            );
        });
        it('reports "MalwareFound" for infected buffers', async () => {
            const clamAVScanner = await ClamAVScanner.create();
            const filePath = path.resolve(__dirname, 'eicar.txt');
            const data = await readFile(filePath);
            const file = createFileBuffer(filePath, data);
            await expect(clamAVScanner.scanBuffer(file)).resolves.toMatchObject(
                {
                    result: MalwareScanResult.MalwareFound,
                    viruses: 'Eicar-Test-Signature'
                }
            );
        });
        it("doesn't break if it is an empty buffer", async () => {
            const clamAVScanner = await ClamAVScanner.create();
            const file = createFileBuffer('empty.txt', Buffer.alloc(0));
            // An empty buffer is not infected, so it is scanned
            // successfully and reported as clean rather than failing.
            await expect(clamAVScanner.scanBuffer(file)).resolves.toMatchObject(
                {
                    result: MalwareScanResult.Clean
                }
            );
        });

        it('cleans up temporary files after scanning', async () => {
            const clamAVScanner = await ClamAVScanner.create();
            const filePath = path.resolve(__dirname, 'no-virus.txt');
            const data = await readFile(filePath);
            const file = createFileBuffer(filePath, data);

            // Get temp directories before scan
            const tmpDirPath = tmpdir();
            const beforeScan = await readdir(tmpDirPath);

            // Perform scan
            await clamAVScanner.scanBuffer(file);

            // Get temp directories after scan
            const afterScan = await readdir(tmpDirPath);

            // No new temporary files/directories should remain
            const newEntries = afterScan.filter(
                (name) => !beforeScan.includes(name)
            );
            expect(newEntries.length).toBe(0);
        });

        it('cleans up temporary files after multiple sequential scans', async () => {
            const clamAVScanner = await ClamAVScanner.create();
            const filePath = path.resolve(__dirname, 'no-virus.txt');
            const data = await readFile(filePath);

            // Get temp directories before scans
            const tmpDirPath = tmpdir();
            const beforeScan = await readdir(tmpDirPath);

            // Perform multiple scans
            for (let i = 0; i < 3; i++) {
                const file = createFileBuffer(`test-file-${i}.txt`, data);
                // eslint-disable-next-line no-await-in-loop
                await clamAVScanner.scanBuffer(file);
            }

            // Get temp directories after scans
            const afterScan = await readdir(tmpDirPath);

            // No new temporary files/directories should remain
            const newEntries = afterScan.filter(
                (name) => !beforeScan.includes(name)
            );
            expect(newEntries.length).toBe(0);
        });

        it('cleans up temporary files even when virus is found', async () => {
            const clamAVScanner = await ClamAVScanner.create();
            const filePath = path.resolve(__dirname, 'eicar.txt');
            const data = await readFile(filePath);
            const file = createFileBuffer(filePath, data);

            // Get temp directories before scan
            const tmpDirPath = tmpdir();
            const beforeScan = await readdir(tmpDirPath);

            // Perform scan (should find virus)
            const result = await clamAVScanner.scanBuffer(file);
            expect(result.result).toBe(MalwareScanResult.MalwareFound);

            // Get temp directories after scan
            const afterScan = await readdir(tmpDirPath);

            // No new temporary files/directories should remain
            const newEntries = afterScan.filter(
                (name) => !beforeScan.includes(name)
            );
            expect(newEntries.length).toBe(0);
        });

        it('sanitizes filenames with path traversal attempts', async () => {
            const clamAVScanner = await ClamAVScanner.create();
            const filePath = path.resolve(__dirname, 'no-virus.txt');
            const data = await readFile(filePath);

            // Create a file with a path traversal attempt in the name
            const file = createFileBuffer(
                filePath,
                data,
                '../../../etc/passwd'
            );

            // Should not throw and should scan successfully
            const result = await clamAVScanner.scanBuffer(file);
            expect(result.result).toBe(MalwareScanResult.Clean);
        });

        it('handles filenames with multiple path separators', async () => {
            const clamAVScanner = await ClamAVScanner.create();
            const filePath = path.resolve(__dirname, 'no-virus.txt');
            const data = await readFile(filePath);

            // Create a file with path separators in the name
            const file = createFileBuffer(
                filePath,
                data,
                'some/nested/path/file.txt'
            );

            // Should not throw and should scan successfully
            const result = await clamAVScanner.scanBuffer(file);
            expect(result.result).toBe(MalwareScanResult.Clean);
        });

        it('uses fallback filename when file.name is empty', async () => {
            const clamAVScanner = await ClamAVScanner.create();
            const filePath = path.resolve(__dirname, 'no-virus.txt');
            const data = await readFile(filePath);

            // Create a file with an empty name
            const file = createFileBuffer(filePath, data, '');

            // Should not throw and should scan successfully
            const result = await clamAVScanner.scanBuffer(file);
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
            const data = await readFile(filePath);
            const file = createFileBuffer(filePath, data);
            await expect(clamAVScanner.scanBuffer(file)).resolves.toMatchObject(
                {
                    result: MalwareScanResult.Clean
                }
            );
        });
        it('reports "MalwareFound" for infected buffers', async () => {
            const clamAVScanner = await ClamAVScanner.create({
                clamdscan: { host: clamdHost, port: clamdPort }
            });
            const filePath = path.resolve(__dirname, 'eicar.txt');
            const data = await readFile(filePath);
            const file = createFileBuffer(filePath, data);
            await expect(clamAVScanner.scanBuffer(file)).resolves.toMatchObject(
                {
                    result: MalwareScanResult.MalwareFound,
                    viruses: 'Eicar-Test-Signature'
                }
            );
        });
        it("doesn't break if it is an empty buffer", async () => {
            const clamAVScanner = await ClamAVScanner.create({
                clamdscan: { host: clamdHost, port: clamdPort }
            });
            const file = createFileBuffer('empty.txt', Buffer.alloc(0));
            // An empty buffer is not infected, so it is scanned
            // successfully and reported as clean rather than failing.
            await expect(clamAVScanner.scanBuffer(file)).resolves.toMatchObject(
                {
                    result: MalwareScanResult.Clean
                }
            );
        });
    });

    describe('clamdServiceEnabled logic', () => {
        it('uses temp file scanning when preference is clamscan', async () => {
            // When preference is 'clamscan', the resolved scanner is
            // 'clamscan', so buffer scanning uses the temp-file strategy
            const clamAVScanner = await ClamAVScanner.create({
                preference: 'clamscan'
            });
            const filePath = path.resolve(__dirname, 'no-virus.txt');
            const data = await readFile(filePath);
            const file = createFileBuffer(filePath, data);

            await expect(clamAVScanner.scanBuffer(file)).resolves.toMatchObject(
                {
                    result: MalwareScanResult.Clean
                }
            );
        });

        it('uses temp file scanning when no daemon config is provided', async () => {
            // Without socket/port/host, the resolved scanner falls back to
            // the clamscan binary
            const clamAVScanner = await ClamAVScanner.create();
            const filePath = path.resolve(__dirname, 'no-virus.txt');
            const data = await readFile(filePath);
            const file = createFileBuffer(filePath, data);

            await expect(clamAVScanner.scanBuffer(file)).resolves.toMatchObject(
                {
                    result: MalwareScanResult.Clean
                }
            );
        });

        describeClamD('when a clamd daemon is reachable', () => {
            it('uses stream scanning even when preference is left at its default', async () => {
                // clamscan's own default preference is 'clamdscan', and
                // ClamAVScanner now reads back the resolved scanner
                // instead of re-deriving it from the input options, so
                // this works without explicitly setting `preference`.
                const clamAVScanner = await ClamAVScanner.create({
                    clamdscan: { host: clamdHost, port: clamdPort }
                });
                const filePath = path.resolve(__dirname, 'no-virus.txt');
                const data = await readFile(filePath);
                const file = createFileBuffer(filePath, data);

                await expect(
                    clamAVScanner.scanBuffer(file)
                ).resolves.toMatchObject({
                    result: MalwareScanResult.Clean
                });
            });
        });
    });

    describe('scan with string path input', () => {
        it('reports "Clean" for uninfected files when passed as string path', async () => {
            const clamAVScanner = await ClamAVScanner.create();
            const filePath = path.resolve(__dirname, 'no-virus.txt');

            await expect(clamAVScanner.scan(filePath)).resolves.toMatchObject({
                result: MalwareScanResult.Clean
            });
        });

        it('reports "MalwareFound" for infected files when passed as string path', async () => {
            const clamAVScanner = await ClamAVScanner.create();
            const filePath = path.resolve(__dirname, 'eicar.txt');

            await expect(clamAVScanner.scan(filePath)).resolves.toMatchObject({
                result: MalwareScanResult.MalwareFound,
                viruses: expect.stringMatching(
                    /(^Win\.Test\.EICAR_HDB-1$)|(^Eicar-Test-Signature$)/
                )
            });
        });

        it('reports "NotScanned" for non-existent files when passed as string path', async () => {
            const clamAVScanner = await ClamAVScanner.create();
            const filePath = path.resolve(__dirname, 'doesntexist.txt');

            await expect(clamAVScanner.scan(filePath)).resolves.toMatchObject({
                result: MalwareScanResult.NotScanned
            });
        });

        it('normalizes string path to extract filename correctly', async () => {
            const clamAVScanner = await ClamAVScanner.create();
            // Use an absolute path with multiple directory components
            const filePath = path.resolve(__dirname, 'no-virus.txt');

            // Should work correctly - the normalization extracts basename for logging
            await expect(clamAVScanner.scan(filePath)).resolves.toMatchObject({
                result: MalwareScanResult.Clean
            });
        });
    });
});
