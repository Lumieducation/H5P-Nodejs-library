/**
 * Remove undefined attributes from an object and empty objects.
 * Example:
 * ```json
 * {
 *   a: undefined,
 *   b: 'some string',
 *   c: {
 *     d: undefined
 *   }
 * }
 * ```
 *
 * will be transformed to:
 *
 * ```json
 * {
 *   b: 'some string'
 * }
 * ```
 * @param obj object, mutated
 * @returns
 */
export function removeUndefinedAttributesAndEmptyObjects<T>(obj: T): T {
    // Base case: if the input is not an object, stop the recursion
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }

    // Iterate over the object's keys
    for (const key in obj) {
        // Remove the key if its value is undefined
        if (obj[key] === undefined) {
            delete obj[key];
        } else {
            // Recursively process nested objects or arrays
            removeUndefinedAttributesAndEmptyObjects(obj[key]);

            if (
                typeof obj[key] === 'object' &&
                obj[key] !== null &&
                Object.keys(obj[key]).length === 0
            ) {
                delete obj[key];
            }
        }
    }
    return obj;
}
