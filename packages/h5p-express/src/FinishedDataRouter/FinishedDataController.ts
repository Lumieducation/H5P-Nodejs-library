import * as express from 'express';
import {
    AjaxSuccessResponse,
    CompletionWebhookService,
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

        // Call webhook if enabled and configured
        if (
            this.config.completionWebhookEnabled &&
            this.config.completionWebhookUrl
        ) {
            // Call webhook asynchronously - don't wait for it to complete
            // This ensures webhook failures don't affect the main response
            CompletionWebhookService.callWebhook(
                this.config.completionWebhookUrl,
                {
                    contentId,
                    userId: user.id,
                    score,
                    maxScore,
                    openedTimestamp: opened,
                    finishedTimestamp: finished,
                    completionTime: time
                },
                req.headers.cookie
            ).catch((error) => {
                // Error is already logged in the webhook service
                // Just ensure it doesn't propagate
            });
        }

        res.status(200).json(new AjaxSuccessResponse(undefined));
    };
}
