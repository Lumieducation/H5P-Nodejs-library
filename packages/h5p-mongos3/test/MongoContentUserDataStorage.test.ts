import { Collection, Db, MongoClient, ObjectId } from 'mongodb';
import MongoContentUserDataStorage from '../src/MongoContentUserDataStorage';
import User from './User';

describe('MongoContentUserDataStorage', () => {
    const user = new User();
    const dataTemplate = {
        dataType: 'dataType',
        invalidate: true,
        preload: true,
        subContentId: '0',
        userState: 'state',
        contentId: '1',
        userId: user.id
    };

    let mongo: Db;
    let mongoClient: MongoClient;
    let userDataCollection: Collection<any>;
    let finishedCollection: Collection<any>;
    let userDataCollectionName: string;
    let finishedCollectionName: string;
    let testId: string;
    let counter = 0;
    let storage: MongoContentUserDataStorage;

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

    it('creates indexes', async () => {
        await expect(storage.createIndexes()).resolves.not.toThrow();
    });

    it('adds user data', async () => {
        await expect(
            storage.createOrUpdateContentUserData(dataTemplate)
        ).resolves.not.toThrow();
        await expect(
            storage.getContentUserData('1', 'dataType', '0', user)
        ).resolves.toMatchObject(dataTemplate);
    });

    it('updates user data', async () => {
        await storage.createOrUpdateContentUserData(dataTemplate);

        const data2 = { ...dataTemplate, userState: 'state2' };

        await storage.createOrUpdateContentUserData(data2);

        await expect(
            storage.getContentUserData('1', 'dataType', '0', user)
        ).resolves.toMatchObject(data2);

        expect(await userDataCollection.countDocuments()).toEqual(1);
    });

    it('returns all data for a user', async () => {
        const returned1 = await storage.getContentUserDataByUser(user);
        expect(returned1.length).toEqual(0);

        const data1 = { ...dataTemplate, dataType: 'dataType1' };
        const data2 = {
            ...dataTemplate,
            dataType: 'dataType2',
            contentId: '2'
        };
        await storage.createOrUpdateContentUserData(data1);
        await storage.createOrUpdateContentUserData(data2);

        const returned2 = await storage.getContentUserDataByUser(user);
        expect(returned2.length).toEqual(2);
    });

    it('deletes invalidated user data', async () => {
        await storage.createOrUpdateContentUserData({
            ...dataTemplate,
            userId: '1',
            invalidate: true
        });
        await storage.createOrUpdateContentUserData({
            ...dataTemplate,
            userId: '2',
            invalidate: true
        });
        await storage.createOrUpdateContentUserData({
            ...dataTemplate,
            userId: '3',
            invalidate: false
        });

        await storage.deleteInvalidatedContentUserData(dataTemplate.contentId);
        const notFound1 = await storage.getContentUserDataByContentIdAndUser(
            dataTemplate.contentId,
            user
        );
        expect(notFound1.length).toEqual(0);

        const notFound2 = await storage.getContentUserDataByContentIdAndUser(
            dataTemplate.contentId,
            { ...user, id: '2' }
        );
        expect(notFound2.length).toEqual(0);

        const found = await storage.getContentUserDataByContentIdAndUser(
            dataTemplate.contentId,
            { ...user, id: '3' }
        );
        expect(found.length).toEqual(1);
    });
});
