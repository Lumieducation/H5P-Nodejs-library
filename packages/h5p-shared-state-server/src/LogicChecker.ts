import { JSONPath } from 'jsonpath-plus';
import debug from 'debug';

import { ILogicalOperator, ILogicCheck } from './types';

const log = debug('h5p:SharedStateServer:LogicChecker');

/**
 * Compares two entities for equality using == and also checking arrays.
 *
 * If a and b are both arrays, their entries are compared (shallow compare).
 * Equality means same value for everything expect object and same reference
 * for objects.
 */
const compareEquality = (a: any | any[], b: any | any[]): boolean => {
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a == null || b == null) return false;
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; ++i) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    }
    return a == b;
};

/**
 * Recursively goes through checks and evaluates the object against them.
 * @param check the logic check or a logical expression containing logic checks
 * @param the data object to check
 * @throws an error if there are malformed checks
 */
const evaluateLogicCheckRec = (
    check: ILogicCheck | ILogicalOperator,
    obj: any
): boolean => {
    const logErrorAndReturn = (result: boolean): boolean => {
        if (!result) {
            log('Failed check: %O', check);
            log('Data object: %O', obj);
        }
        return result;
    };

    return Object.keys(check).every((property) => {
        // Check for syntax errors
        if (!property.startsWith('$')) {
            throw new Error(
                `Expression "${property}" is not a JSON path or a query. It must start with $.`
            );
        }

        // Logic operators
        if (property === '$and') {
            if (!Array.isArray(check[property])) {
                throw new Error('$and requires an array as argument');
            }
            return logErrorAndReturn(
                (check[property] as ILogicCheck[]).every((c) =>
                    evaluateLogicCheckRec(c, obj)
                )
            );
        }
        if (property === '$or') {
            if (!Array.isArray(check[property])) {
                throw new Error('$or requires an array as argument');
            }
            return logErrorAndReturn(
                (check[property] as ILogicCheck[]).some((c) =>
                    evaluateLogicCheckRec(c, obj)
                )
            );
        }
        if (property === '$not') {
            return logErrorAndReturn(
                !evaluateLogicCheckRec(check[property], obj)
            );
        }
        if (property === '$defined') {
            if (!Object.keys((check as ILogicalOperator).$defined.$query)) {
                throw new Error(
                    '$defined must have a $query object as argument'
                );
            }
            return logErrorAndReturn(
                JSONPath({
                    path: (check as ILogicalOperator).$defined.$query,
                    json: obj,
                    preventEval: true,
                    wrap: false
                }) !== undefined
            );
        }
        if (property === '$nor') {
            if (
                !Array.isArray(check[property] || check[property].length !== 2)
            ) {
                throw new Error(
                    '$nor requires an array with two entries as argument'
                );
            }
            return logErrorAndReturn(
                !evaluateLogicCheckRec(check[property][0], obj) &&
                    !evaluateLogicCheckRec(check[property][1], obj)
            );
        }

        // If we are here, the expression in the property must be a JSON path
        // that we have to query
        const evaluatedPath = JSONPath({
            path: property,
            json: obj,
            preventEval: true,
            wrap: false
        });

        // Evaluate the argument
        const argument = check[property];

        // If the argument is a literal, we compare equality
        if (
            typeof argument === 'boolean' ||
            typeof argument === 'string' ||
            typeof argument === 'number' ||
            Array.isArray(argument)
        ) {
            return logErrorAndReturn(compareEquality(evaluatedPath, argument));
        }
        // If the argument is an object, we have to evaluate it as it is a
        // query
        else if (typeof argument === 'object') {
            if (Object.keys(argument).length !== 1) {
                throw new Error('Error in query: empty object');
            }
            const argumentValue = Object.values(argument)[0];

            // We evaluated the value of the argument depending on what it is:
            // - $query arguments are always JSON path, so we can evaluate the
            //   JSON path
            // - literals can stay as they are
            // - objects are nested queries
            let evaluatedArgument: string | number | boolean | any[];
            if (Object.keys(argument)[0] === '$query') {
                evaluatedArgument = JSONPath({
                    path: argumentValue as string,
                    json: obj,
                    preventEval: true,
                    wrap: false
                });
                return logErrorAndReturn(
                    compareEquality(evaluatedPath, evaluatedArgument)
                );
            } else if (
                typeof argumentValue === 'boolean' ||
                typeof argumentValue === 'string' ||
                typeof argumentValue === 'number' ||
                Array.isArray(argumentValue)
            ) {
                evaluatedArgument = argumentValue;
            } else if (typeof argumentValue === 'object') {
                evaluatedArgument = JSONPath({
                    path: (argumentValue as any).$query,
                    json: obj,
                    preventEval: true,
                    wrap: false
                });
            } else {
                throw new Error('Unknown type in query');
            }

            // Equality operators
            switch (Object.keys(argument)[0]) {
                case '$eq':
                    return logErrorAndReturn(
                        compareEquality(evaluatedPath, evaluatedArgument)
                    );
                case '$gt':
                    return logErrorAndReturn(evaluatedPath > evaluatedArgument);
                case '$gte':
                    return logErrorAndReturn(
                        evaluatedPath >= evaluatedArgument
                    );
                case '$in':
                    // In also functions as the equality $eq if both values are
                    // literals. The reason is that we unwrap JSON queries into
                    // literals.
                    if (evaluatedPath === undefined) {
                        return true;
                    }
                    if (!Array.isArray(evaluatedArgument)) {
                        if (!Array.isArray(evaluatedPath)) {
                            return logErrorAndReturn(
                                evaluatedPath == evaluatedArgument
                            );
                        }
                        return logErrorAndReturn(false);
                    }

                    if (!Array.isArray(evaluatedPath)) {
                        return logErrorAndReturn(
                            (evaluatedArgument as any[]).includes(evaluatedPath)
                        );
                    } else {
                        return logErrorAndReturn(
                            evaluatedPath.every((p) =>
                                (evaluatedArgument as any[]).includes(p)
                            )
                        );
                    }
                case '$lt':
                    return logErrorAndReturn(evaluatedPath < evaluatedArgument);
                case '$lte':
                    return logErrorAndReturn(
                        evaluatedPath <= evaluatedArgument
                    );
                case '$ne':
                    return logErrorAndReturn(
                        !compareEquality(evaluatedPath, evaluatedArgument)
                    );
                case '$nin':
                    if (!Array.isArray(evaluatedArgument)) {
                        return logErrorAndReturn(false);
                    }
                    if (!Array.isArray(evaluatedPath)) {
                        return logErrorAndReturn(
                            !(evaluatedArgument as any[]).includes(
                                evaluatedPath
                            )
                        );
                    } else {
                        return logErrorAndReturn(
                            evaluatedPath.every(
                                (p) => !(evaluatedArgument as any[]).includes(p)
                            )
                        );
                    }
            }
        } else {
            throw new Error('Unknown type in query');
        }
    });
};

/**
 * Check if all the checks apply to the object.
 */
export function checkLogic(
    obj: any,
    checks: (ILogicCheck | ILogicalOperator)[]
): boolean {
    return checks.every((c) => evaluateLogicCheckRec(c, obj));
}
