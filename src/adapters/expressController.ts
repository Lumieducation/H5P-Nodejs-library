import * as express from 'express';
import * as path from 'path';

import { H5PEditor, LibraryName, H5pError } from './..';
import AjaxSuccessResponse from '../helpers/AjaxSuccessResponse';

/**
 * The methods in this class can be used to answer AJAX requests that are received by Express routers.
 * You can use all methods independently at your convenience.
 * Note that even though the names getAjax and postAjax imply that only these methods deal with AJAX
 * requests, ALL methods except getDownload deal with AJAX requests. This confusion is caused by the
 * HTTP interface the H5P client uses and we can't change it.
 */
export default class ExpressH5PController {
    constructor(protected h5pEditor: H5PEditor) {}

    /**
     * Get various things through the Ajax endpoint.
     */
    public getAjax = async (
        req: express.Request,
        res: express.Result
    ): Promise<void> => {
        const { action } = req.query;
        const { majorVersion, minorVersion, machineName, language } = req.query;

        switch (action) {
            case 'content-type-cache':
                const contentTypeCache = await this.h5pEditor.getContentTypeCache(
                    req.user
                );
                res.status(200).json(contentTypeCache);
                break;

            case 'libraries':
                const library = await this.h5pEditor.getLibraryData(
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
    };

    public getContentFile = async (
        req: express.Request,
        res: express.Result
    ): Promise<void> => {
        const stream = await this.h5pEditor.getContentFileStream(
            req.params.id,
            req.params.file,
            req.user
        );
        stream.on('end', () => {
            res.end();
        });
        stream.pipe(res.type(path.basename(req.params.file)));
    };

    public getContentParameters = async (
        req: express.Request,
        res: express.Result
    ): Promise<void> => {
        const content = await this.h5pEditor.getContent(
            req.params.contentId,
            req.user
        );
        res.status(200).json(content);
    };

    public getDownload = async (
        req: express.Request,
        res: express.Result
    ): Promise<void> => {
        // set filename for the package with .h5p extension
        res.setHeader(
            'Content-disposition',
            `attachment; filename=${req.params.contentId}.h5p`
        );
        await this.h5pEditor.exportContent(req.params.contentId, res, req.user);
    };

    public getLibraryFile = async (
        req: express.Request,
        res: express.Result
    ): Promise<void> => {
        const stream = await this.h5pEditor.getLibraryFileStream(
            LibraryName.fromUberName(req.params.uberName),
            req.params.file
        );
        stream.on('end', () => {
            res.end();
        });
        stream.pipe(res.type(path.basename(req.params.file)));
    };

    public getTemporaryContentFile = async (
        req: express.Request,
        res: express.Result
    ): Promise<void> => {
        const stream = await this.h5pEditor.getContentFileStream(
            undefined,
            req.params.file,
            req.user
        );
        stream.on('end', () => {
            res.end();
        });
        stream.pipe(res.type(path.basename(req.params.file)));
    };

    /**
     * Post various things through the Ajax endpoint
     * Don't be confused by the fact that many of the requests dealt with here are not
     * really POST requests, but look more like GET requests. This is simply how the H5P
     * client works and we can't change it.
     */
    public postAjax = async (
        req: express.Request,
        res: express.Result
    ): Promise<void> => {
        const { action } = req.query;

        let updatedLibCount: number;
        let installedLibCount: number;

        const getLibraryResultText = (
            installed: number,
            updated: number
        ): string =>
            `${
                installed
                    ? req.t
                        ? req.t('installed-libraries', { count: installed })
                        : `Installed ${installed} libraries.`
                    : ''
            } ${
                updated
                    ? req.t
                        ? req.t('updated-libraries', { count: updated })
                        : `Updated ${updated} libraries.`
                    : ''
            }`.trim();

        switch (action) {
            case 'libraries':
                const libraryOverview = await this.h5pEditor.getLibraryOverview(
                    req.body.libraries
                );
                res.status(200).json(libraryOverview);
                break;
            case 'translations':
                const translationsResponse = await this.h5pEditor.listLibraryLanguageFiles(
                    req.body.libraries,
                    req.query.language
                );
                res.status(200).json(
                    new AjaxSuccessResponse(translationsResponse)
                );
                break;
            case 'files':
                if (!req.body.field) {
                    throw new H5pError(
                        'malformed-request',
                        { error: "'field' property is missing in request" },
                        400
                    );
                }
                let field: any;
                try {
                    field = JSON.parse(req.body.field);
                } catch (e) {
                    throw new H5pError(
                        'malformed-request',
                        {
                            error:
                                "'field' property is malformed (must be in JSON)"
                        },
                        400
                    );
                }
                const uploadFileResponse = await this.h5pEditor.saveContentFile(
                    req.body.contentId === '0'
                        ? req.query.contentId
                        : req.body.contentId,
                    field,
                    req.files.file,
                    req.user
                );
                res.status(200).json(uploadFileResponse);
                break;
            case 'filter':
                if (!req.body.libraryParameters) {
                    throw new H5pError(
                        'malformed-request',
                        { error: 'libraryParameters missing' },
                        400
                    );
                }
                const {
                    library: unfilteredLibrary,
                    params: unfilteredParams,
                    metadata: unfilteredMetadata
                } = JSON.parse(req.body.libraryParameters);

                if (
                    !unfilteredLibrary ||
                    !unfilteredParams ||
                    !unfilteredMetadata
                ) {
                    throw new H5pError(
                        'malformed-request',
                        { error: 'Property missing in libraryParameters' },
                        400
                    );
                }

                // TODO: properly filter params, this is just a hack to get uploading working

                res.status(200).json(
                    new AjaxSuccessResponse({
                        library: unfilteredLibrary,
                        metadata: unfilteredMetadata,
                        params: unfilteredParams
                    })
                );
                break;
            case 'library-install':
                if (!req.query || !req.query.id || !req.user) {
                    throw new H5pError(
                        'malformed-request',
                        { error: 'Request Parameters incorrect.' },
                        400
                    );
                }
                const installedLibs = await this.h5pEditor.installLibraryFromHub(
                    req.query.id,
                    req.user
                );
                updatedLibCount = installedLibs.filter(
                    (l) => l.type === 'patch'
                ).length;
                installedLibCount = installedLibs.filter(
                    (l) => l.type === 'new'
                ).length;

                const contentTypeCache = await this.h5pEditor.getContentTypeCache(
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
                } = await this.h5pEditor.uploadPackage(
                    req.files.h5p.data,
                    req.user
                );
                updatedLibCount = installedLibraries.filter(
                    (l) => l.type === 'patch'
                ).length;
                installedLibCount = installedLibraries.filter(
                    (l) => l.type === 'new'
                ).length;

                const contentTypes = await this.h5pEditor.getContentTypeCache(
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
    };
}
