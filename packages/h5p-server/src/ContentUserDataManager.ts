import sanitizeHtml from 'sanitize-html';

import {
    ContentId,
    IContentUserData,
    IUser,
    IContentUserDataStorage
} from './types';
import Logger from './helpers/Logger';
import H5pError from './helpers/H5pError';

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
     * Deletes a contentUserData object for given contentId and userId
     * Throws errors if something goes wrong.
     * @param contentId The content id to delete.
     * @param userId the userId for which the contentUserData object should be deleted
     * @param requestingUser The user who wants to delete the content (not the user the contentUserData belongs to)
     */
    public async deleteContentUserDataByUserId(
        contentId: ContentId,
        userId: string,
        requestingUser: IUser
    ): Promise<void> {
        if (this.contentUserDataStorage) {
            log.info(
                `deleting contentUserData for ContentId ${contentId} and userId ${userId}`
            );
            return this.contentUserDataStorage.deleteContentUserDataByUserId(
                contentId,
                userId,
                requestingUser
            );
        }
    }

    public async deleteAllContentUserDataByContentId(
        contentId: ContentId,
        requestingUser: IUser
    ): Promise<void> {
        if (this.contentUserDataStorage) {
            log.info(`deleting all contentUserData for ContentId ${contentId}`);
            return this.contentUserDataStorage.deleteAllContentUserDataByContentId(
                contentId,
                requestingUser
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
     * Saves data when a user completes content. T
     * @param contentId The content id to delete.
     * @param score the score the user reached as an integer
     * @param maxScore the maximal score of the content
     * @param openend the time the user opened the content as UNIX time
     * @param finished the time the user finished the content as UNIX time
     * @param time the time the user needed to complete the content (as integer)
     * @param user The user who triggers this method via /setFinished
     */
    public async setFinished(
        contentId: ContentId,
        score: number,
        maxScore: number,
        opened: number,
        finished: number,
        time: number,
        user: IUser
    ): Promise<void> {
        log.info(
            `saving finished data for ${user.id} and contentId ${contentId}`
        );

        if (!this.contentUserDataStorage) {
            return undefined;
        }

        await this.contentUserDataStorage.saveFinishedDataForUser(
            contentId,
            score,
            maxScore,
            opened,
            finished,
            time,
            user
        );
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

        const sanitizedUserState = sanitizeHtml(userState);

        if (!sanitizedUserState || sanitizedUserState === '') {
            log.error(`no userState provided for ${contentId}`);
            throw new H5pError('no-user-state');
        }

        if (this.contentUserDataStorage) {
            return this.contentUserDataStorage.saveContentUserData(
                contentId,
                dataType,
                subcontentId,
                sanitizedUserState,
                invalidate,
                preload,
                user
            );
        }
    }
}
