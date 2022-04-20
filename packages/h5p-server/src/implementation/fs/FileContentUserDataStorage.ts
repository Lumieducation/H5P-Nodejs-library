import {
    ContentId,
    IContentUserData,
    IContentUserDataStorage,
    IFinishedUserData,
    IUser
} from '../../types';

import JsonStorage from './JsonStorage';

export default class FileContentUserDataStorage
    extends JsonStorage
    implements IContentUserDataStorage
{
    public async getContentUserData(
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

    public async getContentUserDataByUser(
        user: IUser
    ): Promise<IContentUserData[]> {
        const userData = await this.load('userData');

        return userData.filter((data) => data.userId === user.id);
    }

    public async createOrUpdateContentUserData(
        userData: IContentUserData
    ): Promise<void> {
        const allUserData = await this.load('userData');

        // make sure we have only one entry for contentId, dataType, subContentId and user
        const newUserData = allUserData.filter(
            (data) =>
                data.contentId !== userData.contentId &&
                data.dataType !== userData.dataType &&
                data.subContentId !== userData.subContentId &&
                data.userId !== userData.userId
        );

        newUserData.push(userData);

        await this.save('userData', newUserData);
    }

    public async deleteInvalidatedContentUserData(
        contentId: string
    ): Promise<void> {
        const userData = await this.load('userData');

        const newUserData = userData.filter((data) => {
            if (contentId !== data.contentId) {
                return true;
            }
            if (contentId === data.contentId && !data.invalidate) {
                return true;
            }
            return false;
        });

        await this.save('userData', newUserData);
    }

    public async deleteAllContentUserDataByUser(user: IUser): Promise<void> {
        const userData = await this.load('userData');

        const newUserData = userData.filter((data) => data.userId !== user.id);

        await this.save('userData', newUserData);
    }

    public async deleteAllContentUserDataByContentId(
        contentId: ContentId
    ): Promise<void> {
        const userData = await this.load('userData');

        const newUserData = userData.filter(
            (data) => data.contentId !== contentId
        );

        this.save('userData', newUserData);
    }

    public async getContentUserDataByContentIdAndUser(
        contentId: ContentId,
        user: IUser
    ): Promise<IContentUserData[]> {
        const userData = await this.load('userData');
        return userData.filter(
            (data) => data.contentId === contentId && data.userId === user.id
        );
    }

    public async createOrUpdateFinishedData(
        finishedData: IFinishedUserData
    ): Promise<void> {
        const allFinishedData = await this.load('userFinishedData');

        const newUserData = allFinishedData.filter(
            (data) =>
                data.userId !== finishedData.userId &&
                data.contentId !== finishedData.contentId
        );

        newUserData.push(finishedData);
        await this.save('userFinishedData', newUserData);
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
