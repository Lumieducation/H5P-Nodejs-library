// Note: This test will be ignored by normal test runners. You must execute
// npm run test:db to run it!
// It requires a running S3 instance!

import AWS from 'aws-sdk';
import { ObjectId } from 'mongodb';
import fsExtra from 'fs-extra';
import path from 'path';
import { BufferWritableMock } from 'stream-mock';
import promisepipe from 'promisepipe';

import User from './User';
import initS3 from '../src/initS3';
import { emptyAndDeleteBucket } from './s3-utils';
import S3TemporaryFileStorage from '../src/S3TemporaryFileStorage';

describe('S3TemporaryFileStorage', () => {
    const stubUser = new User();
    const stubImagePath = path.resolve(
        'test/data/sample-content/content/earth.jpg'
    );
    let s3: AWS.S3;
    let bucketName: string;
    let counter = 0;
    let testId: string;
    let storage: S3TemporaryFileStorage;

    beforeAll(async () => {
        testId = new ObjectId().toHexString();
        s3 = initS3({
            accessKeyId: 'minioaccesskey',
            secretAccessKey: 'miniosecret',
            endpoint: 'http://localhost:9000',
            s3ForcePathStyle: true,
            signatureVersion: 'v4',
            correctClockSkew: true
        });
    });

    beforeEach(async () => {
        counter += 1;
        bucketName = `${testId}bucket${counter}`;
        await emptyAndDeleteBucket(s3, bucketName);
        await s3
            .createBucket({
                Bucket: bucketName
            })
            .promise();
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
            fsExtra.createReadStream(stubImagePath),
            stubUser,
            new Date()
        );
        await expect(storage.fileExists(filename, stubUser)).resolves.toEqual(
            true
        );

        const fsStats = await fsExtra.stat(stubImagePath);
        const s3Stats = await storage.getFileStats(filename, stubUser);
        expect(s3Stats.size).toEqual(fsStats.size);

        const returnedStream = await storage.getFileStream(filename, stubUser);

        const mockWriteStream1 = new BufferWritableMock();
        const onFinish1 = jest.fn();
        mockWriteStream1.on('finish', onFinish1);
        await promisepipe(returnedStream, mockWriteStream1);
        expect(onFinish1).toHaveBeenCalled();
    });

    // TODO: This test is a bit fragile (sometimes it fails, sometimes it doesn't)
    // We need to look into this.
    it('deletes added files from S3', async () => {
        const filename = 'testfile1.jpg';
        await expect(
            s3
                .headObject({
                    Bucket: bucketName,
                    Key: filename
                })
                .promise()
        ).rejects.toThrow();

        await storage.saveFile(
            filename,
            fsExtra.createReadStream(stubImagePath),
            stubUser,
            new Date()
        );

        await expect(
            s3
                .headObject({
                    Bucket: bucketName,
                    Key: filename
                })
                .promise()
        ).resolves.toBeDefined();

        await storage.deleteFile(filename, stubUser.id);
        await expect(storage.fileExists(filename, stubUser)).resolves.toEqual(
            false
        );
        await expect(
            s3
                .headObject({
                    Bucket: bucketName,
                    Key: filename
                })
                .promise()
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
            ).rejects.toThrowError('illegal-filename');
        }
        await expect(
            storage.saveFile('../../bin/bash', undefined, stubUser, new Date())
        ).rejects.toThrowError('illegal-filename');

        await expect(
            storage.saveFile('/bin/bash', undefined, stubUser, new Date())
        ).rejects.toThrowError('illegal-filename');
    });
});
