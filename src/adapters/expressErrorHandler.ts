import AggregateH5pError from '../helpers/AggregateH5pError';
import AjaxErrorResponse from '../helpers/AjaxErrorResponse';
import H5pError from '../helpers/H5pError';
import { Response, NextFunction } from 'express';
import { IRequestWithTranslator } from '../';

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
 */
export default (languageOverride: string | 'auto' = 'auto') => {
    return async (
        err: Error | H5pError | AggregateH5pError,
        req: IRequestWithTranslator,
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

            if (err instanceof AggregateH5pError) {
                detailsList = err.getErrors().map((e) => {
                    return {
                        code: e.errorId,
                        message:
                            req.t === undefined
                                ? e.errorId
                                : req.t(e.errorId, e.replacements)
                    };
                });
            }
        } else {
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
};
