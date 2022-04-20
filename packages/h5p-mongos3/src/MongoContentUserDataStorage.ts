/* eslint-disable no-underscore-dangle */

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
     * @param mongodb a MongoDB collection (read- and writable)
     */
    constructor(private mongodb: MongoDB.Collection) {
        log.info('initialize');
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
        return this.mongodb.findOne<IContentUserData>({
            contentId,
            dataType,
            subContentId,
            userId: user.id
        });
    }

    public async getContentUserDataByUser(
        user: IUser
    ): Promise<IContentUserData[]> {
        return this.mongodb
            .find<IContentUserData>({
                userId: user.id
            })
            .toArray();
    }

    public async createOrUpdateContentUserData(
        userData: IContentUserData
    ): Promise<void> {
        await this.mongodb.updateOne(
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
        await this.mongodb.updateOne(
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
        await this.mongodb.deleteMany({
            contentId,
            invalidate: true
        });
    }

    public async deleteAllContentUserDataByUser(user: IUser): Promise<void> {
        await this.mongodb.deleteMany({
            userId: user.id
        });
    }

    public async deleteAllContentUserDataByContentId(
        contentId: ContentId
    ): Promise<void> {
        await this.mongodb.deleteMany({
            contentId
        });
    }

    public async getContentUserDataByContentIdAndUser(
        contentId: ContentId,
        user: IUser
    ): Promise<IContentUserData[]> {
        return this.mongodb
            .find<IContentUserData>({ contentId, userId: user.id })
            .toArray();
    }

    getFinishedDataByContent(contentId: string): Promise<IFinishedUserData[]> {
        throw new Error('Method not implemented.');
    }
    getFinishedDataByUser(user: IUser): Promise<IFinishedUserData> {
        throw new Error('Method not implemented.');
    }
    deleteFinishedDataByContentId(contentId: string): Promise<void> {
        throw new Error('Method not implemented.');
    }
    deleteFinishedDataByUser(user: IUser): Promise<void> {
        throw new Error('Method not implemented.');
    }
}
