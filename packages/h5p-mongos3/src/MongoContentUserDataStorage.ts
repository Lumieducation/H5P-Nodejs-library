import MongoDB from 'mongodb';

import {
    ContentId,
    IContentUserDataStorage,
    IUser,
    IContentUserData,
    Logger,
    IFinishedUserData
} from '@lumieducation/h5p-server';

const log = new Logger('MongoContentUserDataStorage');

export default class MongoContentUserDataStorage
    implements IContentUserDataStorage
{
    /**
     * @param userDataCollection a MongoDB collection (read- and writable)
     */
    constructor(
        private userDataCollection: MongoDB.Collection,
        private finishedCollection: MongoDB.Collection
    ) {
        log.info('initialize');
    }

    /**
     * Creates indexes to speed up read access. Can be safely used even if
     * indexes already exist.
     */
    public async createIndexes(): Promise<void> {
        await this.userDataCollection.createIndexes([
            {
                key: {
                    contentId: 1
                }
            },
            {
                key: {
                    contentId: 1,
                    invalidate: 1
                }
            },
            {
                key: {
                    contentId: 1,
                    dataType: 1,
                    subContentId: 1,
                    userId: 1
                }
            },
            {
                key: {
                    userId: 1
                }
            },
            {
                key: {
                    contentId: 1,
                    userId: 1
                }
            }
        ]);
        await this.finishedCollection.createIndexes([
            {
                key: {
                    contentId: 1,
                    userId: 1
                }
            },
            {
                key: {
                    contentId: 1
                }
            },
            {
                key: {
                    userId: 1
                }
            }
        ]);
    }

    public async getContentUserData(
        contentId: ContentId,
        dataType: string,
        subContentId: string,
        user: IUser
    ): Promise<IContentUserData> {
        log.debug(
            `getContentUserData: loading contentUserData for contentId ${contentId} and userId ${user.id}`
        );
        return this.userDataCollection.findOne<IContentUserData>({
            contentId,
            dataType,
            subContentId,
            userId: user.id
        });
    }

    public async getContentUserDataByUser(
        user: IUser
    ): Promise<IContentUserData[]> {
        return this.userDataCollection
            .find<IContentUserData>({
                userId: user.id
            })
            .toArray();
    }

    public async createOrUpdateContentUserData(
        userData: IContentUserData
    ): Promise<void> {
        await this.userDataCollection.replaceOne(
            {
                contentId: userData.contentId,
                dataType: userData.dataType,
                subContentId: userData.subContentId,
                userId: userData.userId
            },
            {
                contentId: userData.contentId,
                dataType: userData.dataType,
                subContentId: userData.subContentId,
                userState: userData.userState,
                invalidate: userData.invalidate,
                preload: userData.preload,
                userId: userData.userId
            },
            { upsert: true }
        );
    }

    public async createOrUpdateFinishedData(
        finishedData: IFinishedUserData
    ): Promise<void> {
        await this.finishedCollection.replaceOne(
            {
                contentId: finishedData.contentId,
                userId: finishedData.userId
            },
            {
                contentId: finishedData.contentId,
                score: finishedData.score,
                maxScore: finishedData.maxScore,
                openedTimestamp: finishedData.openedTimestamp,
                finishedTimestamp: finishedData.finishedTimestamp,
                completionTime: finishedData.completionTime,
                userId: finishedData.userId
            },
            { upsert: true }
        );
    }

    public async deleteInvalidatedContentUserData(
        contentId: string
    ): Promise<void> {
        await this.userDataCollection.deleteMany({
            contentId,
            invalidate: true
        });
    }

    public async deleteAllContentUserDataByUser(user: IUser): Promise<void> {
        await this.userDataCollection.deleteMany({
            userId: user.id
        });
    }

    public async deleteAllContentUserDataByContentId(
        contentId: ContentId
    ): Promise<void> {
        await this.userDataCollection.deleteMany({
            contentId
        });
    }

    public async getContentUserDataByContentIdAndUser(
        contentId: ContentId,
        user: IUser
    ): Promise<IContentUserData[]> {
        return this.userDataCollection
            .find<IContentUserData>({ contentId, userId: user.id })
            .toArray();
    }

    public async getFinishedDataByContent(
        contentId: string
    ): Promise<IFinishedUserData[]> {
        return this.finishedCollection
            .find<IFinishedUserData>({ contentId })
            .toArray();
    }

    public async getFinishedDataByUser(
        user: IUser
    ): Promise<IFinishedUserData[]> {
        return this.finishedCollection
            .find<IFinishedUserData>({ userId: user.id })
            .toArray();
    }

    public async deleteFinishedDataByContentId(
        contentId: string
    ): Promise<void> {
        await this.finishedCollection.deleteMany({ contentId });
    }

    public async deleteFinishedDataByUser(user: IUser): Promise<void> {
        await this.finishedCollection.deleteMany({ userID: user.id });
    }
}
