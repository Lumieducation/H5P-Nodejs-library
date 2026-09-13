import path from 'path';
import { readdirSync } from 'fs';

import { importAndExportPackage } from '../PackageExporter.test';
import {
    hubContentDirectory,
    packagesWithUnsatisfiableDependencies
} from '../../../../test/data/hub-content';

describe('PackageExporter (integration tests with examples from H5P Hub)', () => {
    const directory = `${hubContentDirectory}/`;
    let files;
    try {
        files = readdirSync(directory);
    } catch {
        throw new Error(
            "The directory test/data/hub-content does not exist. Execute 'npm run download:content' to fetch example data from the H5P Hub!"
        );
    }

    for (const file of files.filter(
        (f) =>
            f.endsWith('.h5p') &&
            !packagesWithUnsatisfiableDependencies.includes(f)
    )) {
        it(`importing ${file} and exporting it again produces the same result`, async () => {
            await importAndExportPackage(path.join(directory, file));
        }, 30000);
    }
});
