import {
    ContentId,
    IUser,
    IContentUserDataStorage,
    IContentUserData,
    IPostContentUserData,
    IGetContentUserData
} from '@lumieducation/h5p-server';

let state: string = '';

export default class ContentUserDataStorage implements IContentUserDataStorage {
    public async loadContentUserData(
        contentId: ContentId,
        dataType: string,
        subContentId: string,
        user: IUser
    ): Promise<IGetContentUserData> {
        try {
            return {
                data: state,
                success: true
            };
        } catch (error) {
            return { data: {}, success: false };
        }
    }
    public async saveContentUserData(
        contentId: ContentId,
        dataType: string,
        subContentId: string,
        contentUserData: IPostContentUserData,
        user: IUser
    ): Promise<void> {
        state = contentUserData.data;
        return;
    }

    public async generateContentUserDataIntegration(
        contentId: string,
        user: IUser
    ): Promise<IContentUserData[]> {
        return [
            {
                state
            }
        ];
    }
}
