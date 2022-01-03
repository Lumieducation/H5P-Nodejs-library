import { JSONPath } from 'jsonpath-plus';
import { ILogicCheck } from './types';

export default class LogicChecker {
    check(
        params: any,
        userSubmittedContent: any,
        checks: ILogicCheck[]
    ): boolean {
        return false;
    }
}
