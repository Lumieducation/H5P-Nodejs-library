import * as express from 'express';
import { H5PEditor, LibraryName, H5pError, ContentId } from '../..';
import { lookup as mimeLookup } from 'mime-types';
import AjaxSuccessResponse from '../../helpers/AjaxSuccessResponse';
import { Readable } from 'stream';
import { IFileStats, IUser } from '../../types';
import { IRequestWithUser, IActionRequest } from '../expressTypes';
import H5PAjaxEndpoint from '../../H5PAjaxEndpoint';

/**
 * The methods in this class can be used to answer AJAX requests that are received by Express routers.
 * You can use all methods independently at your convenience.
 * Note that even though the names getAjax and postAjax imply that only these methods deal with AJAX
 * requests, ALL methods except getDownload deal with AJAX requests. This confusion is caused by the
 * HTTP interface the H5P client uses and we can't change it.
 */
export default class H5PAjaxExpressController {
    constructor(protected h5pEditor: H5PEditor) {
        this.ajaxEndpoint = new H5PAjaxEndpoint(h5pEditor);
    }

    private ajaxEndpoint: H5PAjaxEndpoint;

    /**
     * Get various things through the Ajax endpoint.
     */
    public getAjax = async (
        req: IRequestWithUser,
        res: express.Response
    ): Promise<void> => {
        const result = await this.ajaxEndpoint.getAjax(
            req.query.action as string,
            req.query.machineName as string,
            req.query.majorVersion as string,
            req.query.minorVersion as string,
            req.query.language as string,
            req.user
        );
        res.status(200).send(result);
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
        const result = await this.ajaxEndpoint.getContentParameters(
            req.params.contentId,
            req.user
        );
        res.status(200).json(result);
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
        await this.ajaxEndpoint.getDownload(
            req.params.contentId,
            req.user,
            res
        );
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
        const result = await this.ajaxEndpoint.postAjax(
            req.query.action as string,
            req.body as any,
            req.query.language as string,
            req.user,
            req.files?.file,
            req.query.id as string,
            req.t,
            req.files?.h5p
        );
        res.status(200).send(result);
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
