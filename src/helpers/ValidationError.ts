import H5pError from './H5pError';

/**
 * A ValidationError is an error object that is thrown when the validation of an object
 * failed and can't be continued. ValidationError can also be used to store error messages
 * if the error that occurred during validation doesn't mean that the validation has to be
 * stopped right away. In this case the ValidationError is created, messages are added to it
 * and it is thrown later.
 */
export default class ValidationError extends H5pError {
    /**
     * @param {string} message The first error message
     */
    constructor(message?: string) {
        if (message) {
            super(message);
        }

        this.errors = [];
        if (message) {
            this.addError(message);
        }
    }

    private errors: any[];

    /**
     * Adds a message to the object. You can add as many messages as you want.
     * @param {*} message
     */
    public addError(message: any): ValidationError {
        this.errors.push(message);
        this.message = this.getErrors().join('\n');
        return this;
    }

    /**
     * Returns the messages added by addError(...).
     * @returns {string[]} the messages
     */
    public getErrors(): string[] {
        return this.errors;
    }

    /**
     * True if any errors were added to the error.
     * @returns {boolean}
     */
    public hasErrors(): boolean {
        return this.errors.length > 0;
    }
}
