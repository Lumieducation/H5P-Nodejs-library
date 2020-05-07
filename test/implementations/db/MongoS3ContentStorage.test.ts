import AWS from 'aws-sdk';
import mongodb, { ObjectID } from 'mongodb';
import fsExtra from 'fs-extra';
import path from 'path';
import { BufferWritableMock, BufferReadableMock } from 'stream-mock';
import promisepipe from 'promisepipe';
import shortid from 'shortid';

import MongoS3ContentStorage from '../../../src/implementation/db/MongoS3ContentStorage';
import User from '../../../examples/User';
import { IContentMetadata } from '../../../src/types';
import initS3 from '../../../src/implementation/db/initS3';
// tslint:disable-next-line: no-submodule-imports
import { PromiseResult } from 'aws-sdk/lib/request';

describe('MongoS3ContentStorage', () => {
    const stubMetadata: IContentMetadata = {
        embedTypes: ['div'],
        language: 'en',
        mainLibrary: 'H5P.Test',
        preloadedDependencies: [],
        title: 'Title'
    };
    const stubParameters = {
        foo: 'bar',
        baz: 1
    };
    const stubUser = new User();
    const stubImagePath = path.resolve(
        'test/data/sample-content/content/earth.jpg'
    );
    const stubJsonPath = path.resolve(
        'test/data/sample-content/content/content.json'
    );

    let mongo: mongodb.Db;
    let mongoClient: mongodb.MongoClient;
    let mongoCollection: mongodb.Collection<any>;
    let s3: AWS.S3;
    let bucketName: string;
    let collectionName: string;
    let counter = 0;
    let testId: string;

    async function emptyAndDeleteBucket(bucketname: string): Promise<void> {
        try {
            await s3
                .headBucket({
                    Bucket: bucketName
                })
                .promise();
        } catch {
            return;
        }
        let ret: PromiseResult<AWS.S3.ListObjectsV2Output, AWS.AWSError>;
        do {
            ret = await s3
                .listObjectsV2({
                    Bucket: ret?.IsTruncated ? undefined : bucketname,
                    ContinuationToken: ret?.NextContinuationToken
                })
                .promise();
            await s3
                .deleteObjects({
                    Bucket: bucketname,
                    Delete: {
                        Objects: ret.Contents.map((c) => {
                            return { Key: c.Key };
                        })
                    }
                })
                .promise();
        } while (ret.IsTruncated);
        await s3.deleteBucket({ Bucket: bucketname }).promise();
    }

    beforeAll(async () => {
        testId = shortid().toLowerCase();
        s3 = initS3({
            accessKeyId: 'minioaccesskey',
            secretAccessKey: 'miniosecret',
            endpoint: 'http://127.0.0.1:9000',
            s3ForcePathStyle: true,
            signatureVersion: 'v4'
        });
        mongoClient = await mongodb.connect('mongodb://127.0.0.1:27017', {
            auth: {
                user: 'root',
                password: 'h5pnodejs'
            }
        });
        mongo = mongoClient.db('h5pintegrationtest');
    });

    beforeEach(async () => {
        counter += 1;
        bucketName = `${testId}bucket${counter}`;
        await emptyAndDeleteBucket(bucketName);
        await s3
            .createBucket({
                Bucket: bucketName
            })
            .promise();
        collectionName = `${testId}collection${counter}`;
        try {
            await mongo.dropCollection(collectionName);
        } catch {
            // We do nothing, as we just want to make sure the collection doesn't
            // exist.
        }
        mongoCollection = mongo.collection(collectionName);
    });

    afterEach(async () => {
        await emptyAndDeleteBucket(bucketName);
        try {
            await mongo.dropCollection(collectionName);
        } catch {
            // If a test didn't create a collection, it can't be deleted.
        }
    });

    afterAll(async () => {
        await mongoClient.close();
    });

    it('initializes and returns empty values', async () => {
        const storage = new MongoS3ContentStorage(s3, mongoCollection, {
            s3Bucket: bucketName
        });
        await expect(storage.listContent()).resolves.toEqual([]);
        await expect(
            storage.contentExists(new ObjectID().toHexString())
        ).resolves.toEqual(false);
        await expect(
            storage.listFiles(new ObjectID().toHexString(), new User())
        ).resolves.toEqual([]);
        await expect(
            storage.fileExists(new ObjectID().toHexString(), 'test.jpg')
        ).resolves.toEqual(false);
    });

    it('stores parameters and metadata and lets you retrieve them', async () => {
        const storage = new MongoS3ContentStorage(s3, mongoCollection, {
            s3Bucket: bucketName
        });

        const contentId = await storage.addContent(
            stubMetadata,
            stubParameters,
            new User()
        );
        expect(contentId).toBeDefined();

        const retrievedMetadata = await storage.getMetadata(contentId);
        expect(retrievedMetadata).toMatchObject(stubMetadata);

        const retrievedParameters = await storage.getParameters(contentId);
        expect(retrievedParameters).toMatchObject(stubParameters);
    });

    it('deletes content objects', async () => {
        const storage = new MongoS3ContentStorage(s3, mongoCollection, {
            s3Bucket: bucketName
        });

        const contentId = await storage.addContent(
            stubMetadata,
            stubParameters,
            new User()
        );

        await expect(storage.contentExists(contentId)).resolves.toBe(true);
        await storage.deleteContent(contentId);
        await expect(storage.contentExists(contentId)).resolves.toBe(false);
    });

    it('lists added content', async () => {
        const storage = new MongoS3ContentStorage(s3, mongoCollection, {
            s3Bucket: bucketName
        });

        const contentId1 = await storage.addContent(
            stubMetadata,
            stubParameters,
            new User()
        );
        const contentId2 = await storage.addContent(
            stubMetadata,
            stubParameters,
            new User()
        );
        const contentId3 = await storage.addContent(
            stubMetadata,
            stubParameters,
            new User()
        );

        const list = await storage.listContent();
        expect(list).toMatchObject([contentId1, contentId2, contentId3]);
    });

    it('adds files and returns stream to them', async () => {
        const storage = new MongoS3ContentStorage(s3, mongoCollection, {
            s3Bucket: bucketName
        });
        const contentId = await storage.addContent(
            stubMetadata,
            stubParameters,
            stubUser
        );
        const filename = 'testfile1.jpg';
        await expect(storage.fileExists(contentId, filename)).resolves.toEqual(
            false
        );
        await storage.addFile(
            contentId,
            filename,
            fsExtra.createReadStream(stubJsonPath),
            stubUser
        );
        await expect(storage.fileExists(contentId, filename)).resolves.toEqual(
            true
        );

        const returnedStream = await storage.getFileStream(
            contentId,
            filename,
            stubUser
        );

        const mockWriteStream1 = new BufferWritableMock();
        const onFinish1 = jest.fn();
        mockWriteStream1.on('finish', onFinish1);
        await promisepipe(returnedStream, mockWriteStream1);
        expect(onFinish1).toHaveBeenCalled();
    });

    it('adds 1005 files and returns a list with all of them', async () => {
        const storage = new MongoS3ContentStorage(s3, mongoCollection, {
            s3Bucket: bucketName
        });
        const contentId = await storage.addContent(
            stubMetadata,
            stubParameters,
            stubUser
        );

        const files = [];
        for (let number = 0; number < 1005; number += 1) {
            files.push(`file${number}.json`);
        }
        // TODO: We Should add 1001 files, because this means the S3 storage system will
        // return the list in two batches. However, the mock we're using doesn't
        // work properly with continuation tokens at this time.
        for (const file of files) {
            await storage.addFile(
                contentId,
                file,
                new BufferReadableMock([0]),
                stubUser
            );
        }

        const retrievedFiles = await storage.listFiles(contentId, stubUser);
        expect(retrievedFiles.sort()).toMatchObject(files.sort());
    }, 120000);

    it('deletes added files from S3', async () => {
        const storage = new MongoS3ContentStorage(s3, mongoCollection, {
            s3Bucket: bucketName
        });
        const contentId = await storage.addContent(
            stubMetadata,
            stubParameters,
            stubUser
        );
        const filename = 'testfile1.jpg';
        expect(
            s3
                .headObject({
                    Bucket: bucketName,
                    Key: `${contentId}/${filename}`
                })
                .promise()
        ).rejects.toThrow();
        await storage.addFile(
            contentId,
            filename,
            fsExtra.createReadStream(stubImagePath),
            stubUser
        );
        expect(
            s3
                .headObject({
                    Bucket: bucketName,
                    Key: `${contentId}/${filename}`
                })
                .promise()
        ).resolves.toBeDefined();

        await storage.deleteFile(contentId, filename, stubUser);
        await expect(storage.fileExists(contentId, filename)).resolves.toEqual(
            false
        );
        expect(
            s3
                .headObject({
                    Bucket: bucketName,
                    Key: `${contentId}/${filename}`
                })
                .promise()
        ).rejects.toThrow();
    });

    it('rejects illegal characters in filenames', async () => {
        const storage = new MongoS3ContentStorage(s3, mongoCollection, {
            s3Bucket: bucketName
        });
        const contentId = await storage.addContent(
            stubMetadata,
            stubParameters,
            stubUser
        );

        const illegalCharacters = [
            '&',
            '$',
            '@',
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
            expect(
                storage.addFile(
                    contentId,
                    illegalCharacter,
                    undefined,
                    stubUser
                )
            ).rejects.toThrowError('mongo-s3-content-storage:illegal-filename');
        }
        expect(
            storage.addFile(contentId, '../../bin/bash', undefined, stubUser)
        ).rejects.toThrowError('mongo-s3-content-storage:illegal-filename');

        expect(
            storage.addFile(contentId, '/bin/bash', undefined, stubUser)
        ).rejects.toThrowError('mongo-s3-content-storage:illegal-filename');
    });
});
