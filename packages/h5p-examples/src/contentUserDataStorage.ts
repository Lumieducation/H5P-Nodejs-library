import {
    ContentId,
    IContentUserData,
    IContentUserDataStorage,
    IUser
} from '@lumieducation/h5p-server';

let userData: {
    contentId?: string;
    dataType: string;
    subContentId: string;
    userState: string; // the contentUserState/contentUserData as string
    userId?: string;
}[] = [];

let userFinishedData: {
    contentId: ContentId;
    score: number;
    maxScore: number;
    opened: number;
    finished: number;
    time: number;
    user: IUser;
}[] = [];

export default class ContentUserDataStorage implements IContentUserDataStorage {
    public async loadContentUserData(
        contentId: ContentId,
        dataType: string,
        subContentId: string,
        user: IUser
    ): Promise<string> {
        return userData.filter(
            (data) =>
                data.contentId === contentId &&
                data.dataType === dataType &&
                data.subContentId === subContentId &&
                data.userId === user.id
        )[0]?.userState;
    }

    public async listContentUserDataByUserId(
        userId: string
    ): Promise<IContentUserData[]> {
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
        // make sure we have only one entry for contentId, dataType, subContentId and user
        userData = userData.filter(
            (data) =>
                data.contentId !== contentId &&
                data.dataType !== dataType &&
                data.subContentId !== subContentId &&
                data.userId !== user.id
        );

        userData.push({
            contentId,
            dataType,
            subContentId,
            userState,
            // invalidate,
            // preload,
            userId: user.id
        });
    }

    public async saveFinishedDataForUser(
        contentId: ContentId,
        score: number,
        maxScore: number,
        opened: number,
        finished: number,
        time: number,
        user: IUser
    ): Promise<void> {
        userFinishedData.push({
            contentId,
            score,
            maxScore,
            opened,
            finished,
            time,
            user
        });
    }

    public async deleteContentUserDataByUserId(
        contentId: ContentId,
        userId: string,
        requestingUser: IUser
    ): Promise<void> {
        userData = userData.filter(
            (data) => data.contentId !== contentId && data.userId !== userId
        );
    }

    public async deleteAllContentUserDataByContentId(
        contentId: ContentId,
        requestingUser: IUser
    ): Promise<void> {
        userData = userData.filter((data) => data.contentId !== contentId);
    }

    public async listByContent(
        contentId: ContentId,
        userId: string
    ): Promise<
        {
            contentId?: string;
            dataType: string;
            subContentId: string;
            userState: string; // the contentUserState/contentUserData as string
            userId?: string;
        }[]
    > {
        return Promise.resolve(
            userData.filter(
                (data) => data.contentId === contentId && data.userId === userId
            )
        );
    }
}
