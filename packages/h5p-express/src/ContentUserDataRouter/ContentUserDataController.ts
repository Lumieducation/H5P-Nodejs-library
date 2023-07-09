import * as express from 'express';
import {
    ContentUserDataManager,
    IAjaxResponse,
    IPostContentUserData,
    AjaxSuccessResponse,
    IH5PConfig
} from '@lumieducation/h5p-server';

import { IRequestWithUser } from '../expressTypes';

interface IPostContentUserDataRequest
    extends IPostContentUserData,
        IRequestWithUser {}

export default class ContentUserDataController {
    constructor(
        protected contentUserDataManager: ContentUserDataManager,
        protected config: IH5PConfig
    ) {}

    /**
     * Returns the userState for given contentId, dataType and subContentId
     */
    public getContentUserData = async (
        req: IRequestWithUser,
        res: express.Response<IAjaxResponse<string>>
    ): Promise<void> => {
        if (!this.config.contentUserStateSaveInterval) {
            res.status(403).end();
            return;
        }

        const { contentId, dataType, subContentId } = req.params;
        const contextId =
            typeof req.query.contextId === 'string'
                ? req.query.contextId
                : undefined;

        const asUserId =
            typeof req.query.asUserId === 'string'
                ? req.query.asUserId
                : undefined;

        const result = await this.contentUserDataManager.getContentUserData(
            contentId,
            dataType,
            subContentId,
            req.user,
            contextId,
            asUserId
        );

        if (!result || !result.userState) {
            res.status(200).json(new AjaxSuccessResponse(false));
        } else {
            res.status(200).json(new AjaxSuccessResponse(result.userState));
        }
    };

    /**
     * Saves a userState for given contentId, dataType and subContentId
     */
    public postContentUserData = async (
        req: IPostContentUserDataRequest,
        res: express.Response
    ): Promise<void> => {
        if (!this.config.contentUserStateSaveInterval) {
            res.status(403).end();
            return;
        }

        const { contentId, dataType, subContentId } = req.params;
        const contextId =
            typeof req.query.contextId === 'string'
                ? req.query.contextId
                : undefined;
        const asUserId =
            typeof req.query.asUserId === 'string'
                ? req.query.asUserId
                : undefined;
        const ignorePost =
            typeof req.query.ignorePost === 'string'
                ? req.query.ignorePost
                : undefined;

        // The ignorePost query parameter allows us to cancel requests that
        // would fail later, when the ContentUserDataManager would deny write
        // requests to user states. It is necessary, as the H5P JavaScript core
        // client doesn't support displaying a state while saving is disabled.
        // We implement this feature by setting a very long autosave frequency,
        // rejecting write requests in the permission system and using the
        // ignorePost query parameter.
        if (ignorePost == 'yes') {
            res.status(200).json(
                new AjaxSuccessResponse(
                    undefined,
                    'The user state was not saved, as the query parameter ignorePost was set.'
                )
            );
            return;
        }

        const { user, body } = req;

        await this.contentUserDataManager.createOrUpdateContentUserData(
            contentId,
            dataType,
            subContentId,
            body.data,
            body.invalidate === 1 || body.invalidate === '1',
            body.preload === 1 || body.preload === '1',
            user,
            contextId,
            asUserId
        );

        res.status(200).json(new AjaxSuccessResponse(undefined)).end();
    };
}
