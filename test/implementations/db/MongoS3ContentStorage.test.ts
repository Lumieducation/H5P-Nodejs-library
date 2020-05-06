import AWSMock from 'mock-aws-s3';
import mongodb from 'mongo-mock';
import { dir, DirectoryResult } from 'tmp-promise';
import fsExtra from 'fs-extra';
import path from 'path';
import { BufferWritableMock, BufferReadableMock } from 'stream-mock';
import promisepipe from 'promisepipe';

import MongoS3ContentStorage from '../../../src/implementation/db/MongoS3ContentStorage';
import User from '../../../examples/User';
import { ObjectID } from 'mongodb';
import { IContentMetadata } from '../../../src/types';

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

    let tempDir: DirectoryResult;
    let mongoClient;
    let mongoCollection;
    let s3: AWSMock.S3;
    let bucketName: string;
    let collectionName: string;
    let counter = 0;

    beforeAll(async () => {
        tempDir = await dir({ keep: false, unsafeCleanup: true });
        AWSMock.config.basePath = tempDir.path;

        mongodb.max_delay = 0;
        mongoClient = await mongodb.MongoClient.connect(
            'mongodb://localhost:2701/testdb'
        );
    });

    beforeEach(async () => {
        counter += 1;
        bucketName = `bucket${counter}`;
        s3 = new AWSMock.S3({
            params: { Bucket: bucketName }
        });
        collectionName = `collection${counter}`;
        mongoCollection = mongoClient.collection(collectionName);
    });

    afterAll(async () => {
        mongoClient.close();
        tempDir.cleanup();
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

    // TODO: Uncomment. It looks like the Mongo Mock doesn't delete documents
    // properly...
    /*it('deletes content objects', async () => {
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
    });*/

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

    it('adds 100 files and returns a list with all of them', async () => {
        const storage = new MongoS3ContentStorage(s3, mongoCollection, {
            s3Bucket: bucketName
        });
        const contentId = await storage.addContent(
            stubMetadata,
            stubParameters,
            stubUser
        );

        const files = [];
        for (let number = 0; number < 100; number += 1) {
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
});
