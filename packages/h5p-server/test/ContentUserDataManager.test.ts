import ContentUserDataManager from '../src/ContentUserDataManager';

import MockContentUserDataStorage from './__mocks__/ContentUserDataStorage';

import User from './User';

describe('ContentUserDataManager', () => {
    describe('deleteContentUserDataByUserId', () => {
        it('returns undefined if contentUserDataStorage is undefined', async () => {
            const contentUserDataManager = new ContentUserDataManager(
                undefined
            );

            expect(
                await contentUserDataManager.deleteContentUserDataByUserId(
                    'contentId',
                    'userId',
                    new User()
                )
            ).toBeUndefined();
        });

        it('calls the deleteContentUserDataByUserId-method of the contentUserDateStorage', async () => {
            const mockContentUserDataStorage = MockContentUserDataStorage();

            const contentUserDataManager = new ContentUserDataManager(
                mockContentUserDataStorage
            );
            const contentId = 'contentId';
            const userId = 'userId';
            const user = new User();

            await contentUserDataManager.deleteContentUserDataByUserId(
                contentId,
                userId,
                user
            );

            expect(
                mockContentUserDataStorage.deleteContentUserDataByUserId
            ).toHaveBeenCalledWith(contentId, userId, user);
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

        it('calls the saveSetFinishedDataForUser-method of the contentUserDateStorage', async () => {
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
                mockContentUserDataStorage.saveFinishedDataForUser
            ).toHaveBeenCalledWith(
                contentId,
                score,
                maxScore,
                opened,
                finished,
                time,
                user
            );
        });
    });

    describe('deleteAllContentUserDataByContentId', () => {
        it('returns undefined if contentUserDataStorage is undefined', async () => {
            const contentUserDataManager = new ContentUserDataManager(
                undefined
            );

            expect(
                await contentUserDataManager.deleteAllContentUserDataByContentId(
                    'contentId',
                    new User()
                )
            ).toBeUndefined();
        });

        it('calls the deleteAllContentUserDataByContentId-method of the contentUserDateStorage', async () => {
            const mockContentUserDataStorage = MockContentUserDataStorage();

            const contentUserDataManager = new ContentUserDataManager(
                mockContentUserDataStorage
            );
            const contentId = 'contentId';
            const user = new User();

            await contentUserDataManager.deleteAllContentUserDataByContentId(
                contentId,
                user
            );

            expect(
                mockContentUserDataStorage.deleteAllContentUserDataByContentId
            ).toHaveBeenCalledWith(contentId, user);
        });
    });

    describe('loadContentUserData', () => {
        it('returns undefined if contentUserDataStorage is undefined', async () => {
            const contentUserDataManager = new ContentUserDataManager(
                undefined
            );

            expect(
                await contentUserDataManager.loadContentUserData(
                    'contentId',
                    'state',
                    '0',
                    new User()
                )
            ).toBeUndefined();
        });

        it('calls the loadContentUserData-method of the contentUserDateStorage with the correct arguments', async () => {
            const mockContentUserDataStorage = MockContentUserDataStorage();

            const contentUserDataManager = new ContentUserDataManager(
                mockContentUserDataStorage
            );
            const contentId = 'contentId';
            const dataType = 'string';
            const subContentId = '0';
            const user = new User();

            await contentUserDataManager.loadContentUserData(
                contentId,
                dataType,
                subContentId,
                user
            );

            expect(
                mockContentUserDataStorage.loadContentUserData
            ).toHaveBeenCalledWith(contentId, dataType, subContentId, user);
        });
    });

    describe('saveContentUserData', () => {
        it('returns undefined if contentUserDataStorage is undefined', async () => {
            const contentUserDataManager = new ContentUserDataManager(
                undefined
            );

            expect(
                await contentUserDataManager.saveContentUserData(
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
                contentUserDataManager.saveContentUserData(
                    'contentId',
                    'state',
                    '0',
                    'data',
                    0 as any,
                    false,
                    new User()
                )
            ).rejects.toEqual(new Error('invalid-arguments'));
        });

        it('calls the saveontentUserData-method of the contentUserDateStorage with the correct arguments', async () => {
            const mockContentUserDataStorage = MockContentUserDataStorage();

            const contentUserDataManager = new ContentUserDataManager(
                mockContentUserDataStorage
            );
            const contentId = 'contentId';
            const dataType = 'state';
            const subContentId = '0';
            const userState = '[exampleUserState]';
            const user = new User();

            await contentUserDataManager.saveContentUserData(
                contentId,
                dataType,
                subContentId,
                userState,
                false,
                false,
                user
            );

            expect(
                mockContentUserDataStorage.saveContentUserData
            ).toHaveBeenCalledWith(
                contentId,
                dataType,
                subContentId,
                userState,
                false,
                false,
                user
            );
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

        it('calls the listByContent-method of the contentUserDateStorage with the correct arguments', async () => {
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
                mockContentUserDataStorage.listByContent
            ).toHaveBeenCalledWith(contentId, user.id);
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
                    dataType: dataType2
                },
                {
                    contentId,
                    userId: user.id,
                    subContentId: '0',
                    userState: userState1,
                    dataType: dataType1
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
    });
});
