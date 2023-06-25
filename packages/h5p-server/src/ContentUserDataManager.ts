import {
    ContentId,
    ISerializedContentUserData,
    IUser,
    IContentUserDataStorage,
    IContentUserData,
    IPermissionSystem,
    UserDataPermission
} from './types';
import Logger from './helpers/Logger';
import H5pError from './helpers/H5pError';

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
    constructor(
        private contentUserDataStorage: IContentUserDataStorage,
        private permissionSystem: IPermissionSystem
    ) {
        log.info('initialize');
    }

    /**
     * Deletes a contentUserData object for given contentId and userId. Throws
     * errors if something goes wrong.
     * @param actingUser the user for which the contentUserData object should be
     * deleted
     */
    public async deleteAllContentUserDataByUser(
        forUserId: string,
        actingUser: IUser
    ): Promise<void> {
        if (!this.contentUserDataStorage) {
            return;
        }

        log.debug(`deleting contentUserData for userId ${actingUser.id}`);

        if (
            !(await this.permissionSystem.checkUserData(
                actingUser,
                UserDataPermission.DeleteState,
                undefined,
                forUserId
            ))
        ) {
            log.error(
                `User tried delete content states without proper permissions.`
            );
            throw new H5pError(
                'mongo-content-user-data-storage:missing-delete-user-states-permission',
                {},
                403
            );
        }

        return this.contentUserDataStorage.deleteAllContentUserDataByUser(
            actingUser
        );
    }

    public async deleteInvalidatedContentUserDataByContentId(
        contentId: ContentId
    ): Promise<void> {
        if (!this.contentUserDataStorage) {
            return;
        }

        if (contentId) {
            log.debug(
                `deleting invalidated contentUserData for contentId ${contentId}`
            );
            return this.contentUserDataStorage.deleteInvalidatedContentUserData(
                contentId
            );
        }
    }

    public async deleteAllContentUserDataByContentId(
        contentId: ContentId,
        user: IUser
    ): Promise<void> {
        if (!this.contentUserDataStorage) {
            return;
        }

        log.debug(`deleting all content user data for contentId ${contentId}`);

        if (
            !(await this.permissionSystem.checkUserData(
                user,
                UserDataPermission.DeleteState,
                contentId,
                undefined
            ))
        ) {
            log.error(
                `User tried delete content user state without proper permissions.`
            );
            throw new H5pError(
                'mongo-content-user-data-storage:missing-delete-user-state-permission',
                {},
                403
            );
        }

        return this.contentUserDataStorage.deleteAllContentUserDataByContentId(
            contentId
        );
    }

    /**
     * Loads the contentUserData for given contentId, dataType and subContentId
     * @param contentId The id of the content to load user data from
     * @param dataType Used by the h5p.js client
     * @param subContentId The id provided by the h5p.js client call
     * @param user The user who is accessing the h5p
     * @param contextId an arbitrary value that can be used to save multiple
     * states for one content - user tuple
     * @returns the saved state as string or undefined when not found
     */
    public async getContentUserData(
        contentId: ContentId,
        dataType: string,
        subContentId: string,
        user: IUser,
        contextId?: string
    ): Promise<IContentUserData> {
        if (!this.contentUserDataStorage) {
            return;
        }

        log.debug(
            `loading contentUserData for user with id ${user.id}, contentId ${contentId}, subContentId ${subContentId}, dataType ${dataType}, contextId ${contextId}`
        );

        if (
            !(await this.permissionSystem.checkUserData(
                user,
                UserDataPermission.ViewState,
                contentId,
                user.id
            ))
        ) {
            log.error(
                `User tried view user content state without proper permissions.`
            );
            throw new H5pError(
                'mongo-content-user-data-storage:missing-view-user-data-permission',
                {},
                403
            );
        }

        return this.contentUserDataStorage.getContentUserData(
            contentId,
            dataType,
            subContentId,
            user,
            contextId
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
     * @param contextId an arbitrary value that can be used to save multiple
     * states for one content - user tuple
     * @returns an array of IContentUserData or undefined if no content user data
     * is found.
     */
    public async generateContentUserDataIntegration(
        contentId: ContentId,
        user: IUser,
        contextId?: string
    ): Promise<ISerializedContentUserData[]> {
        if (!this.contentUserDataStorage) {
            return;
        }

        log.debug(
            `Generating contentUserDataIntegration for user with id ${user.id}, contentId ${contentId} and contextId ${contextId}.`
        );

        if (
            !(await this.permissionSystem.checkUserData(
                user,
                UserDataPermission.ViewState,
                contentId,
                user.id
            ))
        ) {
            log.error(
                `User tried viewing user content state without proper permissions.`
            );
            throw new H5pError(
                'mongo-content-user-data-storage:missing-view-user-state-permission',
                {},
                403
            );
        }

        let states =
            await this.contentUserDataStorage.getContentUserDataByContentIdAndUser(
                contentId,
                user,
                contextId
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
        if (!this.contentUserDataStorage) {
            return;
        }

        log.debug(
            `saving finished data for ${user.id} and contentId ${contentId}`
        );

        if (
            !(await this.permissionSystem.checkUserData(
                user,
                UserDataPermission.EditFinished,
                contentId,
                user.id
            ))
        ) {
            log.error(
                `User tried add finished data without proper permissions.`
            );
            throw new H5pError(
                'mongo-content-user-data-storage:missing-edit-finished-permission',
                {},
                403
            );
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
     * @param contextId an arbitrary value that can be used to save multiple
     * states for one content - user tuple
     * @returns the saved state as string
     */
    public async createOrUpdateContentUserData(
        contentId: ContentId,
        dataType: string,
        subContentId: string,
        userState: string,
        invalidate: boolean,
        preload: boolean,
        user: IUser,
        contextId?: string
    ): Promise<void> {
        if (typeof invalidate !== 'boolean' || typeof preload !== 'boolean') {
            log.error(`invalid arguments passed for contentId ${contentId}`);
            throw new Error(
                "createOrUpdateContentUserData received invalid arguments: invalidate or preload weren't boolean"
            );
        }
        if (!this.contentUserDataStorage) {
            return;
        }

        log.debug(
            `saving contentUserData for user with id ${user.id} and contentId ${contentId}`
        );

        if (
            !(await this.permissionSystem.checkUserData(
                user,
                UserDataPermission.EditState,
                contentId,
                user.id
            ))
        ) {
            log.error(
                `User tried add / edit user content state without proper permissions.`
            );
            throw new H5pError(
                'mongo-content-user-data-storage:missing-edit-user-data-permission',
                {},
                403
            );
        }

        if (this.contentUserDataStorage) {
            return this.contentUserDataStorage.createOrUpdateContentUserData({
                contentId,
                contextId,
                dataType,
                invalidate,
                preload,
                subContentId,
                userState,
                userId: user.id
            });
        }
    }

    public async deleteFinishedDataByContentId(
        contentId: string,
        actingUser: IUser
    ): Promise<void> {
        if (!this.contentUserDataStorage) {
            return;
        }

        if (
            !(await this.permissionSystem.checkUserData(
                actingUser,
                UserDataPermission.DeleteFinished,
                contentId,
                undefined
            ))
        ) {
            log.error(
                `User tried add delete finished data for content without proper permissions.`
            );
            throw new H5pError(
                'mongo-content-user-data-storage:missing-delete-finished-permission',
                {},
                403
            );
        }
        await this.contentUserDataStorage.deleteFinishedDataByContentId(
            contentId
        );
    }
}
