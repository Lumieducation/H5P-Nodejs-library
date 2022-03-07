// import ContentUserDataManager from '../src/ContentUserDataManager';
import fsExtra from 'fs-extra';
import FileContentUserDataStorage from '../../src/implementation/fs/FileContentUserDataStorage';
import { withDir, withFile } from 'tmp-promise';

import User from '../User';

describe('FileContentUserDataStorage', () => {
    // const testFile = `${__dirname}/../data/TestFileContentUserDataStorage.json`;
    // const fileContentUserDataStorage = new FileContentUserDataStorage(testFile);
    const user = new User();

    describe('loadContentUserData', () => {
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
                    await fileContentUserDataStorage.loadContentUserData(
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

    describe('listContentUserDataByUserId', () => {
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
                    await fileContentUserDataStorage.listContentUserDataByUserId(
                        user.id
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
                    await fileContentUserDataStorage.listContentUserDataByUserId(
                        'empty'
                    );

                expect(emptyResult).toEqual([]);
            });
        });

        it('returns only the contentUserData for the given userId', async () => {
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
                    await fileContentUserDataStorage.listContentUserDataByUserId(
                        user.id
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

    describe('saveContentUserData', () => {
        it('saves the contentUserData to a json file', async () => {
            await withFile(async ({ path: jsonFilePath }) => {
                await fsExtra.writeJSON(jsonFilePath, {
                    userData: [],
                    userFinishedData: []
                });

                const fileContentUserDataStorage =
                    new FileContentUserDataStorage(jsonFilePath);

                await fileContentUserDataStorage.saveContentUserData(
                    'contentId',
                    'state',
                    '0',
                    'testUserState',
                    false,
                    false,
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

    describe('deleteContentUserDataByUserId', () => {
        it('deletes the contentUserData for a given contentId and userId', async () => {
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

                await fileContentUserDataStorage.deleteContentUserDataByUserId(
                    'contentId2',
                    user.id,
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
                    'contentId',
                    user
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

    describe('listByContent', () => {
        it('lists all contentUserData for a given contentId and userId', async () => {
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

                const result = await fileContentUserDataStorage.listByContent(
                    'contentId',
                    user.id
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

    describe('deleteInvalidContentUserData', () => {
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

                await fileContentUserDataStorage.deleteInvalidContentUserData(
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
