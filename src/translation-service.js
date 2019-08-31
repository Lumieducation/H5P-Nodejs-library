const escapeHtml = require('escape-html');

/**
 * Allows other components to get localizations of string literals.
 */
class TranslationService {
    /**
     * Initializes the translation service
     * @param {[key: string]: string} fallbackLanguageStrings An object with key-value pairs that consist of ids and translation strings for the ids. The fallback strings will be used if a language string can't be found in the localization.
     * @param {[key: string]: string} localLanguageStrings (optional) An object with key-value pairs that consist of ids and translation strings for the ids. 
     */
    constructor(fallbackLanguageStrings, localLanguageStrings) {
        this._fallbackLanguageStrings = fallbackLanguageStrings;
        this._localLanguageStrings = localLanguageStrings || fallbackLanguageStrings;

        /**
        * Used to check if replacement keys conform to the required pattern.
        */
        this._replacementKeyRegex = /(!|@|%)[a-z0-9-]+/i;
    }

    /**
     * Returns a localized language string. Falls back to the neutral language if a language string is not present in the localization.
     * @param {string} id The id of the language string to get.
     * @returns {string} The localized language string or an empty string if there is no localization and fallback value.
     */
    _getLiteral(id) {
        return this._localLanguageStrings[id]
            || this._fallbackLanguageStrings[id]
            || "";
    }

    /**
     * Gets the literal for the identifier and performs replacements of placeholders / variables.
     * @param {string} id The identifier of the literal
     * @param {[key: string]: string} replacements An object with the replacement variables in key-value format.
     * Incidences of any key in this array are replaced with the corresponding value. Based
     * on the first character of the key, the value is escaped and/or themed:
     *    - !variable inserted as is
     *    - &#064;variable escape plain text to HTML
     *    - %variable escape text to HTML and theme as a placeholder for user-submitted content
     * @returns The literal translated into the language used by the user and with replacements.
     */
    getTranslation(id, replacements = {}) {
        let literal = this._getLiteral(id);
        if (literal === "")
            return "";

        // eslint-disable-next-line guard-for-in, no-restricted-syntax
        for (const replacementKey in replacements) {
            // skip keys that don't can't be replaced with regex
            if (!this._replacementKeyRegex.test(replacementKey)) {
                throw new Error(`The replacement key ${replacementKey} is malformed. A replacement key must start with one of these characters:!@%`);

            }

            let valueToPutIn;
            if (replacementKey[0] === "@") {
                valueToPutIn = escapeHtml(replacements[replacementKey]);
            }
            else if (replacementKey[0] === "%") {
                valueToPutIn = `<em>${escapeHtml(replacements[replacementKey])}</em>`;
            }
            else if (replacementKey[0] === "!") {
                valueToPutIn = replacements[replacementKey];
            }
            else {
                throw new Error(`The replacement key ${replacementKey} is malformed. A replacement key must start with one of these characters:!@%`);
            }

            literal = literal.replace(new RegExp(replacementKey, "g"), valueToPutIn);
        }
        return literal;
    }
}

module.exports = TranslationService;