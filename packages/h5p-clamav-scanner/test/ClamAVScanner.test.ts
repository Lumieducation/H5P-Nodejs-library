import { readFile } from 'fs/promises';
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
    });

    // TODO: These tests require a running ClamAV daemon on localhost:3310
    describe('scan buffers using ClamAV daemon', () => {
        it('reports "Clean" for uninfected buffers', async () => {
            const clamAVScanner = await ClamAVScanner.create({
                clamdscan: { host: 'localhost', port: 3310 }
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
                clamdscan: { host: 'localhost', port: 3310 }
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
                clamdscan: { host: 'localhost', port: 3310 }
            });
            const filePath = path.resolve(__dirname, 'doesntexist.txt');
            const file = createFileFromFilePath(filePath);
            file.tempFilePath = undefined;
            await expect(clamAVScanner.scan(file)).resolves.toMatchObject({
                result: MalwareScanResult.NotScanned
            });
        });
    });
});
