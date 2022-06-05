import * as express from 'express';
import {
    ContentUserDataManager,
    IPostContentUserData
} from '@lumieducation/h5p-server';

import { IRequestWithUser } from '../expressTypes';

interface IPostContentUserDataRequest
    extends IPostContentUserData,
        IRequestWithUser {}

export default class FinishedDataController {
    constructor(protected contentUserDataManager: ContentUserDataManager) {}

    /**
     * Saving the setFinished state for a given user
     */
    public postSetFinished = async (
        req: IPostContentUserDataRequest,
        res: express.Response
    ): Promise<void> => {
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

        res.status(204).send().end();
    };
}
