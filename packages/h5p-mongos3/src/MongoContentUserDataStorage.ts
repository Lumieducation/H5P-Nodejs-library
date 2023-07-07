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

/**
 * MongoDB storage for user data and finished data.
 *
 * It is highly recommended to call `createIndexes` on initialization.
 */
export default class MongoContentUserDataStorage
    implements IContentUserDataStorage
{
    /**
     * @param userDataCollection a MongoDB collection (read- and writable)
     * @param finishedCollection a MongoDB collection (read- and writable)
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
                    userId: 1,
                    contextId: 1
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
                    userId: 1,
                    contextId: 1
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
        userId: string,
        contextId?: string
    ): Promise<IContentUserData> {
        log.debug(
            `getContentUserData: loading contentUserData for contentId ${contentId} and userId ${userId} and contextId ${contextId}`
        );

        return this.cleanMongoUserData(
            await this.userDataCollection.findOne<IContentUserData>({
                contentId,
                dataType,
                subContentId,
                userId: userId,
                contextId
            })
        );
    }

    public async getContentUserDataByUser(
        user: IUser
    ): Promise<IContentUserData[]> {
        return (
            await this.userDataCollection
                .find<IContentUserData>({
                    userId: user.id
                })
                .toArray()
        )?.map(this.cleanMongoUserData);
    }

    public async createOrUpdateContentUserData(
        userData: IContentUserData
    ): Promise<void> {
        await this.userDataCollection.replaceOne(
            {
                contentId: userData.contentId,
                dataType: userData.dataType,
                subContentId: userData.subContentId,
                userId: userData.userId,
                contextId: userData.contextId
            },
            {
                contentId: userData.contentId,
                dataType: userData.dataType,
                subContentId: userData.subContentId,
                userState: userData.userState,
                invalidate: userData.invalidate,
                preload: userData.preload,
                userId: userData.userId,
                contextId: userData.contextId
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
        userId: string,
        contextId?: string
    ): Promise<IContentUserData[]> {
        return (
            await this.userDataCollection
                .find<IContentUserData>({
                    contentId,
                    userId,
                    contextId
                })
                .toArray()
        )?.map(this.cleanMongoUserData);
    }

    public async getFinishedDataByContentId(
        contentId: string
    ): Promise<IFinishedUserData[]> {
        return (
            await this.finishedCollection
                .find<IFinishedUserData>({ contentId })
                .toArray()
        )?.map(this.cleanMongoFinishedData);
    }

    public async getFinishedDataByUser(
        user: IUser
    ): Promise<IFinishedUserData[]> {
        return (
            await this.finishedCollection
                .find<IFinishedUserData>({ userId: user.id })
                .toArray()
        )?.map(this.cleanMongoFinishedData);
    }

    public async deleteFinishedDataByContentId(
        contentId: string
    ): Promise<void> {
        await this.finishedCollection.deleteMany({ contentId });
    }

    public async deleteFinishedDataByUser(user: IUser): Promise<void> {
        await this.finishedCollection.deleteMany({ userId: user.id });
    }

    /**
     * To avoid leaking internal MongoDB data (id), this method maps the data
     * we've received from Mongo to a new object.
     * @param mongoData the original data received by MongoDB
     * @returns the same data but with all Mongo-internal fields removed
     */
    private cleanMongoUserData(mongoData: IContentUserData): IContentUserData {
        if (!mongoData) {
            return mongoData;
        }
        return {
            dataType: mongoData.dataType,
            invalidate: mongoData.invalidate,
            preload: mongoData.preload,
            subContentId: mongoData.subContentId,
            userState: mongoData.userState,
            contentId: mongoData.contentId,
            userId: mongoData.userId,
            contextId: mongoData.contextId
        };
    }

    /**
     * To avoid leaking internal MongoDB data (id), this method maps the data
     * we've received from Mongo to a new object.
     * @param mongoData the original data received by MongoDB
     * @returns the same data but with all Mongo-internal fields removed
     */
    private cleanMongoFinishedData(
        mongoData: IFinishedUserData
    ): IFinishedUserData {
        if (!mongoData) {
            return mongoData;
        }
        return {
            completionTime: mongoData.completionTime,
            contentId: mongoData.contentId,
            finishedTimestamp: mongoData.finishedTimestamp,
            maxScore: mongoData.maxScore,
            openedTimestamp: mongoData.openedTimestamp,
            score: mongoData.score,
            userId: mongoData.userId
        };
    }
}
