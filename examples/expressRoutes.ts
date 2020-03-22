import express from 'express';

import * as H5P from '../src';

export default function(
    h5pEditor: H5P.H5PEditor,
    h5pPlayer: H5P.H5PPlayer
): express.Router {
    const router = express.Router();

    router.get(`${h5pEditor.config.playUrl}/:contentId`, async (req, res) => {
        try {
            const h5pPage = await h5pPlayer.render(req.params.contentId);
            res.send(h5pPage);
            res.status(200).end();
        } catch (error) {
            res.status(500).end(error.message);
        }
    });

    router.get('/edit/:contentId', async (req, res) => {
        h5pEditor.render(req.params.contentId).then(page => res.end(page));
    });

    router.post('/edit/:contentId', async (req, res) => {
        const contentId = await h5pEditor.saveOrUpdateContent(
            req.params.contentId,
            req.body.params.params,
            req.body.params.metadata,
            req.body.library,
            req.user
        );

        res.send(JSON.stringify({ contentId }));
        res.status(200).end();
    });

    router.get('/new', async (req, res) => {
        h5pEditor.render(undefined).then(page => res.end(page));
    });

    router.post('/new', async (req, res) => {
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

    router.get('/delete/:contentId', async (req, res) => {
        try {
            await h5pEditor.contentManager.deleteContent(
                req.params.contentId,
                req.user
            );
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
