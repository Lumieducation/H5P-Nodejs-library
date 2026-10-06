/**
 * Checks that the translations in packages/h5p-server/assets/translations are
 * structurally identical to the English source file of their namespace
 * (`en.json`, or `.en.json` in namespaces whose source is generated or hidden
 * from the language list, like `hub`).
 *
 * Plural forms (`_zero`, `_one`, `_two`, `_few`, `_many`, `_other`) that the
 * source doesn't define are allowed, because languages differ in their plural
 * categories.
 *
 * - Errors (exit code 1): the file is not valid JSON, has keys that don't exist
 *   in the source (e.g. because a key was renamed or removed), has a different
 *   type than the source at some position (object vs. string), or doesn't use
 *   the same {{placeholders}} and `:tokens` (replaced by the H5P core JS, e.g.
 *   `:num`) as the source.
 * - Warnings (exit code unaffected): keys that exist in the source but are
 *   missing or empty in the translation, i.e. translations still to do.
 *
 * Usage: ts-node scripts/check-translations.ts [namespace...] [--locale=de,fr]
 * Without arguments all namespaces and all locales are checked.
 */

/// <reference types="node" />

import * as path from 'path';
import { readdir, readFile } from 'fs/promises';

const translationsDirectory = path.resolve(
    'packages/h5p-server/assets/translations'
);
const sourceFileNames = ['en.json', '.en.json'];

type Json = string | { [key: string]: Json };

const isObject = (value: any): value is { [key: string]: any } =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const pluralSuffix = /_(zero|one|two|few|many|other)$/;

/**
 * Finds a plural form of the same key in the source. i18next plural forms
 * differ between languages (e.g. Russian needs `_few` and `_many`), so a
 * translation may contain plural keys the English source doesn't have, as long
 * as the source has some plural form of the same key.
 * @param key the key of the translation (with plural suffix)
 * @param source the source object the key is compared to
 * @returns the key of a plural form in the source or undefined
 */
const findPluralSibling = (
    key: string,
    source: { [key: string]: any }
): string | undefined => {
    if (!pluralSuffix.test(key)) {
        return undefined;
    }
    const base = key.replace(pluralSuffix, '');
    return Object.keys(source).find(
        (k) => pluralSuffix.test(k) && k.replace(pluralSuffix, '') === base
    );
};

/**
 * Extracts the i18next placeholders of a string, e.g. `{{name}}`.
 * @param text the string to analyze
 * @param ignoreCount whether to leave out `{{count}}`; singular plural forms
 * (`_zero`, `_one`, `_two`) may spell out the number in words
 * @returns the sorted placeholders joined by spaces
 */
const getPlaceholders = (text: string, ignoreCount: boolean): string =>
    (text.match(/{{[^}]+}}/g) ?? [])
        .map((p) => p.replace(/\s/g, ''))
        .filter((p) => !(ignoreCount && p === '{{count}}'))
        .sort()
        .join(' ');

/**
 * Extracts the `:token`-style placeholders of a string, e.g. `:num` or
 * `:title`. These are substituted by the H5P core JS in the browser and must
 * stay untranslated.
 * @param text the string to analyze
 * @returns the sorted tokens joined by spaces
 */
const getColonTokens = (text: string): string =>
    (text.match(/(?<![\w:/]):[a-zA-Z]\w*/g) ?? []).sort().join(' ');

const describeType = (value: any): string =>
    isObject(value) ? 'object' : Array.isArray(value) ? 'array' : typeof value;

/**
 * Recursively compares a translation with the source.
 * @param source the source (English) node
 * @param translation the translated node
 * @param keyPath the path of the node, used in messages
 * @param errors is filled with structural incompatibilities
 * @param warnings is filled with missing translations
 */
const compare = (
    source: Json,
    translation: any,
    keyPath: string,
    errors: string[],
    warnings: string[]
): void => {
    if (isObject(source)) {
        if (!isObject(translation)) {
            errors.push(
                `${keyPath}: expected an object, found ${describeType(translation)}`
            );
            return;
        }
        for (const key of Object.keys(source)) {
            const childPath = keyPath ? `${keyPath}.${key}` : key;
            if (!(key in translation)) {
                const sibling = Object.keys(translation).find(
                    (k) => findPluralSibling(k, { [key]: true }) !== undefined
                );
                if (sibling === undefined) {
                    warnings.push(`${childPath}: missing`);
                }
            } else {
                compare(
                    source[key],
                    translation[key],
                    childPath,
                    errors,
                    warnings
                );
            }
        }
        for (const key of Object.keys(translation)) {
            if (key in source) {
                continue;
            }
            const childPath = keyPath ? `${keyPath}.${key}` : key;
            const sibling = findPluralSibling(key, source);
            if (sibling === undefined) {
                errors.push(`${childPath}: not present in the source file`);
            } else {
                // extra plural form: check it against a form in the source
                compare(
                    source[sibling],
                    translation[key],
                    childPath,
                    errors,
                    warnings
                );
            }
        }
        return;
    }

    if (typeof translation !== 'string') {
        errors.push(
            `${keyPath}: expected a string, found ${describeType(translation)}`
        );
    } else if (translation.trim() === '') {
        warnings.push(`${keyPath}: empty`);
    } else {
        const ignoreCount = /_(zero|one|two)$/.test(keyPath);
        const expected = getPlaceholders(source, ignoreCount);
        const actual = getPlaceholders(translation, ignoreCount);
        if (expected !== actual) {
            errors.push(
                `${keyPath}: placeholders differ from source (source: ${expected || 'none'}, translation: ${actual || 'none'})`
            );
        }
        const expectedTokens = getColonTokens(source);
        const actualTokens = getColonTokens(translation);
        if (expectedTokens !== actualTokens) {
            errors.push(
                `${keyPath}: :tokens differ from source (source: ${expectedTokens || 'none'}, translation: ${actualTokens || 'none'})`
            );
        }
    }
};

