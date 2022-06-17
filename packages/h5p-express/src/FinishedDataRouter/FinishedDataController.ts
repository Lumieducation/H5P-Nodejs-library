import * as express from 'express';
import {
    AjaxSuccessResponse,
    ContentUserDataManager,
    IH5PConfig,
    IPostContentUserData
} from '@lumieducation/h5p-server';

import { IRequestWithUser } from '../expressTypes';

interface IPostContentUserDataRequest
    extends IPostContentUserData,
        IRequestWithUser {}

export default class FinishedDataController {
    constructor(
        protected contentUserDataManager: ContentUserDataManager,
        protected config: IH5PConfig
    ) {}

    /**
     * Saves the setFinished state for a given user
     */
    public postSetFinished = async (
        req: IPostContentUserDataRequest,
        res: express.Response
    ): Promise<void> => {
        if (!this.config.setFinishedEnabled) {
            res.status(403).end();
            return;
        }

        const { user, body } = req;
        const { contentId, score, maxScore, opened, finished, time } = body;

        await this.contentUserDataManager.setFinished(
            contentId,
            score,
            maxScore,
            opened,
            finished,
            time,
            user
        );

        res.status(200).json(new AjaxSuccessResponse(undefined));
    };
}
