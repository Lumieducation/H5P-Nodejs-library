/* eslint-disable no-underscore-dangle */

import MongoDB from 'mongodb';

import {
    ContentId,
    IContentUserDataStorage,
    IUser,
    IContentUserData,
    Logger
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

    public async loadContentUserData(
        contentId: ContentId,
        dataType: string,
        subContentId: string,
        user: IUser
    ): Promise<IContentUserData> {
        log.debug(
            `loadContentUserData: loading contentUserData for contentId ${contentId} and userId ${user.id}`
        );
        return this.mongodb.findOne<IContentUserData>({
            contentId,
            dataType,
            subContentId,
            userId: user.id
        });
    }

    public async listContentUserDataByUserId(
        userId: string
    ): Promise<IContentUserData[]> {
        return this.mongodb
            .find<IContentUserData>({
                userId
            })
            .toArray();
    }

    public async createOrUpdateContentUserData(
        contentId: ContentId,
        dataType: string,
        subContentId: string,
        userState: string,
        invalidate: boolean,
        preload: boolean,
        user: IUser
    ): Promise<void> {
        await this.mongodb.updateOne(
            {
                contentId,
                dataType,
                subContentId,
                userState,
                invalidate,
                preload,
                userId: user.id
            },
            { upsert: true }
        );
    }

    public async saveFinishedDataForUser(
        contentId: ContentId,
        score: number,
        maxScore: number,
        openedTimestamp: number,
        finishedTimestamp: number,
        completionTime: number,
        user: IUser
    ): Promise<void> {
        await this.mongodb.updateOne(
            {
                contentId,
                score,
                maxScore,
                openedTimestamp,
                finishedTimestamp,
                completionTime,
                user
            },
            { upsert: true }
        );
    }

    public async deleteInvalidContentUserData(
        contentId: string
    ): Promise<void> {
        await this.mongodb.deleteMany({
            contentId,
            invalidate: true
        });
    }

    public async deleteContentUserDataByUserId(
        contentId: ContentId,
        userId: string,
        requestingUser: IUser
    ): Promise<void> {
        await this.mongodb.deleteMany({
            contentId,
            userId
        });
    }

    public async deleteAllContentUserDataByContentId(
        contentId: ContentId,
        requestingUser: IUser
    ): Promise<void> {
        await this.mongodb.deleteMany({
            contentId
        });
    }

    public async listByContent(
        contentId: ContentId,
        userId: string
    ): Promise<IContentUserData[]> {
        return this.mongodb
            .find<IContentUserData>({ contentId, userId })
            .toArray();
    }
}
