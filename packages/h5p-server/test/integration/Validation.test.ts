import * as path from 'path';
import { readdirSync } from 'fs';

import H5PConfig from '../../src/implementation/H5PConfig';
import { validatePackage } from '../helpers/PackageValidatorHelper';

const libraryManagerMock = {
    isPatchedLibrary: () => Promise.resolve(undefined),
    libraryExists: () => Promise.resolve(false),
    // This test only checks the structure of the packages, so we pretend all
    // the libraries they depend on are already installed. (Not all packages
    // on the Hub include every library they depend on.)
    getNotInstalledLibraries: () => Promise.resolve([])
} as any;

describe('validate all H5P files from the Hub', () => {
    const directory = `${path.resolve('')}/test/data/hub-content/`;
    let files;
    try {
        files = readdirSync(directory);
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
