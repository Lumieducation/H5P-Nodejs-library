import { JSONPath } from 'jsonpath-plus';
import { ILogicCheck } from './types';

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
 */
const evaluateLogicCheckRec = (check: ILogicCheck, obj: any): boolean => {
    return Object.keys(check).every((property) => {
        if (!property.startsWith('$')) {
            throw new Error(
                `Expression ${property} is not a JSON path or a query. It must start with $.`
            );
        }
        if (property === '$and') {
            if (!Array.isArray(check[property])) {
                throw new Error('$and requires an array');
            }
            return (check[property] as ILogicCheck[]).every((c) =>
                evaluateLogicCheckRec(c, obj)
            );
        }
        if (property === '$or') {
            if (!Array.isArray(check[property])) {
                throw new Error('$or requires an array');
            }
            return (check[property] as ILogicCheck[]).some((c) =>
                evaluateLogicCheckRec(c, obj)
            );
        }
        if (property === '$not') {
            return evaluateLogicCheckRec(check[property], obj);
        }
        if (property === '$nor') {
            if (
                !Array.isArray(check[property] || check[property].length !== 2)
            ) {
                throw new Error('$nor requires an array with two entry');
            }
            return (
                evaluateLogicCheckRec(check[property][0], obj) &&
                !evaluateLogicCheckRec(check[property][1], obj)
            );
        }
        const evaluatedPath = JSONPath({
            path: property,
            json: obj,
            preventEval: true,
            wrap: false
        });
        const secondExpression = check[property];
        if (
            typeof secondExpression === 'boolean' ||
            typeof secondExpression === 'string' ||
            typeof secondExpression === 'number' ||
            Array.isArray(secondExpression)
        ) {
            return compareEquality(evaluatedPath, secondExpression);
        } else if (typeof secondExpression === 'object') {
            if (Object.keys(secondExpression).length !== 1) {
                throw new Error('Error in query: empty object');
            }

            const secondExpressionValue = Object.values(secondExpression)[0];
            let evaluatedSecondExpression;
            if (
                typeof secondExpressionValue === 'boolean' ||
                typeof secondExpressionValue === 'string' ||
                typeof secondExpressionValue === 'number' ||
                Array.isArray(secondExpressionValue)
            ) {
                evaluatedSecondExpression = secondExpressionValue;
            } else if (typeof secondExpressionValue === 'object') {
                evaluatedSecondExpression = JSONPath({
                    path: (secondExpressionValue as any).$query,
                    json: obj,
                    preventEval: true,
                    wrap: false
                });
            } else {
                throw new Error('Unknown type in query');
            }
            switch (Object.keys(secondExpression)[0]) {
                case '$eq':
                    return compareEquality(
                        evaluatedPath,
                        evaluatedSecondExpression
                    );
                case '$gt':
                    return evaluatedPath > evaluatedSecondExpression;
                case '$gte':
                    return evaluatedPath >= evaluatedSecondExpression;
                case '$in':
                    if (!Array.isArray(evaluatedSecondExpression)) {
                        return false;
                    }
                    return (evaluatedSecondExpression as any[]).includes(
                        evaluatedPath
                    );
                case '$lt':
                    return evaluatedPath < evaluatedSecondExpression;
                case '$lte':
                    return evaluatedPath <= evaluatedSecondExpression;
                case '$ne':
                    return !compareEquality(
                        evaluatedPath,
                        evaluatedSecondExpression
                    );
                case '$nin':
                    if (!Array.isArray(evaluatedSecondExpression)) {
                        return false;
                    }
                    return !(evaluatedSecondExpression as any[]).includes(
                        evaluatedPath
                    );
            }
        } else {
            throw new Error('Unknown type in query');
        }
    });
};

/**
 * Check if all the checks apply to the object.
 */
export function checkLogic(obj: any, checks: ILogicCheck[]): boolean {
    return checks.every((c) => evaluateLogicCheckRec(c, obj));
}
