import express from 'express';
import * as H5P from '@lumieducation/h5p-server';
import {
    IRequestWithUser,
    IRequestWithLanguage
} from '@lumieducation/h5p-express';

function getContentId(contentId: string | string[]): string {
    return Array.isArray(contentId) ? contentId[0] : contentId;
}

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

    router.get(`/:contentId/play`, async (req: IRequestWithUser, res) => {
        try {
            const content = await h5pPlayer.render(
                getContentId(req.params.contentId),
                req.user,
                languageOverride === 'auto'
                    ? (req.language ?? 'en')
                    : languageOverride,
                {
                    // We pass through the contextId here to illustrate how
                    // to work with it. Context ids allow you to have
                    // multiple user states per content object. They are
                    // purely optional. You should *NOT* pass the contextId
                    // to the render method if you don't need contextIds!
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
            res.status(200).send(content);
        } catch (error) {
            console.error(error);
            res.status(error.httpStatusCode ? error.httpStatusCode : 500).send(
                error.message
            );
        }
    });

    router.get(
        '/:contentId/edit',
        async (req: IRequestWithLanguage & { user: H5P.IUser }, res) => {
            const contentId = Array.isArray(req.params.contentId)
                ? req.params.contentId[0]
                : req.params.contentId;
            // This route merges the render and the /ajax/params routes to avoid a
            // second request.
            const editorModel = (await h5pEditor.render(
                contentId === 'undefined' ? undefined : contentId,
                languageOverride === 'auto'
                    ? (req.language ?? 'en')
                    : languageOverride,
                req.user
            )) as H5P.IEditorModel;
            if (!contentId || contentId === 'undefined') {
                res.status(200).send(editorModel);
            } else {
                const content = await h5pEditor.getContent(contentId, req.user);
                res.status(200).send({
                    ...editorModel,
                    library: content.library,
                    metadata: content.params.metadata,
                    params: content.params.params
                });
            }
        }
    );

    router.post('/', async (req: IRequestWithUser, res) => {
        if (
            !req.body.params ||
            !req.body.params.params ||
            !req.body.params.metadata ||
            !req.body.library ||
            !req.user
        ) {
            res.status(400).send('Malformed request');
            return;
        }
        const { id: contentId, metadata } =
            await h5pEditor.saveOrUpdateContentReturnMetaData(
                undefined,
                req.body.params.params,
                req.body.params.metadata,
                req.body.library,
                req.user
            );

        res.status(200).json({ contentId, metadata });
    });

    router.patch('/:contentId', async (req: IRequestWithUser, res) => {
        const routeContentId = Array.isArray(req.params.contentId)
            ? req.params.contentId[0]
            : req.params.contentId;
        if (
            !req.body.params ||
            !req.body.params.params ||
            !req.body.params.metadata ||
            !req.body.library ||
            !req.user
        ) {
            res.status(400).send('Malformed request');
            return;
        }
        const { id: contentId, metadata } =
            await h5pEditor.saveOrUpdateContentReturnMetaData(
                routeContentId.toString(),
                req.body.params.params,
                req.body.params.metadata,
                req.body.library,
                req.user
            );

        res.status(200).json({ contentId, metadata });
    });

    router.delete('/:contentId', async (req: IRequestWithUser, res) => {
        const contentId = Array.isArray(req.params.contentId)
            ? req.params.contentId[0]
            : req.params.contentId;
        try {
            await h5pEditor.deleteContent(contentId, req.user);
        } catch (error) {
            console.error(error);

            return res
                .status(500)
                .send(
                    `Error deleting content with id ${contentId}: ${error.message}`
                );
        }

        res.status(200).send(`Content ${contentId} successfully deleted.`);
    });

    router.get('/', async (req: IRequestWithUser, res) => {
        let contentObjects;
        try {
            const contentIds = await h5pEditor.contentManager.listContent(
                req.user
            );
            contentObjects = await Promise.all(
                contentIds.map(async (id) => ({
                    content: await h5pEditor.contentManager.getContentMetadata(
                        id,
                        req.user
                    ),
                    id
                }))
            );
        } catch (error) {
            if (error instanceof H5P.H5pError) {
                return res
                    .status(error.httpStatusCode)
                    .send(`${error.message}`);
            } else {
                return res.status(500).send(`Unknown error: ${error.message}`);
            }
        }

        res.status(200).send(
            contentObjects.map((o) => ({
                contentId: o.id,
                title: o.content.title,
                mainLibrary: o.content.mainLibrary
            }))
        );
    });

    return router;
}
