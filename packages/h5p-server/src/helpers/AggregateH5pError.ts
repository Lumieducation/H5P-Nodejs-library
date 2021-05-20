import H5pError from './H5pError';

/**
 * An AggregateH5pError can be used to store error messages if the error that occurred first doesn't mean that
 * the execution has to be stopped stopped right away.
 */
export default class AggregateH5pError extends H5pError {
    /**
     * @param firstError (optional) the first error
     */
    constructor(
        errorId: string,
        replacements: { [key: string]: string },
        httpStatusCode: number,
        debugMessage: string,
        clientErrorId?: string
    ) {
        super(
            errorId,
            replacements,
            httpStatusCode,
            debugMessage,
            clientErrorId
        );
        Object.setPrototypeOf(this, new.target.prototype); // need to restore the prototype chain
    }

    private errors: H5pError[] = [];

    /**
     * Adds a message to the object. You can add as many messages as you want.
     */
    public addError(error: H5pError): AggregateH5pError {
        this.errors.push(error);
        this.message = `${this.errorId}:${this.getErrors()
            .map((e) => e.message)
            .sort()
            .join(',')}`;
        return this;
    }

    /**
     * Returns the errors added by addError(...).
     * @returns the errors
     */
    public getErrors(): H5pError[] {
        return this.errors;
    }

    /**
     * Checks if any errors were added to the error.
     * @returns true of any errors were added.
     */
    public hasErrors(): boolean {
        return this.errors.length > 0;
    }
}
