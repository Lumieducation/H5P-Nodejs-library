import * as fsExtra from 'fs-extra';
import * as path from 'path';

import H5PConfig from '../../src/implementation/H5PConfig';
import PackageValidator from '../../src/PackageValidator';

describe('validate all H5P files from the Hub', () => {
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
        it(`${file}`, async () => {
            const config = new H5PConfig(null);
            config.contentWhitelist += ' html';
            const validator = new PackageValidator(config);
            await expect(
                validator.validatePackage(`${directory}/${file}`)
            ).resolves.toBeDefined();
        });
    }
});
