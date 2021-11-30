import * as express from 'express';

import {
    ContentUserDataManager,
    IPostContentUserData
} from '@lumieducation/h5p-server';
import { IRequestWithUser } from '../expressTypes';

interface IPostContentUserDataRequest
    extends IPostContentUserData,
        IRequestWithUser {}

export default class ContentUserDataController {
    constructor(protected contentUserDataManager: ContentUserDataManager) {}

    /**
     * Returns the userState for given contentId, dataType and subContentId
     */
    public getContentUserData = async (
        req: IRequestWithUser,
        res: express.Response<{
            data: string;
            success: boolean;
        }>
    ): Promise<void> => {
        const { contentId, dataType, subContentId } = req.params;
        const userState = await this.contentUserDataManager.loadContentUserData(
            contentId,
            dataType,
            subContentId,
            req.user
        );
        res.status(200).json({ data: userState, success: true });
    };

    /**
     * Saving a userState for given contentId, datType and subContentId
     *
     */
    public postContentUserData = async (
        req: IPostContentUserDataRequest,
        res: express.Response
    ): Promise<void> => {
        const { contentId, dataType, subContentId } = req.params;
        const { user, body } = req;

        await this.contentUserDataManager.saveContentUserData(
            contentId,
            dataType,
            subContentId,
            body.data,
            body.invalidate === 1 || body.invalidate === '1',
            body.preload === 1 || body.preload === '1',
            user
        );

        res.status(200).end();
    };
}
