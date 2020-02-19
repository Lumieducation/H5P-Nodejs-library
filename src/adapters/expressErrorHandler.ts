import AggregateH5pError from '../helpers/AggregateH5pError';
import AjaxErrorResponse from '../helpers/AjaxErrorResponse';
import H5pError from '../helpers/H5pError';

export default function errorHandler(err, req, res, next) {
    let statusCode = 500;
    let statusText = '';

    if (err instanceof H5pError) {
        statusCode = err.httpStatusCode;
        statusText = req.t(err.errorId, err.replacements);
    } else if (err instanceof AggregateH5pError) {
        statusCode = 400;
        statusText = err
            .getErrors()
            .map(e => req.t(e.errorId, e.replacements))
            .join('\n');
    } else {
        statusText = err.message;
    }
    res.status(statusCode).json(
        new AjaxErrorResponse('', statusCode, statusText)
    );
}
