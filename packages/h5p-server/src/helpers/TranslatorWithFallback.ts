import { ITranslationFunction } from '../types';
import Logger from './Logger';

const log = new Logger('TranslatorWithFallback');

/**
 * Performs localizations with a custom fallback strategy: It tries all the
 * namespaces specified in the tryLocalize(...) call or in the constructor (in
 * the order of the list). If no localization was found, it will fallback to the
 * source string passed to tryLocalize.
 */
export default class TranslatorWithFallback {
    /**
     *
     */
    constructor(
        private translationCallback: ITranslationFunction,
        private namespaces: string[] = []
    ) {}

    /**
     * Tries localizing the key. If it fails (indicated by the fact that the key
     * is part of the localized string), it will return the original source
     * string. Tries through all the namespaces specified before falling back.
     * @param key the key to look up the translation in the i18n data
     * @param sourceString the original English string received from the Hub
     * @param language the desired language
     * @param namespaces (optional) the namespaces to try. Will default to the
     * namespaces passed into the constructor if unspecified.
     * @returns the localized string or the original English source string
     */
    public tryLocalize(
        key: string,
        sourceString: string,
        language: string,
        namespaces?: string[]
    ): string {
        log.debug(`Trying to localize key ${key} into ${language}`);
        for (const namespace of namespaces ?? this.namespaces) {
            log.debug(`Trying namespace ${namespace}`);
            const localized = this.translationCallback(
                `${namespace}:${key}`,
                language
            );

            if (!localized.includes(key)) {
                log.debug(`Successfully localized to ${localized}`);
                return localized;
            }
        }
        log.debug(`Falling back to default string: ${sourceString}`);
        return sourceString;
    }
}
