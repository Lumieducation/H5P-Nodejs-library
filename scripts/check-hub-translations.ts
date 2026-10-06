/**
 * Checks that the translations of the H5P Hub content type metadata
 * (packages/h5p-server/assets/translations/hub/*.json) are structurally
 * identical to the English source file (.en.json in the same directory).
 *
 * - Errors (exit code 1): the file is not valid JSON, has keys that don't exist
 *   in the source (e.g. because a content type or keyword key was renamed or
 *   removed), or has a different type than the source at some position (object
 *   vs. string).
 * - Warnings (exit code unaffected): keys that exist in the source but are
 *   missing or empty in the translation, i.e. translations still to do.
 *
 * Usage: ts-node scripts/check-hub-translations.ts [directory]
 */

/// <reference types="node" />

import * as path from 'path';
import { readdir, readFile } from 'fs/promises';

const directory = path.resolve(
    process.argv[2] ?? 'packages/h5p-server/assets/translations/hub'
);
const sourceFileName = '.en.json';

type Json = string | { [key: string]: Json };

const isObject = (value: any): value is { [key: string]: any } =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

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
                warnings.push(`${childPath}: missing`);
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
            if (!(key in source)) {
                errors.push(
                    `${keyPath ? `${keyPath}.${key}` : key}: not present in ${sourceFileName}`
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
    }
};

const start = async () => {
    const source = JSON.parse(
        await readFile(path.join(directory, sourceFileName), 'utf-8')
    );
    const files = (await readdir(directory))
        .filter((f) => f.endsWith('.json') && f !== sourceFileName)
        .sort();

    let errorCount = 0;
    let warningCount = 0;
    for (const file of files) {
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
        console.log(file);
        errors.forEach((e) => console.log(`  ERROR   ${e}`));
        warnings.forEach((w) => console.log(`  WARNING ${w}`));
    }

    console.log(
        `\nChecked ${files.length} files: ${errorCount} errors, ${warningCount} warnings`
    );
    if (errorCount > 0) {
        process.exitCode = 1;
    }
};

start();
