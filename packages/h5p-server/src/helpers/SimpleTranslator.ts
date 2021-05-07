type NestedStructure = string | { [key: string]: NestedStructure };

/**
 * This class performs translations using a simple object with string keys as
 * a place to look up the translations. Can be used in tests and as a fallback
 * when the implementation does not pass a translation function.
 * Uses namespaces but does not support multiple languages.
 */
export default class SimpleTranslator {
    /**
     * @param translationStrings an object containing all relevant translation strings
     * sorted by namespaces
     */
    constructor(
        private translationStrings:
            | {
                  [namespace: string]: { [key: string]: NestedStructure };
              }
            | { [key: string]: NestedStructure }
    ) {}

    /**
     * Translates a string using the key (identified).
     * @params key the key with optional namespace separated by a colon (e.g. namespace:key)
     * @returns the translated string
     * @memberof SimpleTranslator
     */
    public t = (key: string): string => {
        const matches = /^(.+):(.+)$/.exec(key);
        if (matches.length > 0) {
            return this.translationStrings[matches[1]][matches[2]] ?? key;
        }
        return this.translationStrings[key] as string;
    };
}
