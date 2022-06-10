import ContentUserDataManager from '../src/ContentUserDataManager';

import MockContentUserDataStorage from './__mocks__/ContentUserDataStorage';

import User from './User';

describe('ContentUserDataManager', () => {
    describe('deleteAllContentUserDataByUser', () => {
        it('returns undefined if contentUserDataStorage is undefined', async () => {
            const contentUserDataManager = new ContentUserDataManager(
                undefined
            );

            expect(
                await contentUserDataManager.deleteAllContentUserDataByUser(
                    new User()
                )
            ).toBeUndefined();
        });

        it('calls the deleteAllContentUserDataByUser method of the contentUserDateStorage', async () => {
            const mockContentUserDataStorage = MockContentUserDataStorage();

            const contentUserDataManager = new ContentUserDataManager(
                mockContentUserDataStorage
            );
            const user = new User();

            await contentUserDataManager.deleteAllContentUserDataByUser(user);

            expect(
                mockContentUserDataStorage.deleteAllContentUserDataByUser
            ).toHaveBeenCalledWith(user);
        });
    });

    describe('deleteInvalidatedContentUserData', () => {
        it('returns undefined if contentUserDataStorage is undefined', async () => {
            const contentUserDataManager = new ContentUserDataManager(
                undefined
            );

            expect(
                await contentUserDataManager.deleteInvalidatedContentUserDataByContentId(
                    'contentId'
                )
            ).toBeUndefined();
        });

        it('calls the deleteInvalidatedContentUserData method of the contentUserDateStorage', async () => {
            const mockContentUserDataStorage = MockContentUserDataStorage();

            const contentUserDataManager = new ContentUserDataManager(
                mockContentUserDataStorage
            );
            const contentId = 'contentId';

            await contentUserDataManager.deleteInvalidatedContentUserDataByContentId(
                contentId
            );

            expect(
                mockContentUserDataStorage.deleteInvalidatedContentUserData
            ).toHaveBeenCalledWith(contentId);
        });
    });

    describe('setFinished', () => {
        it('returns undefined if contentUserDataStorage is undefined', async () => {
            const contentUserDataManager = new ContentUserDataManager(
                undefined
            );

            const contentId = 'contentId';
            const score = 1;
            const maxScore = 10;
            const opened = 1291348;
            const finished = 239882384;
            const time = 123;

            expect(
                await contentUserDataManager.setFinished(
                    contentId,
                    score,
                    maxScore,
                    opened,
                    finished,
                    time,
                    new User()
                )
            ).toBeUndefined();
        });

        it('calls the saveSetFinishedDataForUser method of the contentUserDateStorage', async () => {
            const mockContentUserDataStorage = MockContentUserDataStorage();

            const contentUserDataManager = new ContentUserDataManager(
                mockContentUserDataStorage
            );

            const contentId = 'contentId';
            const score = 1;
            const maxScore = 10;
            const opened = 1291348;
            const finished = 239882384;
            const time = 123;
            const user = new User();
            await contentUserDataManager.setFinished(
                contentId,
                score,
                maxScore,
                opened,
                finished,
                time,
                user
            );

            expect(
                mockContentUserDataStorage.createOrUpdateFinishedData
            ).toHaveBeenCalledWith({
                contentId,
                score,
                maxScore,
                openedTimestamp: opened,
                finishedTimestamp: finished,
                completionTime: time,
                userId: user.id
            });
        });
    });

    describe('deleteAllContentUserDataByContentId', () => {
        it('returns undefined if contentUserDataStorage is undefined', async () => {
            const contentUserDataManager = new ContentUserDataManager(
                undefined
            );

            expect(
                await contentUserDataManager.deleteAllContentUserDataByContentId(
                    'contentId'
                )
            ).toBeUndefined();
        });

        it('calls the deleteAllContentUserDataByContentId method of the contentUserDateStorage', async () => {
            const mockContentUserDataStorage = MockContentUserDataStorage();

            const contentUserDataManager = new ContentUserDataManager(
                mockContentUserDataStorage
            );
            const contentId = 'contentId';

            await contentUserDataManager.deleteAllContentUserDataByContentId(
                contentId
            );

            expect(
                mockContentUserDataStorage.deleteAllContentUserDataByContentId
            ).toHaveBeenCalledWith(contentId);
        });
    });

    describe('getContentUserData', () => {
        it('returns undefined if contentUserDataStorage is undefined', async () => {
            const contentUserDataManager = new ContentUserDataManager(
                undefined
            );

            expect(
                await contentUserDataManager.getContentUserData(
                    'contentId',
                    'state',
                    '0',
                    new User()
                )
            ).toBeUndefined();
        });

        it('calls the getContentUserData method of the contentUserDateStorage with the correct arguments', async () => {
            const mockContentUserDataStorage = MockContentUserDataStorage();

            const contentUserDataManager = new ContentUserDataManager(
                mockContentUserDataStorage
            );
            const contentId = 'contentId';
            const dataType = 'string';
            const subContentId = '0';
            const user = new User();

            await contentUserDataManager.getContentUserData(
                contentId,
                dataType,
                subContentId,
                user
            );

            expect(
                mockContentUserDataStorage.getContentUserData
            ).toHaveBeenCalledWith(contentId, dataType, subContentId, user);
        });
    });

    describe('createOrUpdateContentUserData', () => {
        it('returns undefined if contentUserDataStorage is undefined', async () => {
            const contentUserDataManager = new ContentUserDataManager(
                undefined
            );

            expect(
                await contentUserDataManager.createOrUpdateContentUserData(
                    'contentId',
                    'state',
                    '0',
                    'data',
                    false,
                    false,
                    new User()
                )
            ).toBeUndefined();
        });

        it('throws an error if invalid arguments are passed', async () => {
            const contentUserDataManager = new ContentUserDataManager(
                undefined
            );

            await expect(
                contentUserDataManager.createOrUpdateContentUserData(
                    'contentId',
                    'state',
                    '0',
                    'data',
                    0 as any,
                    false,
                    new User()
                )
            ).rejects.toEqual(
                new Error(
                    "createOrUpdateContentUserData received invalid arguments: invalidate or preload weren't boolean"
                )
            );
        });

        it('calls the saveontentUserData method of the contentUserDateStorage with the correct arguments', async () => {
            const mockContentUserDataStorage = MockContentUserDataStorage();

            const contentUserDataManager = new ContentUserDataManager(
                mockContentUserDataStorage
            );
            const contentId = 'contentId';
            const dataType = 'state';
            const subContentId = '0';
            const userState = '[exampleUserState]';
            const user = new User();

            await contentUserDataManager.createOrUpdateContentUserData(
                contentId,
                dataType,
                subContentId,
                userState,
                false,
                false,
                user
            );

            expect(
                mockContentUserDataStorage.createOrUpdateContentUserData
            ).toHaveBeenCalledWith({
                contentId,
                dataType,
                subContentId,
                userState,
                invalidate: false,
                preload: false,
                userId: user.id
            });
        });
    });

    describe('generateContentUserDataIntegration', () => {
        it('returns undefined if contentUserDataStorage is undefined', async () => {
            const contentUserDataManager = new ContentUserDataManager(
                undefined
            );

            expect(
                await contentUserDataManager.generateContentUserDataIntegration(
                    'contentId',
                    new User()
                )
            ).toBeUndefined();
        });

        it('calls the getContentUserDataByContentIdAndUser method of the contentUserDateStorage with the correct arguments', async () => {
            const mockContentUserDataStorage = MockContentUserDataStorage();

            const contentUserDataManager = new ContentUserDataManager(
                mockContentUserDataStorage
            );
            const contentId = 'contentId';
            const user = new User();

            await contentUserDataManager.generateContentUserDataIntegration(
                contentId,
                user
            );

            expect(
                mockContentUserDataStorage.getContentUserDataByContentIdAndUser
            ).toHaveBeenCalledWith(contentId, user);
        });

        it('generates the contentUserDataIntegration as an array in the correct order', async () => {
            const mockContentUserDataStorage = MockContentUserDataStorage();

            const contentUserDataManager = new ContentUserDataManager(
                mockContentUserDataStorage
            );
            const contentId = 'contentId';
            const user = new User();
            const dataType1 = 'state';
            const userState1 = '...userState';
            const dataType2 = 'state2';
            const userState2 = '...userState2';

            const mockData = [
                {
                    contentId,
                    userId: user.id,
                    subContentId: '1',
                    userState: userState2,
                    dataType: dataType2,
                    preload: true
                },
                {
                    contentId,
                    userId: user.id,
                    subContentId: '0',
                    userState: userState1,
                    dataType: dataType1,
                    preload: true
                }
            ];

            mockContentUserDataStorage.setMockData(mockData);

            const generatedContentUserDataIntegration =
                await contentUserDataManager.generateContentUserDataIntegration(
                    contentId,
                    user
                );

            expect(generatedContentUserDataIntegration).toEqual([
                { [dataType1]: userState1 },
                { [dataType2]: userState2 }
            ]);
        });

        it('skips the generation if preload flag is set to false or undefined', async () => {
            const mockContentUserDataStorage = MockContentUserDataStorage();

            const contentUserDataManager = new ContentUserDataManager(
                mockContentUserDataStorage
            );
            const contentId = 'contentId';
            const user = new User();
            const dataType1 = 'state';
            const userState1 = '...userState';
            const dataType2 = 'state2';
            const userState2 = '...userState2';

            const mockData = [
                {
                    contentId,
                    userId: user.id,
                    subContentId: '1',
                    userState: userState2,
                    dataType: dataType2,
                    preload: false
                },
                {
                    contentId,
                    userId: user.id,
                    subContentId: '0',
                    userState: userState1,
                    dataType: dataType1,
                    preload: true
                }
            ];

            mockContentUserDataStorage.setMockData(mockData);

            const generatedContentUserDataIntegration =
                await contentUserDataManager.generateContentUserDataIntegration(
                    contentId,
                    user
                );

            expect(generatedContentUserDataIntegration).toEqual([
                { [dataType1]: userState1 }
            ]);
        });
    });
});
