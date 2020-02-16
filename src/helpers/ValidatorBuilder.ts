import AggregateH5pError from './AggregateH5pError';

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
export class ValidatorBuilder {
    constructor() {
        this.rules = [];
    }

    private rules: ((content: any, error: AggregateH5pError) => any)[];

    /**
     * Adds a rule to the validator. Chain this method together to create complex validators.
     * @param {(content: any, error: AggregateH5pError) => any} rule rule to add
     * @returns {ValidatorBuilder}
     */
    public addRule(
        rule: (content: any, error: AggregateH5pError) => any
    ): ValidatorBuilder {
        this.rules.push(rule);
        return this;
    }

    /**
     * Adds a rule to the validator if the condition is met.
     * Chain this method together to create complex validators.
     * @param {(content: any, error: AggregateH5pError) => any} rule rule to add
     * @param {boolean} condition the condition (rule is added if it is true)
     * @returns {ValidatorBuilder}
     */
    public addRuleWhen(
        rule: (content: any, error: AggregateH5pError) => any,
        condition: boolean
    ): ValidatorBuilder {
        if (condition) {
            return this.addRule(rule);
        }
        return this;
    }

    /**
     * Executes the validation.
     * @param {any} data The data to validate. This parameters is passed to the first rule as the first parameter.
     * @param {AggregateH5pError} error an optional error object. A new one is created if none is passed in here.
     * @returns {Promise<any>} Returns the object that is returned by the last rule if everything is valid or throws a ValidationError if not
     */
    public async validate(
        data: any,
        error: AggregateH5pError = new AggregateH5pError()
    ): Promise<any> {
        let returnValue = data;
        for (const rule of this.rules) {
            // promises need to be called iteratively here as validation has to occur step by step
            returnValue = await rule(returnValue, error);
        }
        return returnValue;
    }
}

/**
 * This rule throws the ValidationError object passed to it if there are any messages in it.
 * @param {any} data The data (ignored by this rule)
 * @param {AggregateH5pError} error The error to throw if there are any
 * @returns {any} the unchanged data object
 */
export function throwErrorsNowRule(data: any, error: AggregateH5pError): any {
    if (error.hasErrors()) {
        throw error;
    }
    return data;
}
