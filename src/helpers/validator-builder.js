/**
 * A ValidationError is an error object that is thrown when the validation of an object
 * failed and can't be continued. ValidationError can also be used to store error messages
 * if the error that occurred during validation doesn't mean that the validation has to be
 * stopped right away. In this case the ValidationError is created, messages are added to it
 * and it is thrown later.
 */
class ValidationError extends Error {
    /**
     * @param {string} message The first error message  
     */
    constructor(message) {
        super(message);

        this._errors = [];
        if (message) {
            this.addError(message);
        }

    }

    /**
     * Adds a message to the object. You can add as many messages as you want.
     * @param {*} message 
     */
    addError(message) {
        this._errors.push(message);
        this.message = this.getErrors().join("\n");
        return this;
    }

    /**
     * Returns the messages added by addError(...).
     * @returns {string[]} the messages
     */
    getErrors() {
        return this._errors;
    }

    /**
     * True if any errors were added to the error.
     * @returns {boolean} 
     */
    hasErrors() {
        return this._errors.length > 0;
    }
}

/**
 * This rule throws the ValidationError object passed to it if there are any messages in it.
 * @param {any} data The data (ignored by this rule)
 * @param {ValidationError} error The error to throw if there are any
 * @returns {any} the unchanged data object
 */
function throwErrorsNowRule(data, error) {
    if (error.hasErrors())
        throw error;
    return data;
}

/**
 * A ValidatorBuilder can be used to chain validation rules by calling addRule(...) multiple times
 * and by starting the validation by calling validate(...). The ValidatorBuilder then calls
 * each rule in the order they were added. 
 *
 * Each validation rule is a function that requires two parameters: 
 *   - a content object
 *   - an error object
 * 
 * The content object contains the content that should be validated. Typically this content object
 * is also returned by the validation rule as it is passed on as the first paramter to the next rule.
 * In some cases rules can return a different (or mutated) content object if transformations are
 * necessary. 
 * 
 * The error object is of type ValidationError and is used to report back errors to the caller of
 * validate. (Every call to validate should be wrapped in a try-catch block). To cover cases
 * in which the validation process doesn't have to be interrupted if there is a validation error
 * the rule can call error.addError(...) to append another error message to the error object.
 * The error object has to be thrown later, e.g. by adding the throwErrorsNowRule to the builder.
 * If validation needs to be stopped right away, the rule function should throw the error object
 * passed to it (it should not create a new error object because there might be other messages
 * in the error object already).
 */
class ValidatorBuilder {
    constructor() {
        this._rules = [];
    }

    /**
     * Adds a rule to the validator. Chain this method together to create complex validators.
     * @param {(content: any, error: ValidationError) => any} rule rule to add
     * @returns {ValidatorBuilder}
     */
    addRule(rule) {
        this._rules.push(rule);
        return this;
    }

    /**
     * Adds a rule to the validator if the condition is met. 
     * Chain this method together to create complex validators.
     * @param {(content: any, error: ValidationError) => any} rule rule to add
     * @param {boolean} condition the condition (rule is added if it is true)
     * @returns {ValidatorBuilder} 
     */
    addRuleWhen(rule, condition) {
        if (condition) {
            return this.addRule(rule);
        }
        return this;
    }

    /**
     * Executes the validation.
     * @param {any} data The data to validate. This parameters is passed to the first rule as the first parameter.
     * @param {ValidationError} error an optional error object. A new one is created if none is passed in here.
     * @returns {any} Returns the object that is returned by the last rule if everything is valid or throws a ValidationError if not
     */
    async validate(data, error = new ValidationError()) {
        for (const rule of this._rules) {
            // promises need to be called iteratively here as validation has to occur step by step
            // eslint-disable-next-line no-await-in-loop
            data = await rule(data, error);
        }
        return data;
    }
}

module.exports = {
    ValidatorBuilder,
    ValidationError,
    throwErrorsNowRule
};