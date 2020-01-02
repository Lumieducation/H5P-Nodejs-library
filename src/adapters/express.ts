import express from 'express';
import path from 'path';

import * as H5P from '../';

export default function(
    h5pEditor: H5P.H5PEditor,
    h5pCorePath: string,
    h5pEditorLibraryPath: string
): express.Router {
    const router = express.Router();

    router.get(
        `${h5pEditor.config.librariesUrl}/:uberName/:file(*)`,
        async (req, res) => {
            const stream = h5pEditor.libraryManager.getFileStream(
                H5P.LibraryName.fromUberName(req.params.uberName),
                req.params.file
            );
            stream.on('end', () => {
                res.end();
            });
            stream.pipe(res.type(path.basename(req.params.file)));
        }
    );

    router.get(
        `${h5pEditor.config.contentFilesUrl}/:id/:file(*)`,
        async (req, res) => {
            const stream = await h5pEditor.getContentFileStream(
                req.params.id,
                req.params.file,
                req.user
            );
            stream.on('end', () => {
                res.end();
            });
            stream.pipe(res.type(path.basename(req.params.file)));
        }
    );

    router.get(
        `${h5pEditor.config.temporaryFilesUrl}/:file(*)`,
        async (req, res) => {
            const stream = await h5pEditor.getContentFileStream(
                undefined,
                req.params.file,
                req.user
            );
            stream.on('end', () => {
                res.end();
            });
            stream.pipe(res.type(path.basename(req.params.file)));
        }
    );

    router.get('/params/:contentId', (req, res) => {
        h5pEditor
            .loadH5P(req.params.contentId, req.user)
            .then(content => {
                res.status(200).json(content);
            })
            .catch(() => {
                res.status(404).end();
            });
    });

    router.get(h5pEditor.config.ajaxUrl, (req, res) => {
        const { action } = req.query;
        const { majorVersion, minorVersion, machineName, language } = req.query;

        switch (action) {
            case 'content-type-cache':
                h5pEditor
                    .getContentTypeCache(req.user)
                    .then(contentTypeCache => {
                        res.status(200).json(contentTypeCache);
                    });
                break;

            case 'libraries':
                h5pEditor
                    .getLibraryData(
                        machineName,
                        majorVersion,
                        minorVersion,
                        language
                    )
                    .then(library => {
                        res.status(200).json(library);
                    });
                break;

            default:
                res.status(400).end();
                break;
        }
    });

    router.post(h5pEditor.config.ajaxUrl, async (req, res) => {
        const { action } = req.query;
        switch (action) {
            case 'libraries':
                const libraryOverview = await h5pEditor.getLibraryOverview(
                    req.body.libraries
                );
                res.status(200).json(libraryOverview);
                break;
            case 'translations':
                const translationsResponse = await h5pEditor.getLibraryLanguageFiles(
                    req.body.libraries,
                    req.query.language
                );
                res.status(200).json({
                    data: translationsResponse,
                    success: true
                });
                break;
            case 'files':
                const uploadFileResponse = await h5pEditor.saveContentFile(
                    req.body.contentId === '0'
                        ? req.query.contentId
                        : req.body.contentId,
                    JSON.parse(req.body.field),
                    req.files.file,
                    req.user
                );
                res.status(200).json(uploadFileResponse);
                break;
            case 'library-install':
                await h5pEditor.installLibrary(req.query.id, req.user);
                const contentTypeCache = await h5pEditor.getContentTypeCache(
                    req.user
                );
                res.status(200).json({
                    data: contentTypeCache,
                    success: true
                });
                break;
            case 'library-upload':
                const { metadata, parameters } = await h5pEditor.uploadPackage(
                    req.files.h5p.data,
                    req.user
                );
                const contentTypes = await h5pEditor.getContentTypeCache(
                    req.user
                );
                res.status(200).json({
                    data: {
                        content: parameters,
                        contentTypes,
                        h5p: metadata
                    },
                    success: true
                });
                break;
            default:
                res.status(500).end('NOT IMPLEMENTED');
                break;
        }
    });

    router.use(h5pEditor.config.coreUrl, express.static(h5pCorePath));

    router.use(
        h5pEditor.config.editorLibraryUrl,
        express.static(h5pEditorLibraryPath)
    );

    router.get('/download/:contentId', async (req, res) => {
        // set filename for the package with .h5p extension
        res.setHeader(
            'Content-disposition',
            `attachment; filename=${req.params.contentId}.h5p`
        );
        await h5pEditor.exportPackage(req.params.contentId, res, req.user);
    });

    // TODO: Move the following routes into the example.

    router.get('/play/:contentId', (req, res) => {
        const libraryLoader = (lib, maj, min) =>
            h5pEditor.libraryManager.loadLibrary(
                new H5P.LibraryName(lib, maj, min)
            );
        Promise.all([
            h5pEditor.contentManager.loadContent(
                req.params.contentId,
                req.user
            ),
            h5pEditor.contentManager.loadH5PJson(req.params.contentId, req.user)
        ]).then(([contentObject, h5pObject]) =>
            new H5P.H5PPlayer(
                libraryLoader as any,
                h5pEditor.config,
                null,
                null,
                null
            )
                .render(req.params.contentId, contentObject, h5pObject)
                .then(h5pPage => res.end(h5pPage))
                .catch(error => res.status(500).end(error.message))
        );
    });

    router.get('/edit/:contentId', async (req, res) => {
        h5pEditor.render(req.params.contentId).then(page => res.end(page));
    });

    router.post('/edit/:contentId', async (req, res) => {
        const contentId = await h5pEditor.saveH5P(
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
        const contentId = await h5pEditor.saveH5P(
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

        res.send(`Content ${req.params.contentId} successfully deleted.<br/><a href="javascript:window.location=document.referrer">Go Back</a>`);
        res.status(200).end();
    });

    return router;
}
