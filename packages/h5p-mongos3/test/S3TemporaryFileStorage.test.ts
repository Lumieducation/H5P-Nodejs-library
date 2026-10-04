// Note: This test will be ignored by normal test runners. You must execute
// npm run test:h5p-mongos3 to run it!
// It requires a running S3 instance!

import { S3 } from '@aws-sdk/client-s3';
import { ObjectId } from 'mongodb';
import path from 'path';
import { BufferWritableMock } from 'stream-mock';
import promisepipe from 'promisepipe';
import { createReadStream } from 'fs';
import { readFile, stat } from 'fs/promises';
import { buffer } from 'stream/consumers';

import User from './User';
import initS3 from '../src/initS3';
import { emptyAndDeleteBucket } from './s3-utils';
import S3TemporaryFileStorage from '../src/S3TemporaryFileStorage';

describe('S3TemporaryFileStorage', () => {
    const stubUser = new User();
    const stubImagePath = path.resolve(
        'test/data/sample-content/content/earth.jpg'
    );
    let s3: S3;
    let bucketName: string;
    let counter = 0;
    let testId: string;
    let storage: S3TemporaryFileStorage;

    beforeAll(async () => {
        testId = new ObjectId().toHexString();
        s3 = initS3({
            credentials: {
                accessKeyId: 'minioaccesskey',
                secretAccessKey: 'miniosecret'
            },
            endpoint: 'http://localhost:9000',
            region: 'us-east-1',
            forcePathStyle: true
        });
    });

    beforeEach(async () => {
        counter += 1;
        bucketName = `${testId}bucket${counter}`;
        await emptyAndDeleteBucket(s3, bucketName);
        await s3.createBucket({
            Bucket: bucketName
        });
        storage = new S3TemporaryFileStorage(s3, {
            s3Bucket: bucketName
        });
    });

    afterEach(async () => {
        await emptyAndDeleteBucket(s3, bucketName);
    });

    it('adds files and returns stats and stream to them', async () => {
        const filename = 'testfile1.jpg';
        await expect(storage.fileExists(filename, stubUser)).resolves.toEqual(
            false
        );
        await storage.saveFile(
            filename,
            createReadStream(stubImagePath),
            stubUser,
            new Date()
        );
        await expect(storage.fileExists(filename, stubUser)).resolves.toEqual(
            true
        );

        const fsStats = await stat(stubImagePath);
        const s3Stats = await storage.getFileStats(filename, stubUser);
        expect(s3Stats.size).toEqual(fsStats.size);

        const returnedStream = await storage.getFileStream(filename, stubUser);

        const mockWriteStream1 = new BufferWritableMock();
        const onFinish1 = vi.fn();
        mockWriteStream1.on('finish', onFinish1);
        await promisepipe(returnedStream, mockWriteStream1);
        expect(onFinish1).toHaveBeenCalled();
    });

    it('returns the requested byte ranges of a file', async () => {
        const filename = 'testfile1.jpg';
        await storage.saveFile(
            filename,
            createReadStream(stubImagePath),
            stubUser,
            new Date()
        );
        const original = await readFile(stubImagePath);

        // a range starting at byte 0 must not be mistaken for "no range"
        const first = await buffer(
            await storage.getFileStream(filename, stubUser, 0, 9)
        );
        expect(first.equals(original.subarray(0, 10))).toBe(true);

        const middle = await buffer(
            await storage.getFileStream(filename, stubUser, 100, 199)
        );
        expect(middle.equals(original.subarray(100, 200))).toBe(true);

        const last = await buffer(
            await storage.getFileStream(
                filename,
                stubUser,
                original.length - 10,
                original.length - 1
            )
        );
        expect(last.equals(original.subarray(original.length - 10))).toBe(true);

        const whole = await buffer(
            await storage.getFileStream(filename, stubUser)
        );
        expect(whole.equals(original)).toBe(true);
    });

    it('lets the caller destroy a stream before it was fully read', async () => {
        const filename = 'testfile1.jpg';
        await storage.saveFile(
            filename,
            createReadStream(stubImagePath),
            stubUser,
            new Date()
        );
        const stream = await storage.getFileStream(filename, stubUser, 0, 99);
        const closed = new Promise<void>((resolve) => {
            stream.on('close', () => resolve());
        });
        stream.destroy();
        await closed;
        expect(stream.destroyed).toBe(true);

        // the storage must remain usable after an aborted read
        const next = await buffer(
            await storage.getFileStream(filename, stubUser, 0, 9)
        );
        expect(next.length).toBe(10);
    });

    // TODO: This test is a bit fragile (sometimes it fails, sometimes it doesn't)
    // We need to look into this.
    it('deletes added files from S3', async () => {
        const filename = 'testfile1.jpg';
        await expect(
            s3.headObject({
                Bucket: bucketName,
                Key: filename
            })
        ).rejects.toThrow();

        await storage.saveFile(
            filename,
            createReadStream(stubImagePath),
            stubUser,
            new Date()
        );

        await expect(
            s3.headObject({
                Bucket: bucketName,
                Key: filename
            })
        ).resolves.toBeDefined();

        await storage.deleteFile(filename, stubUser.id);
        await expect(storage.fileExists(filename, stubUser)).resolves.toEqual(
            false
        );
        await expect(
            s3.headObject({
                Bucket: bucketName,
                Key: filename
            })
        ).rejects.toThrow();
    });

    it('rejects illegal characters in filenames', async () => {
        const illegalCharacters = [
            '&',
            '$',
            '=',
            ';',
            ':',
            '+',
            ' ',
            ',',
            '?',
            '\\',
            '{',
            '^',
            '}',
            '%',
            '`',
            ']',
            "'",
            '"',
            '>',
            '[',
            '~',
            '<',
            '#',
            '|'
        ];
        for (const illegalCharacter of illegalCharacters) {
            await expect(
                storage.saveFile(
                    illegalCharacter,
                    undefined,
                    stubUser,
                    new Date()
                )
            ).rejects.toThrow('illegal-filename');
        }
        await expect(
            storage.saveFile('../../bin/bash', undefined, stubUser, new Date())
        ).rejects.toThrow('illegal-filename');

        await expect(
            storage.saveFile('/bin/bash', undefined, stubUser, new Date())
        ).rejects.toThrow('illegal-filename');
    });
});
