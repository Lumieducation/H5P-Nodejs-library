// Note: This test will be ignored by normal test runners. You must execute
// npm run test:db to run it!
// It requires a running MongoDB instance!

import mongodb, { ObjectID } from 'mongodb';
import fsExtra from 'fs-extra';
import path from 'path';
import { BufferWritableMock, BufferReadableMock } from 'stream-mock';
import promisepipe from 'promisepipe';
import { IContentMetadata, Permission } from '@lumieducation/h5p-server';

import MongoGridFSContentStorage from '../src/MongoGridFSContentStorage';
import User from './User';

describe('MongoGridFSContentStorage', () => {
    const stubMetadata: IContentMetadata = {
        embedTypes: ['div'],
        language: 'en',
        mainLibrary: 'H5P.Test',
        preloadedDependencies: [
            {
                machineName: 'H5P.Test',
                majorVersion: 1,
                minorVersion: 0
            }
        ],
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
    let mongoBucket: mongodb.GridFSBucket;
    let bucketName: string;
    let collectionName: string;
    let counter = 0;
    let testId: string;
    let storage: MongoGridFSContentStorage;

    beforeAll(async () => {
        testId = new ObjectID().toHexString();

        mongoClient = await mongodb.connect('mongodb://localhost:27017', {
            auth: {
                user: 'root',
                password: 'h5pnodejs'
            },
            ignoreUndefined: true,
            useUnifiedTopology: true
        });
        mongo = mongoClient.db('h5pintegrationtest');
        mongoBucket = new mongodb.GridFSBucket(mongo);
    });

    beforeEach(async () => {
        counter += 1;
        bucketName = `${testId}bucket${counter}`;
        collectionName = `${testId}collection${counter}`;
        try {
            await mongo.dropCollection(collectionName);
            await mongo.collection('fs.files').deleteMany({});
            await mongo.collection('fs.chunks').deleteMany({});
        } catch {
            // We do nothing, as we just want to make sure the collection doesn't
            // exist.
        }
        mongoCollection = mongo.collection(collectionName);
        storage = new MongoGridFSContentStorage(
            mongoBucket,
            mongoCollection,
            {}
        );
    });

    afterEach(async () => {
        try {
            await mongo.dropCollection(collectionName);
            await mongo.collection('fs.files').deleteMany({});
            await mongo.collection('fs.chunks').deleteMany({});
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
        ).rejects.toThrowError(
            'mongo-gridfs-content-storage:content-not-found'
        );
        await expect(
            storage.getMetadata(new ObjectID().toHexString())
        ).rejects.toThrowError(
            'mongo-gridfs-content-storage:content-not-found'
        );
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

    it('adds files, returns its size and a stream to them', async () => {
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

        const fsStats = await fsExtra.stat(stubJsonPath);
        const s3Stats = await storage.getFileStats(
            contentId,
            filename,
            stubUser
        );
        expect(s3Stats.size).toEqual(fsStats.size);

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
    it('deletes added files from GridFS', async () => {
        const contentId = await storage.addContent(
            stubMetadata,
            stubParameters,
            stubUser
        );
        const filename = 'testfile1.jpg';
        await expect(
            (
                await mongoBucket
                    .find({
                        filename: `${contentId}/${filename}`
                    })
                    .toArray()
            ).length
        ).toBe(0);

        await storage.addFile(
            contentId,
            filename,
            fsExtra.createReadStream(stubImagePath),
            stubUser
        );
        await expect(
            (
                await mongoBucket
                    .find({ filename: `${contentId}/${filename}` })
                    .toArray()
            ).length
        ).toBeTruthy();

        await storage.deleteFile(contentId, filename, stubUser);
        await expect(storage.fileExists(contentId, filename)).resolves.toEqual(
            false
        );
        await expect(
            (
                await mongoBucket
                    .find({ filename: `${contentId}/${filename}` })
                    .toArray()
            ).length
        ).toBe(0);
    });

    it('deletes added files when the content object is deleted', async () => {
        const contentId = await storage.addContent(
            stubMetadata,
            stubParameters,
            stubUser
        );
        const filename = 'testfile1.jpg';
        await expect(
            (
                await mongoBucket
                    .find({ filename: `${contentId}/${filename}` })
                    .toArray()
            ).length
        ).toBe(0);
        await storage.addFile(
            contentId,
            filename,
            fsExtra.createReadStream(stubImagePath),
            stubUser
        );
        await expect(
            (
                await mongoBucket
                    .find({ filename: `${contentId}/${filename}` })
                    .toArray()
            ).length
        ).toBeTruthy();

        await storage.deleteContent(contentId);
        await expect(
            (
                await mongoBucket
                    .find({ filename: `${contentId}/${filename}` })
                    .toArray()
            ).length
        ).toBe(0);
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
            await expect(
                storage.addFile(
                    contentId,
                    illegalCharacter,
                    undefined,
                    stubUser
                )
            ).rejects.toThrowError('illegal-filename');
        }
        await expect(
            storage.addFile(contentId, '../../bin/bash', undefined, stubUser)
        ).rejects.toThrowError('illegal-filename');

        await expect(
            storage.addFile(contentId, '/bin/bash', undefined, stubUser)
        ).rejects.toThrowError('illegal-filename');
    });

    it('rejects write operations for unprivileged users', async () => {
        storage = new MongoGridFSContentStorage(mongoBucket, mongoCollection, {
            getPermissions: async () => [Permission.View]
        });
        await expect(
            storage.addContent(stubMetadata, stubParameters, new User())
        ).rejects.toThrowError(
            'mongo-gridfs-content-storage:missing-write-permission'
        );
    });

    describe('getUsage', () => {
        it(`doesn't count main libraries as dependencies`, async () => {
            await storage.addContent(stubMetadata, stubParameters, new User());
            await storage.addContent(stubMetadata, stubParameters, new User());

            const { asDependency, asMainLibrary } = await storage.getUsage({
                machineName: 'H5P.Test',
                majorVersion: 1,
                minorVersion: 0
            });

            expect(asMainLibrary).toEqual(2);
            expect(asDependency).toEqual(0);
        });

        it(`counts dependent libraries`, async () => {
            await storage.addContent(
                {
                    ...stubMetadata,
                    mainLibrary: 'H5P.Test2',
                    preloadedDependencies: [
                        {
                            machineName: 'H5P.Test',
                            majorVersion: 1,
                            minorVersion: 0
                        },
                        {
                            machineName: 'H5P.Test2',
                            majorVersion: 1,
                            minorVersion: 0
                        }
                    ]
                },
                stubParameters,
                new User()
            );
            await storage.addContent(stubMetadata, stubParameters, new User());
            const { asDependency, asMainLibrary } = await storage.getUsage({
                machineName: 'H5P.Test',
                majorVersion: 1,
                minorVersion: 0
            });
            expect(asMainLibrary).toEqual(1);
            expect(asDependency).toEqual(1);
            const {
                asDependency: asDependency2,
                asMainLibrary: asMainLibrary2
            } = await storage.getUsage({
                machineName: 'H5P.Test2',
                majorVersion: 1,
                minorVersion: 0
            });

            expect(asMainLibrary2).toEqual(1);
            expect(asDependency2).toEqual(0);
        });
    });
});
