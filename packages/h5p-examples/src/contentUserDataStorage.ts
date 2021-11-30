import {
    ContentId,
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

export class ContentUserDataStorage implements IContentUserDataStorage {
    public loadContentUserData(
        contentId: ContentId,
        dataType: string,
        subContentId: string,
        user: IUser
    ): Promise<string> {
        return Promise.resolve(
            userData.filter(
                (data) =>
                    data.contentId === contentId &&
                    data.dataType === dataType &&
                    data.subContentId === subContentId &&
                    data.userId === user.id
            )[0]?.userState
        );
    }

    public saveContentUserData(
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

        return;
    }

    public deleteContentUserDataByUserId(
        contentId: ContentId,
        userId: string,
        requestingUser: IUser
    ): Promise<void> {
        userData = userData.filter(
            (data) => data.contentId !== contentId && data.userId !== userId
        );
        return;
    }

    public deleteAllContentUserDataByContentId(
        contentId: ContentId,
        requestingUser: IUser
    ): Promise<void> {
        userData = userData.filter((data) => data.contentId !== contentId);
        return;
    }

    public listByContent(
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

export default new ContentUserDataStorage();
