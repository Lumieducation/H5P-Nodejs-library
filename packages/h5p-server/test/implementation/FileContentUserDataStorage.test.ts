// import ContentUserDataManager from '../src/ContentUserDataManager';
import fsExtra from 'fs-extra';
import FileContentUserDataStorage from '../../src/implementation/fs/FileContentUserDataStorage';
import { withFile } from 'tmp-promise';

import User from '../User';

describe('FileContentUserDataStorage', () => {
    // const testFile = `${__dirname}/../data/TestFileContentUserDataStorage.json`;
    // const fileContentUserDataStorage = new FileContentUserDataStorage(testFile);
    const user = new User();

    describe('getContentUserData', () => {
        it('loads the contentUserData from a json file', async () => {
            await withFile(async ({ path: jsonFilePath }) => {
                await fsExtra.writeJSON(jsonFilePath, {
                    userData: [
                        {
                            contentId: 'contentId',
                            dataType: 'state',
                            subContentId: '0',
                            userState: 'testUserState',
                            userId: user.id,
                            preload: true,
                            invalidate: false
                        }
                    ],
                    userFinishedData: []
                });

                const fileContentUserDataStorage =
                    new FileContentUserDataStorage(jsonFilePath);

                const contentUserData =
                    await fileContentUserDataStorage.getContentUserData(
                        'contentId',
                        'state',
                        '0',
                        user
                    );

                expect(contentUserData).toEqual({
                    contentId: 'contentId',
                    dataType: 'state',
                    subContentId: '0',
                    userState: 'testUserState',
                    userId: '1',
                    preload: true,
                    invalidate: false
                });
            });
        });
    });

    describe('getContentUserDataByUser', () => {
        it('lists all contentUserData by userId', async () => {
            const userData = [
                {
                    contentId: 'contentId',
                    dataType: 'state',
                    subContentId: '0',
                    userState: 'testUserState',
                    userId: user.id,
                    preload: true,
                    invalidate: false
                },
                {
                    contentId: 'contentId2',
                    dataType: 'state2',
                    subContentId: '0',
                    userState: 'testUserState2',
                    userId: user.id,
                    preload: true,
                    invalidate: false
                }
            ];
            await withFile(async ({ path: jsonFilePath }) => {
                await fsExtra.writeJSON(jsonFilePath, {
                    userData,
                    userFinishedData: []
                });

                const fileContentUserDataStorage =
                    new FileContentUserDataStorage(jsonFilePath);

                const result =
                    await fileContentUserDataStorage.getContentUserDataByUser(
                        user
                    );

                expect(result).toEqual(userData);
            });
        });

        it('returns an empty array if no matching contentUserData was found', async () => {
            const userData = [
                {
                    contentId: 'contentId',
                    dataType: 'state',
                    subContentId: '0',
                    userState: 'testUserState',
                    userId: user.id,
                    preload: true,
                    invalidate: false
                },
                {
                    contentId: 'contentId2',
                    dataType: 'state2',
                    subContentId: '0',
                    userState: 'testUserState2',
                    userId: user.id,
                    preload: true,
                    invalidate: false
                }
            ];
            await withFile(async ({ path: jsonFilePath }) => {
                await fsExtra.writeJSON(jsonFilePath, {
                    userData,
                    userFinishedData: []
                });

                const fileContentUserDataStorage =
                    new FileContentUserDataStorage(jsonFilePath);

                const emptyResult =
                    await fileContentUserDataStorage.getContentUserDataByUser({
                        ...new User(),
                        id: '2'
                    });

                expect(emptyResult).toEqual([]);
            });
        });

        it('returns only the contentUserData for the given user', async () => {
            const userData = [
                {
                    contentId: 'contentId',
                    dataType: 'state',
                    subContentId: '0',
                    userState: 'testUserState',
                    userId: 'aaa',
                    preload: true,
                    invalidate: false
                },
                {
                    contentId: 'contentId2',
                    dataType: 'state2',
                    subContentId: '0',
                    userState: 'testUserState2',
                    userId: user.id,
                    preload: true,
                    invalidate: false
                }
            ];
            await withFile(async ({ path: jsonFilePath }) => {
                await fsExtra.writeJSON(jsonFilePath, {
                    userData,
                    userFinishedData: []
                });

                const fileContentUserDataStorage =
                    new FileContentUserDataStorage(jsonFilePath);

                const result =
                    await fileContentUserDataStorage.getContentUserDataByUser(
                        user
                    );

                expect(result).toEqual([
                    {
                        contentId: 'contentId2',
                        dataType: 'state2',
                        subContentId: '0',
                        userState: 'testUserState2',
                        userId: user.id,
                        preload: true,
                        invalidate: false
                    }
                ]);
            });
        });
    });

    describe('createOrUpdateContentUserData', () => {
        it('saves the contentUserData to a json file', async () => {
            await withFile(async ({ path: jsonFilePath }) => {
                await fsExtra.writeJSON(jsonFilePath, {
                    userData: [],
                    userFinishedData: []
                });

                const fileContentUserDataStorage =
                    new FileContentUserDataStorage(jsonFilePath);

                await fileContentUserDataStorage.createOrUpdateContentUserData({
                    contentId: 'contentId',
                    dataType: 'state',
                    subContentId: '0',
                    userState: 'testUserState',
                    invalidate: false,
                    preload: false,
                    userId: user.id
                });
                const json = await fsExtra.readJSON(jsonFilePath);
                expect(json).toEqual({
                    userData: [
                        {
                            contentId: 'contentId',
                            dataType: 'state',
                            subContentId: '0',
                            userState: 'testUserState',
                            userId: '1',
                            preload: false,
                            invalidate: false
                        }
                    ],
                    userFinishedData: []
                });
            });
        });
    });

    describe('deleteAllContentUserDataByUser', () => {
        it('deletes the contentUserData for a given userId', async () => {
            await withFile(async ({ path: jsonFilePath }) => {
                await fsExtra.writeJSON(jsonFilePath, {
                    userData: [
                        {
                            contentId: 'contentId',
                            dataType: 'state',
                            subContentId: '0',
                            userState: 'testUserState',
                            userId: 'aaa',
                            preload: true,
                            invalidate: false
                        },
                        {
                            contentId: 'contentId2',
                            dataType: 'state2',
                            subContentId: '0',
                            userState: 'testUserState2',
                            userId: user.id,
                            preload: true,
                            invalidate: false
                        }
                    ],
                    userFinishedData: []
                });

                const fileContentUserDataStorage =
                    new FileContentUserDataStorage(jsonFilePath);

                await fileContentUserDataStorage.deleteAllContentUserDataByUser(
                    user
                );

                const json = await fsExtra.readJSON(jsonFilePath);
                expect(json).toEqual({
                    userData: [
                        {
                            contentId: 'contentId',
                            dataType: 'state',
                            subContentId: '0',
                            userState: 'testUserState',
                            userId: 'aaa',
                            preload: true,
                            invalidate: false
                        }
                    ],
                    userFinishedData: []
                });
            });
        });
    });

    describe('deleteAllContentUserDataByContentId', () => {
        it('deletes all contentUserData for a given contentId', async () => {
            await withFile(async ({ path: jsonFilePath }) => {
                await fsExtra.writeJSON(jsonFilePath, {
                    userData: [
                        {
                            contentId: 'contentId',
                            dataType: 'state',
                            subContentId: '0',
                            userState: 'testUserState',
                            userId: 'aaa',
                            preload: true,
                            invalidate: false
                        },
                        {
                            contentId: 'contentId',
                            dataType: 'state2',
                            subContentId: '0',
                            userState: 'testUserState2',
                            userId: user.id,
                            preload: true,
                            invalidate: false
                        },
                        {
                            contentId: 'contentId2',
                            dataType: 'state',
                            subContentId: '0',
                            userState: 'testUserState',
                            userId: 'aaa',
                            preload: true,
                            invalidate: false
                        }
                    ],
                    userFinishedData: []
                });

                const fileContentUserDataStorage =
                    new FileContentUserDataStorage(jsonFilePath);

                await fileContentUserDataStorage.deleteAllContentUserDataByContentId(
                    'contentId'
                );

                const json = await fsExtra.readJSON(jsonFilePath);
                expect(json).toEqual({
                    userData: [
                        {
                            contentId: 'contentId2',
                            dataType: 'state',
                            subContentId: '0',
                            userState: 'testUserState',
                            userId: 'aaa',
                            preload: true,
                            invalidate: false
                        }
                    ],
                    userFinishedData: []
                });
            });
        });
    });

    describe('getContentUserDataByContentIdAndUser', () => {
        it('lists all contentUserData for a given contentId and user', async () => {
            await withFile(async ({ path: jsonFilePath }) => {
                await fsExtra.writeJSON(jsonFilePath, {
                    userData: [
                        {
                            contentId: 'contentId',
                            dataType: 'state',
                            subContentId: '0',
                            userState: 'testUserState',
                            userId: 'aaa',
                            preload: true,
                            invalidate: false
                        },
                        {
                            contentId: 'contentId',
                            dataType: 'state2',
                            subContentId: '0',
                            userState: 'testUserState2',
                            userId: user.id,
                            preload: true,
                            invalidate: false
                        },
                        {
                            contentId: 'contentId2',
                            dataType: 'state',
                            subContentId: '0',
                            userState: 'testUserState',
                            userId: 'aaa',
                            preload: true,
                            invalidate: false
                        }
                    ],
                    userFinishedData: []
                });

                const fileContentUserDataStorage =
                    new FileContentUserDataStorage(jsonFilePath);

                const result =
                    await fileContentUserDataStorage.getContentUserDataByContentIdAndUser(
                        'contentId',
                        user
                    );

                expect(result).toEqual([
                    {
                        contentId: 'contentId',
                        dataType: 'state2',
                        subContentId: '0',
                        userState: 'testUserState2',
                        userId: user.id,
                        preload: true,
                        invalidate: false
                    }
                ]);
            });
        });
    });

    describe('deleteInvalidatedContentUserData', () => {
        it('deletes all invalid contentUserData', async () => {
            await withFile(async ({ path: jsonFilePath }) => {
                await fsExtra.writeJSON(jsonFilePath, {
                    userData: [
                        {
                            contentId: 'contentId',
                            dataType: 'state',
                            subContentId: '0',
                            userState: 'testUserState',
                            userId: user.id,
                            preload: true,
                            invalidate: true
                        },
                        {
                            contentId: 'contentId',
                            dataType: 'state',
                            subContentId: '0',
                            userState: 'testUserState',
                            userId: user.id,
                            preload: true,
                            invalidate: false
                        },
                        {
                            contentId: 'contentId2',
                            dataType: 'state',
                            subContentId: '0',
                            userState: 'testUserState',
                            userId: user.id,
                            preload: true,
                            invalidate: true
                        }
                    ],
                    userFinishedData: []
                });

                const fileContentUserDataStorage =
                    new FileContentUserDataStorage(jsonFilePath);

                await fileContentUserDataStorage.deleteInvalidatedContentUserData(
                    'contentId'
                );

                const json = await fsExtra.readJSON(jsonFilePath);
                expect(json).toEqual({
                    userData: [
                        {
                            contentId: 'contentId',
                            dataType: 'state',
                            subContentId: '0',
                            userState: 'testUserState',
                            userId: user.id,
                            preload: true,
                            invalidate: false
                        },
                        {
                            contentId: 'contentId2',
                            dataType: 'state',
                            subContentId: '0',
                            userState: 'testUserState',
                            userId: user.id,
                            preload: true,
                            invalidate: true
                        }
                    ],
                    userFinishedData: []
                });
            });
        });
    });
});
