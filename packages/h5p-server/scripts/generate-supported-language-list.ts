/*
 * This script generates a list of languages supported by the H5P editor core.
 * It is required by H5PEditor. You must call this script after you've updated
 * the h5p editor core from the PHP implementation (only for developers of
 * h5p-server!).
 */

import fsExtra from 'fs-extra';
import path from 'path';

const languages = fsExtra.readdirSync(
    path.resolve('../h5p-examples/h5p/editor/language')
);
fsExtra.writeJsonSync(
    path.resolve('assets/editorLanguages.json'),
    languages.map((l) => l.replace('.js', ''))
);
