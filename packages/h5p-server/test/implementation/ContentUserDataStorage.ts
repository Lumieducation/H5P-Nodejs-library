import {
    ContentId,
    IUser,
    IContentUserDataStorage,
    IContentUserData,
    IPostContentUserData,
    IGetContentUserData
} from '../../src/types';

const m = {};

export default class ContentUserDataStorage implements IContentUserDataStorage {
    public async loadContentUserData(
        contentId: ContentId,
        dataType: string,
        subContentId: string,
        user: IUser
    ): Promise<IGetContentUserData> {
        console.log('a');

        try {
            console.log(m[contentId].data);
            return {
                data: m[contentId]?.data,
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
        data: IPostContentUserData,
        user: IUser
    ): Promise<void> {
        m[contentId] = data;
        return;
    }

    public async generateContentUserDataIntegration(
        contentId: string,
        user: IUser
    ): Promise<IContentUserData[]> {
        if (contentId === 'abc') {
            return undefined;
        }
        return [
            {
                state: `${contentId}-${user.id}`
            }
        ];
    }
}
