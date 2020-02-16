import H5pError from './H5pError';

/**
 * An AggregateH5pError can be used to store error messages if the error that occurred first doesn't mean that
 * the execution has to be stopped stopped right away.
 */
export default class AggregateH5pError extends Error {
    /**
     * @param error (optional) the first error
     */
    constructor(error?: H5pError) {
        super('');
        Object.setPrototypeOf(this, new.target.prototype); // needed to restore the prototype chain

        if (error !== undefined) {
            this.addError(error);
        }
    }

    private errors: H5pError[] = [];

    /**
     * Adds a message to the object. You can add as many messages as you want.
     */
    public addError(error: H5pError): AggregateH5pError {
        this.errors.push(error);
        this.message = this.getErrors().join(' ');
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
