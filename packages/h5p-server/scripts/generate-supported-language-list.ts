/*
 * This script generates a list of languages supported by the H5P editor core.
 * It is required by H5PEditor. You must call this script after you've updated
 * the h5p editor core from the PHP implementation (only for developers of
 * h5p-server!).
 */

import { readdirSync, writeFileSync } from 'fs';
import path from 'path';

const languages = readdirSync(
    path.resolve('../h5p-examples/h5p/editor/language')
);
writeFileSync(
    path.resolve('assets/editorLanguages.json'),
    JSON.stringify(languages.map((l) => l.replace('.js', '')))
);
