/**
 * Remove undefined attributes from an object.
 * @param obj object, mutated
 * @returns
 */
export function removeUndefinedAttributes<T>(obj: T): T {
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
            removeUndefinedAttributes(obj[key]);

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
