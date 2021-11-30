import {
    ContentId,
    IContentUserData,
    IUser,
    IContentUserDataStorage
} from './types';

import Logger from './helpers/Logger';

const log = new Logger('ContentUserDataManager');

/**
 * The ContentUserDataManager takes care of saving user data and states. It only contains storage-agnostic functionality and
 * depends on a ContentUserDataStorage object to do the actual persistence.
 */
export default class ContentUserDataManager {
    /**
     * @param contentUserDataStorage The storage object
     */
    constructor(private contentUserDataStorage: IContentUserDataStorage) {
        log.info('initialize');
    }

    /**
     * Deletes a contentUserData object.
     * Throws errors if something goes wrong.
     * @param contentId The content id to delete.
     * @param user The user who wants to delete the content (not the user the contentUserData belongs to)
     */
    public async deleteContentUserData(
        contentId: ContentId,
        user: IUser
    ): Promise<void> {
        if (this.contentUserDataStorage) {
            log.info(`deleting contentUserData for ContentId ${contentId}`);
            return this.contentUserDataStorage.deleteContentUserData(
                contentId,
                user
            );
        }
        return;
    }

    /**
     * Loads the contentUserData for given contentId, dataType and subContentId
     * @param contentId The id of the content to load user data from
     * @param dataType Used by the h5p.js client
     * @param subContentId The id provided by the h5p.js client call
     * @param user The user who owns this object
     * @returns the saved state as string or undefined when not found
     */
    public async loadContentUserData(
        contentId: ContentId,
        dataType: string,
        subContentId: string,
        user: IUser
    ): Promise<string> {
        if (!this.contentUserDataStorage) {
            return undefined;
        }

        log.info(
            `loading contentUserData for user with id ${user.id} and contentId ${contentId}`
        );

        return this.contentUserDataStorage.loadContentUserData(
            contentId,
            dataType,
            subContentId,
            user
        );
    }

    /**
     * Loads the contentUserData for given contentId and user. The returned data is an array of IContentUserData where the position in the array corresponds with the subContentId or undefined if there is no contentUserData.
     *
     * @param contentId The id of the content to load user data from
     * @param user The user who owns this object
     * @returns an array of IContentUserData or undefined if no contentUserData is found.
     */
    public async generateContentUserDataIntegration(
        contentId: ContentId,
        user: IUser
    ): Promise<IContentUserData[]> {
        log.info(
            `generating contentUserDataIntegration for user with id ${user.id} and contentId ${contentId}`
        );

        if (!this.contentUserDataStorage) {
            return undefined;
        }

        const states = await this.contentUserDataStorage.listByContent(
            contentId,
            user.id
        );

        const sortedStates = states.sort(
            (a, b) => Number(a.subContentId) - Number(b.subContentId)
        );

        const mappedStates = sortedStates.map((state) => ({
            [state.dataType]: state.userState
        }));

        return mappedStates;
    }

    /**
     * Saves the contentUserData for given contentId, dataType and subContentId
     * @param contentId The id of the content to load user data from
     * @param dataType Used by the h5p.js client
     * @param subContentId The id provided by the h5p.js client call
     * @param userState The userState as string
     * @param user The user who owns this object
     * @returns the saved state as string
     */
    public async saveContentUserData(
        contentId: string,
        dataType: string,
        subcontentId: string,
        userState: string,
        invalidate: boolean,
        preload: boolean,
        user: IUser
    ): Promise<void> {
        log.info(
            `saving contentUserData for user with id ${user.id} and contentId ${contentId}`
        );
        if (this.contentUserDataStorage) {
            return this.contentUserDataStorage.saveContentUserData(
                contentId,
                dataType,
                subcontentId,
                userState,
                invalidate,
                preload,
                user
            );
        }

        return undefined;
    }
}
