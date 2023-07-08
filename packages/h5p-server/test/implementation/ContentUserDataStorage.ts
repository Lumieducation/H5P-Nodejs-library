import { IContentUserDataStorage, IFinishedUserData } from '../../src/types';

import User from '../User';

export default (getStorage: () => IContentUserDataStorage): void => {
    describe('user data', () => {
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

        it('adds user data and lets you retrieve it again', async () => {
            const storage = getStorage();
            await expect(
                storage.createOrUpdateContentUserData(dataTemplate)
            ).resolves.not.toThrow();
            await expect(
                storage.getContentUserData('1', 'dataType', '0', user.id)
            ).resolves.toMatchObject(dataTemplate);
            const res = await storage.getContentUserDataByContentIdAndUser(
                '1',
                user.id
            );
            expect(res.length).toEqual(1);
        });

        it('can differentiate between data with contextId and without when there is user data with contextId', async () => {
            const storage = getStorage();
            await expect(
                storage.createOrUpdateContentUserData(dataTemplate)
            ).resolves.not.toThrow();
            await expect(
                storage.createOrUpdateContentUserData({
                    ...dataTemplate,
                    contextId: '123'
                })
            ).resolves.not.toThrow();

            await expect(
                storage.getContentUserData('1', 'dataType', '0', user.id)
            ).resolves.toMatchObject(dataTemplate);

            await expect(
                storage.getContentUserData('1', 'dataType', '0', user.id, '123')
            ).resolves.toMatchObject({
                ...dataTemplate,
                contextId: '123'
            });
        });

        it('returns null when trying to get user data with contextId when there is user data without contextId', async () => {
            const storage = getStorage();
            await expect(
                storage.createOrUpdateContentUserData(dataTemplate)
            ).resolves.not.toThrow();

            await expect(
                storage.getContentUserData('1', 'dataType', '0', user.id, '123')
            ).resolves.toEqual(null);
        });

        it('adds data for multiple users and lets you retrieve it again', async () => {
            const storage = getStorage();
            await expect(
                storage.createOrUpdateContentUserData(dataTemplate)
            ).resolves.not.toThrow();
            await expect(
                storage.createOrUpdateContentUserData({
                    ...dataTemplate,
                    userId: '2'
                })
            ).resolves.not.toThrow();
            await expect(
                storage.createOrUpdateContentUserData({
                    ...dataTemplate,
                    userId: '3'
                })
            ).resolves.not.toThrow();

            await expect(
                storage.getContentUserData('1', 'dataType', '0', user.id)
            ).resolves.toMatchObject(dataTemplate);
            await expect(
                storage.getContentUserData('1', 'dataType', '0', '2')
            ).resolves.toMatchObject({ ...dataTemplate, userId: '2' });
            await expect(
                storage.getContentUserData('1', 'dataType', '0', '3')
            ).resolves.toMatchObject({ ...dataTemplate, userId: '3' });
        });

        it("returns null if user data doesn't exist", async () => {
            const storage = getStorage();
            await expect(
                storage.getContentUserData('1', 'dataType', '0', user.id)
            ).resolves.toEqual(null);
        });

        it("returns empty if user data doesn't exist", async () => {
            const storage = getStorage();
            const res = await storage.getContentUserDataByContentIdAndUser(
                '1',
                user.id
            );
            expect(res.length).toEqual(0);
        });

        it('updates user data', async () => {
            const storage = getStorage();
            await storage.createOrUpdateContentUserData(dataTemplate);

            const data2 = { ...dataTemplate, userState: 'state2' };

            await storage.createOrUpdateContentUserData(data2);

            await expect(
                storage.getContentUserData('1', 'dataType', '0', user.id)
            ).resolves.toMatchObject(data2);

            const allUserData = await storage.getContentUserDataByUser(user);
            expect(allUserData.length).toEqual(1);
        });

        it('user data with contextId ignores updates of regular user data', async () => {
            const storage = getStorage();
            await storage.createOrUpdateContentUserData(dataTemplate);
            await storage.createOrUpdateContentUserData({
                ...dataTemplate,
                contextId: '123'
            });

            const data2 = { ...dataTemplate, userState: 'state2' };

            await storage.createOrUpdateContentUserData(data2);

            await expect(
                storage.getContentUserData('1', 'dataType', '0', user.id, '123')
            ).resolves.toMatchObject({ ...dataTemplate, contextId: '123' });
        });

        it('user data without contextId ignores updates of user data with contextId', async () => {
            const storage = getStorage();
            await storage.createOrUpdateContentUserData(dataTemplate);
            await storage.createOrUpdateContentUserData({
                ...dataTemplate,
                contextId: '123'
            });

            const data2 = {
                ...dataTemplate,
                contextId: '123',
                userState: 'state2'
            };

            await storage.createOrUpdateContentUserData(data2);

            await expect(
                storage.getContentUserData('1', 'dataType', '0', user.id)
            ).resolves.toMatchObject(dataTemplate);
        });

        it('returns all data for a user', async () => {
            const storage = getStorage();
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

        it('returns all data for a user even if one has a contextId', async () => {
            const storage = getStorage();
            const returned1 = await storage.getContentUserDataByUser(user);
            expect(returned1.length).toEqual(0);

            const data1 = { ...dataTemplate, dataType: 'dataType1' };
            const data2 = {
                ...dataTemplate,
                dataType: 'dataType2',
                contentId: '2',
                contextId: '123'
            };
            await storage.createOrUpdateContentUserData(data1);
            await storage.createOrUpdateContentUserData(data2);

            const returned2 = await storage.getContentUserDataByUser(user);
            expect(returned2.length).toEqual(2);
        });

        it('deletes invalidated user data', async () => {
            const storage = getStorage();
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

            await storage.deleteInvalidatedContentUserData(
                dataTemplate.contentId
            );
            const notFound1 =
                await storage.getContentUserDataByContentIdAndUser(
                    dataTemplate.contentId,
                    user.id
                );
            expect(notFound1.length).toEqual(0);

            const notFound2 =
                await storage.getContentUserDataByContentIdAndUser(
                    dataTemplate.contentId,
                    '2'
                );
            expect(notFound2.length).toEqual(0);

            const found = await storage.getContentUserDataByContentIdAndUser(
                dataTemplate.contentId,
                '3'
            );
            expect(found.length).toEqual(1);
        });

        it('deletes user data by user', async () => {
            const storage = getStorage();
            await storage.createOrUpdateContentUserData({
                ...dataTemplate,
                contentId: '1'
            });
            await storage.createOrUpdateContentUserData({
                ...dataTemplate,
                contentId: '2'
            });
            await storage.createOrUpdateContentUserData({
                ...dataTemplate,
                userId: '2',
                contentId: '1'
            });

            await storage.deleteAllContentUserDataByUser(user);
            const notFound1 =
                await storage.getContentUserDataByContentIdAndUser(
                    '1',
                    user.id
                );
            expect(notFound1.length).toEqual(0);

            const notFound2 =
                await storage.getContentUserDataByContentIdAndUser(
                    '2',
                    user.id
                );
            expect(notFound2.length).toEqual(0);

            const found = await storage.getContentUserDataByContentIdAndUser(
                '1',
                '2'
            );
            expect(found.length).toEqual(1);
        });

        it('deletes user data by contentId', async () => {
            const storage = getStorage();
            await storage.createOrUpdateContentUserData({
                ...dataTemplate,
                contentId: '1'
            });
            await storage.createOrUpdateContentUserData({
                ...dataTemplate,
                contentId: '1',
                userId: '2'
            });
            await storage.createOrUpdateContentUserData({
                ...dataTemplate,
                contentId: '2'
            });

            await storage.deleteAllContentUserDataByContentId('1');
            const user2Data = await storage.getContentUserDataByUser({
                ...user,
                id: '2'
            });
            expect(user2Data.length).toEqual(0);
            const user1Data = await storage.getContentUserDataByUser(user);
            expect(user1Data.length).toEqual(1);
        });

        it('gracefully deals with deleting non-existent user data', async () => {
            const storage = getStorage();
            await expect(
                storage.deleteAllContentUserDataByContentId('0')
            ).resolves.not.toThrow();
            await expect(
                storage.deleteAllContentUserDataByUser(user)
            ).resolves.not.toThrow();
            await expect(
                storage.deleteInvalidatedContentUserData('0')
            ).resolves.not.toThrow();
        });
    });
    describe('finished data', () => {
        const user = new User();
        const dataTemplate: IFinishedUserData = {
            completionTime: 1000,
            contentId: '1',
            finishedTimestamp: 10000,
            maxScore: 10,
            score: 5,
            openedTimestamp: 5000,
            userId: user.id
        };

        it('stores finished data and lets you retrieve it again', async () => {
            const storage = getStorage();
            await storage.createOrUpdateFinishedData({
                ...dataTemplate,
                score: 10
            });
            await storage.createOrUpdateFinishedData({
                ...dataTemplate,
                userId: '2'
            });
            await storage.createOrUpdateFinishedData({
                ...dataTemplate,
                userId: '3'
            });

            const ret1 = await storage.getFinishedDataByContentId('1');
            expect(ret1.length).toEqual(3);

            const ret2 = await storage.getFinishedDataByUser(user);
            expect(ret2.length).toEqual(1);
            expect(ret2[0]).toMatchObject({
                ...dataTemplate,
                score: 10
            });
        });

        it('replaces finished data', async () => {
            const storage = getStorage();
            await storage.createOrUpdateFinishedData(dataTemplate);
            await storage.createOrUpdateFinishedData({
                ...dataTemplate,
                score: 10
            });

            const ret = await storage.getFinishedDataByContentId('1');
            expect(ret.length).toEqual(1);
            expect(ret[0].score).toEqual(10);
        });

        it('deletes finished data by content id', async () => {
            const storage = getStorage();
            await storage.createOrUpdateFinishedData({
                ...dataTemplate
            });
            await storage.createOrUpdateFinishedData({
                ...dataTemplate,

                userId: '2'
            });
            await storage.createOrUpdateFinishedData({
                ...dataTemplate,
                contentId: '2'
            });

            await storage.deleteFinishedDataByContentId('1');

            const ret = await storage.getFinishedDataByUser(user);
            expect(ret.length).toEqual(1);
            expect(ret[0]).toMatchObject({
                ...dataTemplate,
                contentId: '2'
            });
        });

        it('deletes finished data by user', async () => {
            const storage = getStorage();
            await storage.createOrUpdateFinishedData({
                ...dataTemplate
            });
            await storage.createOrUpdateFinishedData({
                ...dataTemplate,
                contentId: '2'
            });
            await storage.createOrUpdateFinishedData({
                ...dataTemplate,
                userId: '2'
            });

            await storage.deleteFinishedDataByUser(user);

            const ret1 = await storage.getFinishedDataByUser({
                ...user
            });
            expect(ret1.length).toEqual(0);

            const ret2 = await storage.getFinishedDataByUser({
                ...user,
                id: '2'
            });
            expect(ret2.length).toEqual(1);
        });

        it('gracefully deals with deleting non-existent finished data', async () => {
            const storage = getStorage();
            await expect(
                storage.deleteFinishedDataByContentId('0')
            ).resolves.not.toThrow();

            await expect(
                storage.deleteFinishedDataByUser(user)
            ).resolves.not.toThrow();
        });
    });
};
