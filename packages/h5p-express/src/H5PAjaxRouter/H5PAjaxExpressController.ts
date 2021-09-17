import * as express from 'express';
import {
    H5PEditor,
    H5pError,
    H5PAjaxEndpoint
} from '@lumieducation/h5p-server';
import { Readable } from 'stream';
import { IRequestWithUser, IActionRequest } from '../expressTypes';

/**
 * This class is part of the Express adapter for the H5PAjaxEndpoint class and
 * maps Express specific properties and methods to the generic H5PAjaxEndpoint
 * methods.
 */
export default class H5PAjaxExpressController {
    constructor(protected h5pEditor: H5PEditor) {
        this.ajaxEndpoint = new H5PAjaxEndpoint(h5pEditor);
    }

    private ajaxEndpoint: H5PAjaxEndpoint;

    /**
     * GET /ajax
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
            (req.query.language as string) ?? (req as any).language,
            req.user
        );
        res.status(200).send(result);
    };

    /**
     * GET /content/<contentId>/<filename>
     */
    public getContentFile = async (
        req: IRequestWithUser,
        res: express.Response
    ): Promise<void> => {
        const { mimetype, stream, stats, range } =
            await this.ajaxEndpoint.getContentFile(
                req.params.id,
                req.params.file,
                req.user,
                this.getRange(req)
            );
        if (range) {
            this.pipeStreamToPartialResponse(
                req.params.file,
                stream,
                res,
                stats.size,
                range.start,
                range.end
            );
        } else {
            this.pipeStreamToResponse(mimetype, stream, res, stats.size);
        }
    };

    /**
     * GET /params/<contentId>
     */
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

    /**
     * GET /download/<contentId>
     */
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

    /**
     * GET /libraries/<uberName>/<file>
     */
    public getLibraryFile = async (
        req: express.Request,
        res: express.Response
    ): Promise<void> => {
        const { mimetype, stream, stats } =
            await this.ajaxEndpoint.getLibraryFile(
                req.params.uberName,
                req.params.file
            );

        this.pipeStreamToResponse(mimetype, stream, res, stats.size, {
            'Cache-Control': 'public, max-age=31536000'
        });
    };

    /**
     * GET /temp-files/<file>
     */
    public getTemporaryContentFile = async (
        req: IRequestWithUser,
        res: express.Response
    ): Promise<void> => {
        const { mimetype, stream, stats, range } =
            await this.ajaxEndpoint.getTemporaryFile(
                req.params.file,
                req.user,
                this.getRange(req)
            );
        if (range) {
            this.pipeStreamToPartialResponse(
                req.params.file,
                stream,
                res,
                stats.size,
                range.start,
                range.end
            );
        } else {
            this.pipeStreamToResponse(mimetype, stream, res, stats.size);
        }
    };

    /**
     * POST /ajax
     * Post various things through the Ajax endpoint
     * Don't be confused by the fact that many of the requests dealt with here are not
     * really POST requests, but look more like GET requests. This is simply how the H5P
     * client works and we can't change it.
     */
    public postAjax = async (
        req: IActionRequest & { t: any },
        res: express.Response
    ): Promise<void> => {
        const result = await this.ajaxEndpoint.postAjax(
            req.query.action as string,
            req.body as any,
            (req.query.language as string) ?? (req as any).language,
            req.user,
            req.files?.file,
            req.query.id as string,
            req.t,
            req.files?.h5p,
            req.query.hubId as string
        );
        res.status(200).send(result);
    };

    /**
     * Retrieves a range that was specified in the HTTP request headers. Returns
     * undefined if no range was specified.
     */
    private getRange =
        (req: express.Request) =>
        (fileSize: number): { end: number; start: number } => {
            const range = req.range(fileSize);
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

                return range[0];
            }
            return undefined;
        };

    /**
     * Pipes the contents of the file to the request object and sets the
     * 206 status code and all necessary headers.
     * @param mimetype the mimetype of the file
     * @param readStream a readable stream of the file (at the start position)
     * @param response the Express response object (a writable stream)
     * @param totalLength the total file size of the file
     * @param start the start of the range
     * @param end the end of the range
     */
    private pipeStreamToPartialResponse = (
        mimetype: string,
        readStream: Readable,
        response: express.Response,
        totalLength: number,
        start: number,
        end: number
    ): void => {
        response.writeHead(206, {
            'Content-Type': mimetype,
            'Content-Length': end - start + 1,
            'Content-Range': `bytes ${start}-${end}/${totalLength}`
        });

        readStream.on('error', (err) => {
            response.status(404).end();
        });
        readStream.pipe(response);
    };

    /**
     * Pipes the contents of the file to the request object and sets the
     * 200 status code and all necessary headers to indicate support for ranges.
     * @param mimetype the mimetype of the file
     * @param readStream a readable stream of the file (at the start position)
     * @param response the Express response object (a writable stream)
     * @param contentLength the total file size of the file
     */
    private pipeStreamToResponse = (
        mimetype: string,
        readStream: Readable,
        response: express.Response,
        contentLength: number,
        additionalHeaders?: { [key: string]: string }
    ): void => {
        response.writeHead(200, {
            ...(additionalHeaders || {}),
            'Content-Type': mimetype,
            'Content-Length': contentLength,
            'Accept-Ranges': 'bytes'
        });

        readStream.on('error', (err) => {
            response.status(404).end();
        });
        readStream.pipe(response);
    };
}
