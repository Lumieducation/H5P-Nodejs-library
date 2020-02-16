import escapeHtml from 'escape-html';

import H5pError from './helpers/H5pError';
import Logger from './helpers/Logger';
import { ITranslationService } from './types';

const log = new Logger('TranslationService');

/**
 * Allows other components to get localizations of string literals.
 */
export default class TranslationService implements ITranslationService {
    /**
     * Initializes the translation service
     * @param {[key: string]: string} fallbackLanguageStrings An object with key-value pairs that consist of ids and translation strings for the ids. The fallback strings will be used if a language string can't be found in the localization.
     * @param {[key: string]: string} localLanguageStrings (optional) An object with key-value pairs that consist of ids and translation strings for the ids.
     */
    constructor(
        private fallbackLanguageStrings: { [key: string]: string },
        private localLanguageStrings?: { [key: string]: string }
    ) {
        log.info(`initialize`);
        this.localLanguageStrings =
            localLanguageStrings || fallbackLanguageStrings;
    }

    /**
     * Used to check if replacement keys conform to the required pattern.
     */
    private replacementKeyRegex: RegExp = /^[a-zA-Z0-9\-]+$/i;

    /**
     * Gets the literal for the identifier and performs replacements of placeholders / variables.
     * @param id The identifier of the literal
     * @param replacements An object with the replacement variables in key-value format.
     * Incidences of any key in this array are replaced with the corresponding value. Based
     * on the replacement marker in the literal, the value is escaped and/or themed:
     *    - !variable inserted as is
     *    - &#064;variable escape plain text to HTML
     *    - %variable escape text to HTML and theme as a placeholder for user-submitted content
     * @returns The literal translated into the language used by the user and with replacements.
     */
    public getTranslation(
        id: string,
        language: string,
        replacements: { [key: string]: string | string[] } = {}
    ): string {
        log.verbose(`getting translation ${id}`);
        let literal = this.getLiteral(id);
        if (literal === '') return '';

        // tslint:disable-next-line: forin
        for (const replacementKey in replacements) {
            // skip keys that can't don't conform to the replacement key schema
            if (!this.replacementKeyRegex.test(replacementKey)) {
                throw new Error(
                    `The replacement key ${replacementKey} is malformed. A replacement key must only contain letters, numbers and hyphens.`
                );
            }

            const replacementValue: string =
                replacements[replacementKey] instanceof Array
                    ? (replacements[replacementKey] as string[]).join(' ')
                    : (replacements[replacementKey] as string);

            literal = literal.replace(
                new RegExp(`@${replacementKey}`, 'g'),
                escapeHtml(replacementValue)
            );
            literal = literal.replace(
                new RegExp(`%${replacementKey}`, 'g'),
                `<em>${escapeHtml(replacementValue)}</em>`
            );
            literal = literal.replace(
                new RegExp(`!${replacementKey}`, 'g'),
                replacementValue
            );
        }
        return literal;
    }

    public translateExceptions<T>(func: () => T, language: string): T {
        let returnValue: T;
        try {
            returnValue = func();
        } catch (error) {
            if (error instanceof H5pError) {
                error.message = this.getTranslation(
                    error.errorId,
                    language,
                    error.replacements
                );
            }
            throw error;
        }
        return returnValue;
    }

    /**
     * Returns a localized language string. Falls back to the neutral language if a language string is not present in the localization.
     * @param {string} id The id of the language string to get.
     * @returns {string} The localized language string or an empty string if there is no localization and fallback value.
     */
    private getLiteral(id: string): string {
        log.debug(`getting literal ${id}`);
        return (
            this.localLanguageStrings[id] ||
            this.fallbackLanguageStrings[id] ||
            ''
        );
    }
}