/**
 * es-mx and es_MX are the same locale and exist side by side.
 * @param locale the locale code
 * @returns the locale code with `-` replaced by `_` and lower-cased
 */
const normalizeLocale = (locale: string): string =>
    locale.replace(/-/g, '_').toLowerCase();

/**
 * Checks all translation files of one namespace.
 * @param namespace the name of the directory in the translations directory
 * @param locales normalized locale codes to restrict the check to (optional)
 * @param matchedLocales is filled with the normalized locales that matched a file
 * @returns the number of errors and warnings
 */
const checkNamespace = async (
    namespace: string,
    locales: string[] | undefined,
    matchedLocales: Set<string>
): Promise<{ errors: number; warnings: number }> => {
    const directory = path.join(translationsDirectory, namespace);
    const files = await readdir(directory);
    const sourceFileName = sourceFileNames.find((n) => files.includes(n));
    if (!sourceFileName) {
        console.log(`${namespace}: no source file (en.json or .en.json)`);
        return { errors: 1, warnings: 0 };
    }
    const source = JSON.parse(
        await readFile(path.join(directory, sourceFileName), 'utf-8')
    );
    const translationFiles = files
        .filter((f) => {
            if (!f.endsWith('.json') || sourceFileNames.includes(f)) {
                return false;
            }
            const locale = normalizeLocale(f.replace(/\.json$/, ''));
            if (locales && !locales.includes(locale)) {
                return false;
            }
            matchedLocales.add(locale);
            return true;
        })
        .sort();

    let errorCount = 0;
    let warningCount = 0;
    for (const file of translationFiles) {
        const errors: string[] = [];
        const warnings: string[] = [];
        try {
            const translation = JSON.parse(
                await readFile(path.join(directory, file), 'utf-8')
            );
            compare(source, translation, '', errors, warnings);
        } catch (error) {
            errors.push(`invalid JSON: ${error.message}`);
        }

        errorCount += errors.length;
        warningCount += warnings.length;
        if (errors.length === 0 && warnings.length === 0) {
            continue;
        }
        console.log(`${namespace}/${file}`);
        errors.forEach((e) => console.log(`  ERROR   ${e}`));
        warnings.forEach((w) => console.log(`  WARNING ${w}`));
    }
    return { errors: errorCount, warnings: warningCount };
};

const start = async () => {
    const args = process.argv.slice(2);
    const localeIndex = args.findIndex((a) => a.startsWith('--locale'));
    let locales: string[] | undefined;
    const namespaces: string[] = [];
    args.forEach((arg, index) => {
        if (arg.startsWith('--locale=')) {
            locales = arg.slice('--locale='.length).split(',');
        } else if (index === localeIndex && arg === '--locale') {
            throw new Error('Use --locale=de,fr (with an equals sign)');
        } else if (!arg.startsWith('--')) {
            namespaces.push(arg);
        }
    });

    const available = (
        await readdir(translationsDirectory, { withFileTypes: true })
    )
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort();
    const unknown = namespaces.filter((n) => !available.includes(n));
    if (unknown.length) {
        throw new Error(
            `Unknown namespace(s): ${unknown.join(', ')}. Available: ${available.join(', ')}`
        );
    }
    const toCheck = namespaces.length ? namespaces : available;

    let errorCount = 0;
    let warningCount = 0;
    const matchedLocales = new Set<string>();
    for (const namespace of toCheck) {
        const result = await checkNamespace(
            namespace,
            locales?.map(normalizeLocale),
            matchedLocales
        );
        errorCount += result.errors;
        warningCount += result.warnings;
    }

    for (const locale of locales ?? []) {
        if (!matchedLocales.has(normalizeLocale(locale))) {
            console.log(`ERROR   locale ${locale} matched no file`);
            errorCount += 1;
        }
    }

    console.log(
        `\nChecked ${toCheck.length} namespaces: ${errorCount} errors, ${warningCount} warnings`
    );
    if (errorCount > 0) {
        process.exitCode = 1;
    }
};

start().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});
