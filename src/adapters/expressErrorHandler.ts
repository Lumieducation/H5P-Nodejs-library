import AggregateH5pError from '../helpers/AggregateH5pError';
import AjaxErrorResponse from '../helpers/AjaxErrorResponse';
import H5pError from '../helpers/H5pError';

/**
 * An Express middleware that converts NodeJs error objects into error
 * responses the H5P client can understand. Add this middleware as the last
 * entry in your express application and make sure all routes don't throw errors
 * but pass them to the next(...) function. (You must do this manually in async functions!)
 */
export default function errorHandler(
    err: Error | H5pError | AggregateH5pError,
    req: any,
    res: any,
    next: any
): void {
    let statusCode = 500;
    let statusText = '';
    let detailsList;
    let clientErrorId = '';

    if (err instanceof H5pError) {
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
}
