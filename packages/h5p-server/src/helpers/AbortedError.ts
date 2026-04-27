/**
 * Represents an error thrown when an operation is aborted via cooperative
 * cancellation (AbortController/AbortSignal). This error is used internally
 * to signal that a long-running operation (such as library installation)
 * should stop and clean up because the maximum occupation time was exceeded.
 *
 * This error type allows the calling code to distinguish between abort-related
 * errors and other types of failures, enabling proper cleanup handling without
 * duplicate cleanup attempts.
 */
export default class AbortedError extends Error {
    constructor() {
        super('aborted');
        this.name = 'AbortedError';
        Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
    }
}
