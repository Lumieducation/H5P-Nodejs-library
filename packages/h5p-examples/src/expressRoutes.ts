import express from 'express';

import * as H5P from '@lumieducation/h5p-server';
import {
    IRequestWithUser,
    IRequestWithLanguage
} from '@lumieducation/h5p-express';

/**
 * @param h5pEditor
 * @param h5pPlayer
 * @param languageOverride the language to use. Set it to 'auto' to use the
 * language set by a language detector in the req.language property.
 * (recommended)
 */
export default function (
    h5pEditor: H5P.H5PEditor,
    h5pPlayer: H5P.H5PPlayer,
    languageOverride: string | 'auto' = 'auto'
): express.Router {
    const router = express.Router();

    router.get(
        `${h5pEditor.config.playUrl}/:contentId`,
        async (req: IRequestWithUser, res) => {
            try {
                const h5pPage = await h5pPlayer.render(
                    req.params.contentId,
                    req.user,
                    languageOverride === 'auto'
                        ? req.language ?? 'en'
                        : languageOverride,
                    {
                        showCopyButton: true,
                        showDownloadButton: true,
                        showFrame: true,
                        showH5PIcon: true,
                        showLicenseButton: true,
                        // We pass through the contextId here to illustrate how
                        // to work with it. Context ids allow you to have
                        // multiple user states per content object. They are
                        // purely optional. You should *NOT* pass the contextId
                        // to the render method if you don't need contextIds!
                        // You can test the contextId by opening
                        // `/h5p/play/XXXX?contextId=YYY` in the browser.
                        contextId:
                            typeof req.query.contextId === 'string'
                                ? req.query.contextId
                                : undefined,
                        // You can impersonate other users to view their content
                        // state by setting the query parameter asUserId.
                        // Example:
                        // `/h5p/play/XXXX?asUserId=YYY`
                        asUserId:
                            typeof req.query.asUserId === 'string'
                                ? req.query.asUserId
                                : undefined,
                        // You can disabling saving of the user state, but still
                        // display it by setting the query parameter
                        // `readOnlyState` to `yes`. This is useful if you want
                        // to review other users' states by setting `asUserId`
                        // and don't want to change their state.
                        // Example:
                        // `/h5p/play/XXXX?readOnlyState=yes`
                        readOnlyState:
                            typeof req.query.readOnlyState === 'string'
                                ? req.query.readOnlyState === 'yes'
                                : undefined
                    }
                );
                res.send(h5pPage);
                res.status(200).end();
            } catch (error) {
                res.status(500).end(error.message);
            }
        }
    );

    router.get(
        '/edit/:contentId',
        async (req: IRequestWithLanguage & IRequestWithUser, res) => {
            const page = await h5pEditor.render(
                req.params.contentId,
                languageOverride === 'auto'
                    ? req.language ?? 'en'
                    : languageOverride,
                req.user
            );
            res.send(page);
            res.status(200).end();
        }
    );

    router.post('/edit/:contentId', async (req: IRequestWithUser, res) => {
        const contentId = await h5pEditor.saveOrUpdateContent(
            req.params.contentId.toString(),
            req.body.params.params,
            req.body.params.metadata,
            req.body.library,
            req.user
        );

        res.send(JSON.stringify({ contentId }));
        res.status(200).end();
    });

    router.get(
        '/new',
        async (req: IRequestWithLanguage & IRequestWithUser, res) => {
            const page = await h5pEditor.render(
                undefined,
                languageOverride === 'auto'
                    ? req.language ?? 'en'
                    : languageOverride,
                req.user
            );
            res.send(page);
            res.status(200).end();
        }
    );

    router.post('/new', async (req: IRequestWithUser, res) => {
        if (
            !req.body.params ||
            !req.body.params.params ||
            !req.body.params.metadata ||
            !req.body.library ||
            !req.user
        ) {
            res.status(400).send('Malformed request').end();
            return;
        }
        const contentId = await h5pEditor.saveOrUpdateContent(
            undefined,
            req.body.params.params,
            req.body.params.metadata,
            req.body.library,
            req.user
        );

        res.send(JSON.stringify({ contentId }));
        res.status(200).end();
    });

    router.get('/delete/:contentId', async (req: IRequestWithUser, res) => {
        try {
            await h5pEditor.deleteContent(req.params.contentId, req.user);
        } catch (error) {
            res.send(
                `Error deleting content with id ${req.params.contentId}: ${error.message}<br/><a href="javascript:window.location=document.referrer">Go Back</a>`
            );
            res.status(500).end();
            return;
        }

        res.send(
            `Content ${req.params.contentId} successfully deleted.<br/><a href="javascript:window.location=document.referrer">Go Back</a>`
        );
        res.status(200).end();
    });

    return router;
}
