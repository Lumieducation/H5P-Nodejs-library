import {
    ContentId,
    ISerializedContentUserData,
    IUser,
    IContentUserDataStorage,
    IContentUserData
} from './types';
import Logger from './helpers/Logger';

const log = new Logger('ContentUserDataManager');

/**
 * The ContentUserDataManager takes care of saving user data and states. It only
 * contains storage-agnostic functionality and depends on a
 * ContentUserDataStorage object to do the actual persistence.
 */
export default class ContentUserDataManager {
    /**
     * @param contentUserDataStorage The storage object
     */
    constructor(private contentUserDataStorage: IContentUserDataStorage) {
        log.info('initialize');
    }

    /**
     * Deletes a contentUserData object for given contentId and userId. Throws
     * errors if something goes wrong.
     * @param user the user for which the contentUserData object should be
     * deleted
     */
    public async deleteAllContentUserDataByUser(user: IUser): Promise<void> {
        if (this.contentUserDataStorage) {
            log.debug(`deleting contentUserData for userId ${user.id}`);
            return this.contentUserDataStorage.deleteAllContentUserDataByUser(
                user
            );
        }
    }

    public async deleteInvalidatedContentUserDataByContentId(
        contentId: ContentId
    ): Promise<void> {
        if (this.contentUserDataStorage && contentId) {
            log.debug(
                `deleting invalidated contentUserData for contentId ${contentId}`
            );
            return this.contentUserDataStorage.deleteInvalidatedContentUserData(
                contentId
            );
        }
    }

    public async deleteAllContentUserDataByContentId(
        contentId: ContentId
    ): Promise<void> {
        if (this.contentUserDataStorage) {
            log.debug(
                `deleting all content user data for contentId ${contentId}`
            );
            return this.contentUserDataStorage.deleteAllContentUserDataByContentId(
                contentId
            );
        }
    }

    /**
     * Loads the contentUserData for given contentId, dataType and subContentId
     * @param contentId The id of the content to load user data from
     * @param dataType Used by the h5p.js client
     * @param subContentId The id provided by the h5p.js client call
     * @param user The user who is accessing the h5p
     * @returns the saved state as string or undefined when not found
     */
    public async getContentUserData(
        contentId: ContentId,
        dataType: string,
        subContentId: string,
        user: IUser
    ): Promise<IContentUserData> {
        if (!this.contentUserDataStorage) {
            return undefined;
        }

        log.debug(
            `loading contentUserData for user with id ${user.id}, contentId ${contentId}, subContentId ${subContentId}, dataType ${dataType}`
        );

        return this.contentUserDataStorage.getContentUserData(
            contentId,
            dataType,
            subContentId,
            user
        );
    }

    /**
     * Loads the content user data for given contentId and user. The returned data
     * is an array of IContentUserData where the position in the array
     * corresponds with the subContentId or undefined if there is no
     * content user data.
     *
     * @param contentId The id of the content to load user data from
     * @param user The user who is accessing the h5p
     * @returns an array of IContentUserData or undefined if no content user data
     * is found.
     */
    public async generateContentUserDataIntegration(
        contentId: ContentId,
        user: IUser
    ): Promise<ISerializedContentUserData[]> {
        log.debug(
            `generating contentUserDataIntegration for user with id ${user.id} and contentId ${contentId}`
        );

        if (!this.contentUserDataStorage) {
            return undefined;
        }

        let states =
            await this.contentUserDataStorage.getContentUserDataByContentIdAndUser(
                contentId,
                user
            );

        if (!states) {
            return undefined;
        }

        states = states.filter((s) => s.preload === true);

        const sortedStates = states.sort(
            (a, b) => Number(a.subContentId) - Number(b.subContentId)
        );

        const mappedStates = sortedStates
            // filter removes states where preload is set to false
            .filter((state) => state.preload)
            // maps the state to an object where the key is the dataType and the userState is the value
            .map((state) => ({
                [state.dataType]: state.userState
            }));

        return mappedStates;
    }

    /**
     * Saves data when a user completes content.
     * @param contentId The content id to delete.
     * @param score the score the user reached as an integer
     * @param maxScore the maximum score of the content
     * @param openedTimestamp the time the user opened the content as UNIX time
     * @param finishedTimestamp the time the user finished the content as UNIX
     * time
     * @param completionTime the time the user needed to complete the content
     * (as integer)
     * @param user The user who triggers this method via /setFinished
     */
    public async setFinished(
        contentId: ContentId,
        score: number,
        maxScore: number,
        openedTimestamp: number,
        finishedTimestamp: number,
        completionTime: number,
        user: IUser
    ): Promise<void> {
        log.debug(
            `saving finished data for ${user.id} and contentId ${contentId}`
        );

        if (!this.contentUserDataStorage) {
            return undefined;
        }

        await this.contentUserDataStorage.createOrUpdateFinishedData({
            contentId,
            score,
            maxScore,
            openedTimestamp,
            finishedTimestamp,
            completionTime,
            userId: user.id
        });
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
    public async createOrUpdateContentUserData(
        contentId: ContentId,
        dataType: string,
        subContentId: string,
        userState: string,
        invalidate: boolean,
        preload: boolean,
        user: IUser
    ): Promise<void> {
        log.debug(
            `saving contentUserData for user with id ${user.id} and contentId ${contentId}`
        );

        if (typeof invalidate !== 'boolean' || typeof preload !== 'boolean') {
            log.error(`invalid arguments passed for contentId ${contentId}`);
            throw new Error(
                "createOrUpdateContentUserData received invalid arguments: invalidate or preload weren't boolean"
            );
        }

        if (this.contentUserDataStorage) {
            return this.contentUserDataStorage.createOrUpdateContentUserData({
                contentId,
                dataType,
                subContentId,
                userState,
                invalidate,
                preload,
                userId: user.id
            });
        }
    }
}
