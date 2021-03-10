import Logger from './helpers/Logger';

const log = new Logger('SemanticsLocalizer');

/**
 * Scans a semantic structure and localizes the label, placeholder
 * and description fields. You can also localize all fields by
 * passing the respective option.
 */
export default class SemanticsLocalizer {
    constructor(private t: (key: string, language: string) => string) {
        log.info('initialize');
    }

    private localizableFields: string[] = [
        'label',
        'placeholder',
        'description'
    ];

    /**
     * Localizes all localizable fields in the semantic structure.
     * @param semantics the semantics object
     * @param language the language to localize to
     * @param localizeAllFields true if not only label, placeholder and description should be localized but all fields
     * @returns a copy of the semantic structure with localized fields
     */
    public localize(
        semantics: any,
        language: string,
        localizeAllFields?: boolean
    ): any {
        return this.walkSemanticsRecursive(
            semantics,
            language,
            localizeAllFields
        );
    }

    private walkSemanticsRecursive(
        semantics: any,
        language: string,
        localizeAllFields?: boolean
    ): any {
        let copy = Array.isArray(semantics) ? [] : {};
        if (Object.keys(semantics).length === 0) {
            copy = semantics;
        } else {
            for (const field in semantics) {
                if (
                    (this.localizableFields.includes(field) &&
                        typeof semantics[field] === 'string') ||
                    localizeAllFields
                ) {
                    const translated = this.t(semantics[field], language);
                    log.debug(
                        `Replacing "${semantics[field]}" with "${translated}"`
                    );
                    copy[field] = translated;
                } else if (typeof semantics[field] === 'object') {
                    copy[field] = this.walkSemanticsRecursive(
                        semantics[field],
                        language,
                        localizeAllFields
                    );
                } else {
                    copy[field] = semantics[field];
                }
            }
        }

        return copy;
    }
}
