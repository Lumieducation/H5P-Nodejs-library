import { Collection, Db, MongoClient, ObjectId } from 'mongodb';

import MongoContentUserDataStorage from '../src/MongoContentUserDataStorage';
import ContentUserDataStorageTests from '../../h5p-server/test/implementation/ContentUserDataStorage';
import { IContentUserDataStorage } from '@lumieducation/h5p-server';

describe('MongoContentUserDataStorage', () => {
    let mongo: Db;
    let mongoClient: MongoClient;
    let userDataCollection: Collection<any>;
    let finishedCollection: Collection<any>;
    let userDataCollectionName: string;
    let finishedCollectionName: string;
    let testId: string;
    let counter = 0;
    let storage: MongoContentUserDataStorage;
    let getStorage = (): IContentUserDataStorage => storage;

    beforeAll(async () => {
        testId = new ObjectId().toHexString();
        mongoClient = await MongoClient.connect('mongodb://localhost:27017', {
            auth: {
                username: 'root',
                password: 'h5pnodejs'
            },
            ignoreUndefined: true
        });
        mongo = mongoClient.db('h5pintegrationtest');
    });

    beforeEach(async () => {
        counter += 1;
        userDataCollectionName = `${testId}collectionuserdata${counter}`;
        finishedCollectionName = `${testId}collectionfinished${counter}`;
        try {
            await mongo.dropCollection(userDataCollectionName);
        } catch {
            // We do nothing, as we just want to make sure the collection doesn't
            // exist.
        }
        try {
            await mongo.dropCollection(finishedCollectionName);
        } catch {
            // We do nothing, as we just want to make sure the collection doesn't
            // exist.
        }
        userDataCollection = mongo.collection(userDataCollectionName);
        finishedCollection = mongo.collection(finishedCollectionName);
        storage = new MongoContentUserDataStorage(
            userDataCollection,
            finishedCollection
        );
        await storage.createIndexes();
    });

    afterEach(async () => {
        try {
            await mongo.dropCollection(userDataCollectionName);
        } catch {
            // If a test didn't create a collection, it can't be deleted.
        }
        try {
            await mongo.dropCollection(finishedCollectionName);
        } catch {
            // If a test didn't create a collection, it can't be deleted.
        }
    });

    afterAll(async () => {
        await mongoClient.close();
    });

    it('can call index creation a second time', async () => {
        await expect(storage.createIndexes()).resolves.not.toThrow();
    });

    ContentUserDataStorageTests(getStorage);
});
