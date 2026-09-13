import path from 'path';
import { readdirSync } from 'fs';

import { importAndExportPackage } from '../PackageExporter.test';

/**
 * Packages on the H5P Hub that declare dependencies on libraries they don't
 * ship themselves and that PackageValidator rejects for that reason. They
 * can't be imported into an empty system at all, so there is nothing to
 * export again. (H5PEditor.CoursePresentation 1.25, which is part of
 * H5P.BranchingScenario, requires H5P.InteractiveVideo 1.27.)
 */
const packagesWithUnsatisfiableDependencies = ['H5P.BranchingScenario.h5p'];

describe('PackageExporter (integration tests with examples from H5P Hub)', () => {
    const directory = `${path.resolve('')}/test/data/hub-content/`;
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
