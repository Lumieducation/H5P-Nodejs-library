import express from 'express';
import path from 'path';

import * as H5P from '../';

/**
 * This router implements all Ajax calls necessary for the H5P (editor) client to work.
 * Use it like this: server.use('/h5p', H5P.adapters.express(h5pEditor, path.resolve('h5p/core'), path.resolve('h5p/editor')));
 * @param h5pEditor the editor object
 * @param h5pCorePath the path on the local disk at which the core files (of the player) can be found
 * @param h5pEditorLibraryPath the path on the local disk at which the core files of the editor can be found
 */
export default function(
    h5pEditor: H5P.H5PEditor,
    h5pCorePath: string,
    h5pEditorLibraryPath: string
): express.Router {
    const router = express.Router();

    router.get(
        `${h5pEditor.config.librariesUrl}/:uberName/:file(*)`,
        async (req, res) => {
            const stream = await h5pEditor.libraryManager.getFileStream(
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

    router.get(`${h5pEditor.config.paramsUrl}/:contentId`, (req, res) => {
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

    router.get(
        `${h5pEditor.config.downloadUrl}/:contentId`,
        async (req, res) => {
            // set filename for the package with .h5p extension
            res.setHeader(
                'Content-disposition',
                `attachment; filename=${req.params.contentId}.h5p`
            );
            await h5pEditor.exportPackage(req.params.contentId, res, req.user);
        }
    );

    return router;
}
