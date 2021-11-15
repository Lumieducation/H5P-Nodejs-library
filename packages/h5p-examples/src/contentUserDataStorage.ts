import {
    ContentId,
    IUser,
    IContentUserDataStorage,
    IContentUserData,
    IPostContentUserData
} from '@lumieducation/h5p-server';

let state: string = '';

export default class ContentUserDataStorage implements IContentUserDataStorage {
    public async loadContentUserData(
        contentId: ContentId,
        dataType: string,
        subContentId: string,
        user: IUser
    ): Promise<string> {
        return '';
    }

    public async deleteContentUserData(
        contentId: ContentId,
        user: IUser
    ): Promise<void> {
        return;
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
