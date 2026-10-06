/**
 * Regenerates the English source file for the translations of the H5P Hub
 * content type metadata (packages/h5p-server/assets/translations/hub/.en.json)
 * from the content type cache downloaded by update-real-content-type-cache.ts
 * (run `npm run download:content-type-cache` first to get current data).
 *
 * The file is used as the source for json-autotranslate (see localize.sh).
 * Titles are written as "Title (Title)" so that translated titles end up as
 * "Translated title (Original title)". Keyword keys are the keywords with
 * spaces replaced by underscores. The order of existing entries is kept and new
 * content types are appended, to keep diffs small. Use `git diff` to see which
 * strings were added or changed and need to be (re-)translated.
 */

/// <reference types="node" />

import * as path from 'path';
import { readFile, writeFile } from 'fs/promises';

const cachePath = path.resolve(
    'test/data/content-type-cache/real-content-types.json'
);
const outputPath = path.resolve(
    'packages/h5p-server/assets/translations/hub/.en.json'
);

const start = async () => {
    const { contentTypes } = JSON.parse(await readFile(cachePath, 'utf-8'));

    const generated: any = {};
    for (const contentType of contentTypes) {
        const key = contentType.id.replace(/\./g, '_');
        const entry: any = {
            title: `${contentType.title} (${contentType.title})`,
            summary: contentType.summary?.trim(),
            description: contentType.description?.trim()
        };
        if (contentType.keywords?.length) {
            entry.keywords = {};
            for (const keyword of contentType.keywords) {
                entry.keywords[keyword.replace(/ /g, '_')] = keyword;
            }
        }
        generated[key] = entry;
    }

    // Object keys keep their insertion order: existing entries first.
    const existing = JSON.parse(await readFile(outputPath, 'utf-8'));
    const result: any = {};
    for (const key of [...Object.keys(existing), ...Object.keys(generated)]) {
        if (key in generated) {
            result[key] = generated[key];
        }
    }

    await writeFile(outputPath, `${JSON.stringify(result, null, 4)}\n`);
    console.log(`Wrote ${contentTypes.length} content types to ${outputPath}`);
};

start();
