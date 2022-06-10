import {
    AggregateH5pError,
    AjaxErrorResponse,
    H5pError,
    Logger
} from '@lumieducation/h5p-server';
import { Request, Response, NextFunction } from 'express';

const log = new Logger('h5p-express');

export function undefinedOrTrue(option: boolean): boolean {
    return option === undefined || option;
}

/**
 * Calls the function passed to it and catches errors it throws. These errors
 * are then passed to the next(...) function for proper error handling.
 * You can disable error catching by setting options.handleErrors to false
 * @param fn The function to call
 * @param handleErrors whether to handle errors
 */
export const catchAndPassOnErrors =
    (
        fn: (req: Request, res: Response, next?: NextFunction) => Promise<any>,
        handleErrors: boolean
    ) =>
    async (req: Request, res: Response, next: NextFunction): Promise<any> => {
        if (undefinedOrTrue(handleErrors)) {
            try {
                return await fn(req, res);
            } catch (error) {
                return next(error);
            }
        }
        return fn(req, res);
    };

/**
 * An Express middleware that converts NodeJs error objects into error
 * responses the H5P client can understand. Add this middleware as the last
 * entry in your express application and make sure all routes don't throw errors
 * but pass them to the next(...) function. (You must do this manually in async functions!)
 * @param languageOverride the language to use when returning errors.
 * Only has an effect if you use the i18next http middleware, as it relies on
 * req.i18n.changeLanguage to be present. Defaults to auto, which means the
 * a language detector must have detected language and req.t translated to the
 * detected language.
 */ export function errorHandler(languageOverride: string | 'auto' = 'auto') {
    return async (
        err: Error | H5pError | AggregateH5pError,
        req: Request & { t: any; i18n: any },
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        let statusCode = 500;
        let statusText = '';
        let detailsList;
        let clientErrorId = '';

        if (err instanceof H5pError) {
            if (
                req.t &&
                req.i18n &&
                languageOverride &&
                languageOverride !== 'auto'
            ) {
                await req.i18n.changeLanguage(languageOverride);
            }
            statusCode = err.httpStatusCode;
            statusText =
                req.t === undefined
                    ? err.errorId
                    : req.t(err.errorId, err.replacements);
            clientErrorId = err.clientErrorId || '';

            log.debug(`H5PError: ${statusCode} - ${statusText}`);
            log.debug(err.stack);

            if (err instanceof AggregateH5pError) {
                detailsList = err.getErrors().map((e) => ({
                    code: e.errorId,
                    message:
                        req.t === undefined
                            ? e.errorId
                            : req.t(e.errorId, e.replacements)
                }));
            }
        } else {
            log.error('An unexpected error occurred:');
            log.error(err.message);
            log.error(err.stack);
            statusText = err.message;
        }
        res.status(statusCode).json(
            new AjaxErrorResponse(
                clientErrorId,
                statusCode,
                statusText,
                detailsList
            )
        );
    };
}
