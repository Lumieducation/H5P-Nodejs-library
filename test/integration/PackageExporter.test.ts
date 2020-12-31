import fsExtra from 'fs-extra';
import path from 'path';

import { importAndExportPackage } from '../PackageExporter.test';

describe('PackageExporter (integration tests with examples from H5P Hub)', () => {
    const directory = `${path.resolve('')}/test/data/hub-content/`;
    let files;
    try {
        files = fsExtra.readdirSync(directory);
    } catch {
        throw new Error(
            "The directory test/data/hub-content does not exist. Execute 'npm run download:content' to fetch example data from the H5P Hub!"
        );
    }

    for (const file of files.filter((f) => f.endsWith('.h5p'))) {
        it(`importing ${file} and exporting it again produces the same result`, async () => {
            await importAndExportPackage(path.join(directory, file));
        }, 30000);
    }
});
