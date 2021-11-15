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
    constructor(contentUserDataStorage: IContentUserDataStorage) {
        log.info('initialize');
        this.contentUserDataStorage = contentUserDataStorage;
    }

    private contentUserDataStorage: IContentUserDataStorage;

    public async deleteContentUserData(
        contentId: ContentId,
        user: IUser
    ): Promise<void> {
        if (this.contentUserDataStorage) {
            return this.contentUserDataStorage.deleteContentUserData(
                contentId,
                user
            );
        }
        return;
    }

    /**
     * Loads the contentUserData for given contentId, dataType and subContentId - called via GET from https://github.com/h5p/h5p-php-library/blob/master/js/h5p.js#L2416
     * At the moment it does not seem to work: https://github.com/Lumieducation/H5P-Nodejs-library/issues/1014#issuecomment-968139480
     * instead the generateContentUserDataIntegration(...) method should be used for integrating the contentUserData object
     * @param contentId The id of the content to load user data from
     * @param dataType Used by the h5p.js client
     * @param subContentId The id provided by the h5p.js client call
     * @param user The user who owns this object
     * @returns
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

        if (!this.contentUserDataStorage.loadContentUserData) {
            log.warn(
                `the loadContentUserData method is not implemented in the provided contentUserDataStorage.`
            );
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
     * Loads the contentUserData for given contentId and user. The returned data should be an array of IContentUserData where the position in the array corresponds with the subContentId or undefined if there is no contentUserData.
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

        return this.contentUserDataStorage.generateContentUserDataIntegration(
            contentId,
            user
        );
    }

    /**
     * Loads the contentUserData for given contentId, dataType and subContentId - called via GET from https://github.com/h5p/h5p-php-library/blob/master/js/h5p.js#L2416
     * At the moment it does not seem to work: https://github.com/Lumieducation/H5P-Nodejs-library/issues/1014#issuecomment-968139480
     * instead the generateContentUserDataIntegration(...) method should be used for integrating the contentUserData object
     * @param contentId The id of the content to save user data from
     * @param dataType Used by the h5p.js client
     * @param subContentId The id provided by the h5p.js client call
     * @param user The user who does the content
     * @returns
     */
    public async saveContentUserData(
        contentId: string,
        dataType: string,
        subcontentId: string,
        data: any,
        user: IUser
    ): Promise<void> {
        log.info(
            `saving contentUserData for user with id ${user.id} and contentId ${contentId}`
        );
        return this.contentUserDataStorage.saveContentUserData(
            contentId,
            dataType,
            subcontentId,
            data,
            user
        );
    }
}
