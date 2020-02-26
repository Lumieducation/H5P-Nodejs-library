import express from 'express';
import path from 'path';

import * as H5P from '../';
import AjaxSuccessResponse from '../helpers/AjaxSuccessResponse';
import expressErrorHandler from './expressErrorHandler';

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

    const wrap = fn => (...args) => fn(...args).catch(args[2]);

    // get library file
    router.get(
        `${h5pEditor.config.librariesUrl}/:uberName/:file(*)`,
        wrap(async (req, res) => {
            const stream = await h5pEditor.libraryManager.getFileStream(
                H5P.LibraryName.fromUberName(req.params.uberName),
                req.params.file
            );
            stream.on('end', () => {
                res.end();
            });
            stream.pipe(res.type(path.basename(req.params.file)));
        })
    );

    // get content file
    router.get(
        `${h5pEditor.config.contentFilesUrl}/:id/:file(*)`,
        wrap(async (req, res) => {
            const stream = await h5pEditor.getContentFileStream(
                req.params.id,
                req.params.file,
                req.user
            );
            stream.on('end', () => {
                res.end();
            });
            stream.pipe(res.type(path.basename(req.params.file)));
        })
    );

    // get temporary content file
    router.get(
        `${h5pEditor.config.temporaryFilesUrl}/:file(*)`,
        wrap(async (req, res, next) => {
            const stream = await h5pEditor.getContentFileStream(
                undefined,
                req.params.file,
                req.user
            );
            stream.on('end', () => {
                res.end();
            });
            stream.pipe(res.type(path.basename(req.params.file)));
        })
    );

    // get parameters (= content.json) of content
    router.get(
        `${h5pEditor.config.paramsUrl}/:contentId`,
        wrap(async (req, res) => {
            const content = await h5pEditor.loadH5P(
                req.params.contentId,
                req.user
            );
            res.status(200).json(content);
        })
    );

    // get various things through the Ajax endpoint
    router.get(
        h5pEditor.config.ajaxUrl,
        wrap(async (req, res) => {
            const { action } = req.query;
            const {
                majorVersion,
                minorVersion,
                machineName,
                language
            } = req.query;

            switch (action) {
                case 'content-type-cache':
                    const contentTypeCache = await h5pEditor.getContentTypeCache(
                        req.user
                    );
                    res.status(200).json(contentTypeCache);
                    break;

                case 'libraries':
                    const library = await h5pEditor.getLibraryData(
                        machineName,
                        majorVersion,
                        minorVersion,
                        language
                    );
                    res.status(200).json(library);

                    break;

                default:
                    res.status(400).end();
                    break;
            }
        })
    );

    // post various things through the Ajax endpoint
    // Don't be confused by the fact that many of the requests dealt with here are not
    // really POST requests, but look more like GET requests. This is simply how the H5P
    // client works and we can't change it.
    router.post(
        h5pEditor.config.ajaxUrl,
        wrap(async (req, res) => {
            const { action } = req.query;

            let updatedLibCount: number;
            let installedLibCount: number;

            const getLibraryResultText = (
                installed: number,
                updated: number
            ): string =>
                `${
                    installed
                        ? req.t('installed-libraries', { count: installed })
                        : ''
                } ${
                    updated
                        ? req.t('updated-libraries', { count: updated })
                        : ''
                }`.trim();

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
                    res.status(200).json(
                        new AjaxSuccessResponse(translationsResponse)
                    );
                    break;
                case 'files':
                    if (!req.body.field) {
                        throw new H5P.H5pError(
                            'malformed-request',
                            { error: "'field' property is missing in request" },
                            400
                        );
                    }
                    let field: any;
                    try {
                        field = JSON.parse(req.body.field);
                    } catch (e) {
                        throw new H5P.H5pError(
                            'malformed-request',
                            {
                                error:
                                    "'field' property is malformed (must be in JSON)"
                            },
                            400
                        );
                    }
                    const uploadFileResponse = await h5pEditor.saveContentFile(
                        req.body.contentId === '0'
                            ? req.query.contentId
                            : req.body.contentId,
                        field,
                        req.files.file,
                        req.user
                    );
                    res.status(200).json(uploadFileResponse);
                    break;
                case 'library-install':
                    const installedLibs = await h5pEditor.installLibrary(
                        req.query.id,
                        req.user
                    );
                    updatedLibCount = installedLibs.filter(
                        l => l.type === 'patch'
                    ).length;
                    installedLibCount = installedLibs.filter(
                        l => l.type === 'new'
                    ).length;

                    const contentTypeCache = await h5pEditor.getContentTypeCache(
                        req.user
                    );
                    res.status(200).json(
                        new AjaxSuccessResponse(
                            contentTypeCache,
                            installedLibCount + updatedLibCount > 0
                                ? getLibraryResultText(
                                      installedLibCount,
                                      updatedLibCount
                                  )
                                : undefined
                        )
                    );
                    break;
                case 'library-upload':
                    const {
                        installedLibraries,
                        metadata,
                        parameters
                    } = await h5pEditor.uploadPackage(
                        req.files.h5p.data,
                        req.user
                    );
                    updatedLibCount = installedLibraries.filter(
                        l => l.type === 'patch'
                    ).length;
                    installedLibCount = installedLibraries.filter(
                        l => l.type === 'new'
                    ).length;

                    const contentTypes = await h5pEditor.getContentTypeCache(
                        req.user
                    );
                    res.status(200).json(
                        new AjaxSuccessResponse(
                            {
                                content: parameters,
                                contentTypes,
                                h5p: metadata
                            },
                            installedLibCount + updatedLibCount > 0
                                ? getLibraryResultText(
                                      installedLibCount,
                                      updatedLibCount
                                  )
                                : undefined
                        )
                    );
                    break;
                default:
                    res.status(500).end('NOT IMPLEMENTED');
                    break;
            }
        })
    );

    // serve core files (= JavaScript + CSS from h5p-php-library)
    router.use(h5pEditor.config.coreUrl, express.static(h5pCorePath));

    // serve editor core files (= JavaScript + CSS from h5p-editor-php-library)
    router.use(
        h5pEditor.config.editorLibraryUrl,
        express.static(h5pEditorLibraryPath)
    );

    // serve download links
    router.get(
        `${h5pEditor.config.downloadUrl}/:contentId`,
        wrap(async (req, res) => {
            // set filename for the package with .h5p extension
            res.setHeader(
                'Content-disposition',
                `attachment; filename=${req.params.contentId}.h5p`
            );
            await h5pEditor.exportPackage(req.params.contentId, res, req.user);
        })
    );

    router.use(expressErrorHandler);

    return router;
}
