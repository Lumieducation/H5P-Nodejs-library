import {
    ContentId,
    IContentUserData,
    IContentUserDataStorage,
    IUser
} from '../../types';

import JsonStorage from './JsonStorage';

export default class FileContentUserDataStorage
    extends JsonStorage
    implements IContentUserDataStorage
{
    public async loadContentUserData(
        contentId: ContentId,
        dataType: string,
        subContentId: string,
        user: IUser
    ): Promise<IContentUserData> {
        const userData = await this.load('userData');

        return userData.filter(
            (data) =>
                data.contentId === contentId &&
                data.dataType === dataType &&
                data.subContentId === subContentId &&
                data.userId === user.id
        )[0];
    }

    public async listContentUserDataByUserId(
        userId: string
    ): Promise<IContentUserData[]> {
        const userData = await this.load('userData');

        return userData.filter((data) => data.userId === userId);
    }

    public async saveContentUserData(
        contentId: ContentId,
        dataType: string,
        subContentId: string,
        userState: string,
        invalidate: boolean,
        preload: boolean,
        user: IUser
    ): Promise<void> {
        const userData = await this.load('userData');

        // make sure we have only one entry for contentId, dataType, subContentId and user
        const newUserData = userData.filter(
            (data) =>
                data.contentId !== contentId &&
                data.dataType !== dataType &&
                data.subContentId !== subContentId &&
                data.userId !== user.id
        );

        newUserData.push({
            contentId,
            dataType,
            subContentId,
            userState,
            // invalidate,
            // preload,
            userId: user.id
        });

        await this.save('userData', newUserData);
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
        const userFinishedData = await this.load('userFinishedData');
        userFinishedData.push({
            contentId,
            score,
            maxScore,
            openedTimestamp,
            finishedTimestamp,
            completionTime,
            user
        });
        await this.save('userFinishedData', userFinishedData);
    }

    public async deleteContentUserDataByUserId(
        contentId: ContentId,
        userId: string,
        requestingUser: IUser
    ): Promise<void> {
        const userData = await this.load('userData');

        const newUserData = userData.filter(
            (data) => data.contentId !== contentId && data.userId !== userId
        );

        await this.save('userData', newUserData);
    }

    public async deleteAllContentUserDataByContentId(
        contentId: ContentId,
        requestingUser: IUser
    ): Promise<void> {
        const userData = await this.load('userData');

        const newUserData = userData.filter(
            (data) => data.contentId !== contentId
        );

        this.save('userData', newUserData);
    }

    public async listByContent(
        contentId: ContentId,
        userId: string
    ): Promise<IContentUserData[]> {
        const userData = await this.load('userData');
        return userData.filter(
            (data) => data.contentId === contentId && data.userId === userId
        );
    }
}
