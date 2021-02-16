import { IAjaxResponse } from '../types';

/**
 * A response that can be sent back to the H5P client when something went wrong.
 */
export default class AjaxErrorResponse implements IAjaxResponse {
    /**
     *
     * @param errorCode an error code that can be understood by the H5P client
     * @param httpStatusCode the HTTP status code
     * @param message The message displayed to the user. Should be localized if possible.
     * @param details (optional) Further text displayed to the user. Should be localized if possible.
     */
    constructor(
        public errorCode: string,
        public httpStatusCode: number,
        public message: string,
        public details?: string
    ) {}

    public success: boolean = false;
}
