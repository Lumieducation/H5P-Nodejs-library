import * as fsExtra from 'fs-extra';
import * as path from 'path';

import H5PConfig from '../../src/implementation/H5PConfig';
import { validatePackage } from '../helpers/PackageValidatorHelper';

const libraryManagerMock = {
    isPatchedLibrary: () => Promise.resolve(undefined),
    libraryExists: () => Promise.resolve(false)
} as any;

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
            await expect(
                validatePackage(
                    libraryManagerMock,
                    config,
                    `${directory}/${file}`
                )
            ).resolves.toBeDefined();
        });
    }
});
