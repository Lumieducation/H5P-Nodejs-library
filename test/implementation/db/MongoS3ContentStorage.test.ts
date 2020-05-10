// Note: This test will be ignored by normal test runners. You must execute
// npm run test:db to run it!
// It requires a running MongoDB and S3 instance!

import AWS from 'aws-sdk';
import mongodb, { ObjectID } from 'mongodb';
import fsExtra from 'fs-extra';
import path from 'path';
import { BufferWritableMock, BufferReadableMock } from 'stream-mock';
import promisepipe from 'promisepipe';

import MongoS3ContentStorage from '../../../src/implementation/db/MongoS3ContentStorage';
import User from '../../../examples/User';
import { IContentMetadata, Permission } from '../../../src/types';
import initS3 from '../../../src/implementation/db/initS3';
import { emptyAndDeleteBucket } from './s3-utils';

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
    let storage: MongoS3ContentStorage;

    beforeAll(async () => {
        testId = new ObjectID().toHexString();
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
        await emptyAndDeleteBucket(s3, bucketName);
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
        storage = new MongoS3ContentStorage(s3, mongoCollection, {
            s3Bucket: bucketName
        });
    });

    afterEach(async () => {
        await emptyAndDeleteBucket(s3, bucketName);
        try {
            await mongo.dropCollection(collectionName);
        } catch {
            // If a test didn't create a collection, it can't be deleted.
        }
    });

    afterAll(async () => {
        await mongoClient.close();
    });

    it('initializes and returns empty values or throws exceptions', async () => {
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
        await expect(
            storage.getParameters(new ObjectID().toHexString())
        ).rejects.toThrowError('mongo-s3-content-storage:content-not-found');
        await expect(
            storage.getMetadata(new ObjectID().toHexString())
        ).rejects.toThrowError('mongo-s3-content-storage:content-not-found');
    });

    it('stores parameters and metadata and lets you retrieve them', async () => {
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

    it('updates content objects', async () => {
        const contentId = await storage.addContent(
            stubMetadata,
            stubParameters,
            stubUser
        );
        const newMetadata = { ...stubMetadata, author: 'lumi' };
        const newParameters = { ...stubParameters, newProperty: true };

        const contentId2 = await storage.addContent(
            newMetadata,
            newParameters,
            stubUser,
            contentId
        );
        expect(contentId).toEqual(contentId2);

        const retrievedMetadata = await storage.getMetadata(contentId);
        expect(retrievedMetadata).toMatchObject(newMetadata);

        const retrievedParameters = await storage.getParameters(contentId);
        expect(retrievedParameters).toMatchObject(newParameters);
    });

    it('deletes content objects', async () => {
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

    // This test is sometimes a bit fragile (s.t. it works, s.t. it doesn't).
    // We need to look into this.
    it('deletes added files from S3', async () => {
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

    it('deletes added files when the content object is deleted', async () => {
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

        await storage.deleteContent(contentId);
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
            ).rejects.toThrowError('illegal-filename');
        }
        expect(
            storage.addFile(contentId, '../../bin/bash', undefined, stubUser)
        ).rejects.toThrowError('illegal-filename');

        expect(
            storage.addFile(contentId, '/bin/bash', undefined, stubUser)
        ).rejects.toThrowError('illegal-filename');
    });

    it('rejects write operations for unprivileged users', async () => {
        storage = new MongoS3ContentStorage(s3, mongoCollection, {
            s3Bucket: bucketName,
            getPermissions: async () => {
                return [Permission.View];
            }
        });
        await expect(
            storage.addContent(stubMetadata, stubParameters, new User())
        ).rejects.toThrowError(
            'mongo-s3-content-storage:missing-write-permission'
        );
    });
});
