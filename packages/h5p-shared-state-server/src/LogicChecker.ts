import { JSONPath } from 'jsonpath-plus';
import { ILogicCheck } from './types';

export default class LogicChecker {
    check(params: any, data: any, checks: ILogicCheck[]): boolean {
        const obj = { params, data };
        return checks.every((c) => this.evaluateLogicCheck(c, obj));
    }

    evaluateLogicCheck = (check: ILogicCheck, obj: any): boolean => {
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
                    this.evaluateLogicCheck(c, obj)
                );
            }
            if (property === '$or') {
                if (!Array.isArray(check[property])) {
                    throw new Error('$or requires an array');
                }
                return (check[property] as ILogicCheck[]).some((c) =>
                    this.evaluateLogicCheck(c, obj)
                );
            }
            if (property === '$not') {
                return this.evaluateLogicCheck(check[property], obj);
            }
            if (property === '$nor') {
                if (
                    !Array.isArray(
                        check[property] || check[property].length !== 2
                    )
                ) {
                    throw new Error('$nor requires an array with two entry');
                }
                return (
                    this.evaluateLogicCheck(check[property][0], obj) &&
                    !this.evaluateLogicCheck(check[property][1], obj)
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
                return this.compareEquality(evaluatedPath, secondExpression);
            } else if (typeof secondExpression === 'object') {
                if (Object.keys(secondExpression).length !== 1) {
                    throw new Error('Error in query: empty object');
                }

                const secondExpressionValue =
                    Object.values(secondExpression)[0];
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
                        return this.compareEquality(
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
                        return !this.compareEquality(
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

    compareEquality = (a: any | any[], b: any | any[]): boolean => {
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
}
