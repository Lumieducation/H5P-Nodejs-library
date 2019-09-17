const fs = require('fs-extra');
const path = require('path');

const H5pPackageValidator = require('../src/package-validator');
const H5PConfig = require('../src/config');
const TranslationService = require('../src/translation-service');

describe('validate H5P files from the Hub', () => {
    const directory = `${path.resolve('')}/test/data/hub-content/`;
    let files;
    try {
        files = fs.readdirSync(directory);
    } catch {
        throw new Error(
            "The directory test/data/hub-content does not exist. Execute 'npm run download:content' to fetch example data from the H5P Hub!"
        );
    }

    for (const file of files.filter(f => f.endsWith('.h5p'))) {
        it(`${file}`, async () => {
            const englishStrings = await fs.readJSON(
                `${path.resolve('')}/src/translations/en.json`
            );
            const translationService = new TranslationService(
                englishStrings,
                englishStrings
            );
            const config = new H5PConfig();
            config.contentWhitelist += ' html';
            const validator = new H5pPackageValidator(
                translationService,
                config
            );
            await expect(
                validator.validatePackage(`${directory}/${file}`)
            ).resolves.toBeDefined();
        });
    }
});
