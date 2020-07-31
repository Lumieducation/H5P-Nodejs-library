import * as express from 'express';
import { H5PEditor, LibraryName, H5pError, ContentId } from '../..';
import { lookup as mimeLookup } from 'mime-types';
import AjaxSuccessResponse from '../../helpers/AjaxSuccessResponse';
import { Readable } from 'stream';
import { IFileStats, IUser } from '../../types';
import { IRequestWithUser, IRequestWithTranslator } from '../expressTypes';

interface IActionRequest extends IRequestWithUser, IRequestWithTranslator {
    files: {
        file: {
            data: Buffer;
            mimetype: string;
            name: string;
            size: number;
        };
        h5p: {
            data: any;
        };
    };
}

/**
 * The methods in this class can be used to answer AJAX requests that are received by Express routers.
 * You can use all methods independently at your convenience.
 * Note that even though the names getAjax and postAjax imply that only these methods deal with AJAX
 * requests, ALL methods except getDownload deal with AJAX requests. This confusion is caused by the
 * HTTP interface the H5P client uses and we can't change it.
 */
export default class H5PAjaxExpressController {
    constructor(protected h5pEditor: H5PEditor) {}

    /**
     * Get various things through the Ajax endpoint.
     */
    public getAjax = async (
        req: IRequestWithUser,
        res: express.Response
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
                    machineName?.toString(),
                    majorVersion?.toString(),
                    minorVersion?.toString(),
                    language?.toString()
                );
                res.status(200).json(library);

                break;

            default:
                res.status(400).end();
                break;
        }
    };

    public getContentFile = async (
        req: IRequestWithUser,
        res: express.Response
    ): Promise<void> => {
        const stats = await this.h5pEditor.contentStorage.getFileStats(
            req.params.id,
            req.params.file,
            req.user
        );
        return this.abstractGetContentFile(
            req.params.id,
            req.params.file,
            req.user,
            stats,
            req,
            res
        );
    };

    public getContentParameters = async (
        req: IRequestWithUser,
        res: express.Response
    ): Promise<void> => {
        const content = await this.h5pEditor.getContent(
            req.params.contentId,
            req.user
        );
        res.status(200).json(content);
    };

    public getDownload = async (
        req: IRequestWithUser,
        res: express.Response
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
        res: express.Response
    ): Promise<void> => {
        const lib = LibraryName.fromUberName(req.params.uberName);
        const [stats, stream] = await Promise.all([
            this.h5pEditor.libraryManager.getFileStats(lib, req.params.file),
            this.h5pEditor.getLibraryFileStream(lib, req.params.file)
        ]);

        this.pipeStreamToResponse(req.params.file, stream, res, stats.size);
    };

    public getTemporaryContentFile = async (
        req: IRequestWithUser,
        res: express.Response
    ): Promise<void> => {
        const stats = await this.h5pEditor.temporaryStorage.getFileStats(
            req.params.file,
            req.user
        );
        return this.abstractGetContentFile(
            undefined,
            req.params.file,
            req.user,
            stats,
            req,
            res
        );
    };

    /**
     * Post various things through the Ajax endpoint
     * Don't be confused by the fact that many of the requests dealt with here are not
     * really POST requests, but look more like GET requests. This is simply how the H5P
     * client works and we can't change it.
     */
    public postAjax = async (
        req: IActionRequest,
        res: express.Response
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
                    req.query.language as string
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
                    req.query.id as string,
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

    /**
     * Unified handling of range requests for getContentFile and
     * getTemporaryContentFile.
     * @param contentId (optional) the contentId, can be undefined if a
     * temporary file is requested
     */
    private async abstractGetContentFile(
        contentId: ContentId,
        file: string,
        user: IUser,
        stats: IFileStats,
        req: express.Request,
        res: express.Response
    ): Promise<void> {
        const range = req.range(stats.size);
        let start: number;
        let end: number;
        if (range) {
            if (range === -2) {
                throw new H5pError('malformed-request', {}, 400);
            }
            if (range === -1) {
                throw new H5pError('unsatisfiable-range', {}, 416);
            }
            if (range.length > 1) {
                throw new H5pError('multipart-ranges-unsupported', {}, 400);
            }
            start = range[0].start;
            end = range[0].end;
        }

        const stream = await this.h5pEditor.getContentFileStream(
            contentId,
            file,
            user,
            start,
            end
        );
        if (range) {
            this.pipeStreamToPartialResponse(
                req.params.file,
                stream,
                res,
                stats.size,
                start,
                end
            );
        } else {
            this.pipeStreamToResponse(req.params.file, stream, res, stats.size);
        }
    }

    private pipeStreamToPartialResponse = (
        filename: string,
        readStream: Readable,
        response: express.Response,
        totalLength: number,
        start: number,
        end: number
    ) => {
        const contentType = mimeLookup(filename) || 'application/octet-stream';

        response.writeHead(206, {
            'Content-Type': contentType,
            'Content-Length': end - start + 1,
            'Content-Range': `bytes ${start}-${end}/${totalLength}`
        });

        readStream.on('error', (err) => {
            response.status(404).end();
        });
        readStream.pipe(response);
    };

    private pipeStreamToResponse = (
        filename: string,
        readStream: Readable,
        response: express.Response,
        contentLength?: number
    ) => {
        const contentType = mimeLookup(filename) || 'application/octet-stream';
        if (contentLength) {
            response.writeHead(200, {
                'Content-Type': contentType,
                'Content-Length': contentLength,
                'Accept-Ranges': 'bytes'
            });
        } else {
            response.type(contentType);
        }
        readStream.on('error', (err) => {
            response.status(404).end();
        });
        readStream.pipe(response);
    };
}
