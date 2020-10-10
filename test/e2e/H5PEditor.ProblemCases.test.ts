import fsExtra from 'fs-extra';
import path from 'path';

import * as uploadHelpers from './helpers/upload';

const problemCasesPath = path.resolve('test/data/problem-cases');
const host = 'http://localhost:8080';

describe('e2e test: upload content and save', () => {
    beforeAll(async () => {
        await uploadHelpers.beforeAll(host);
    });

    afterAll(async () => {
        await uploadHelpers.afterAll();
    });

    for (const file of fsExtra
        .readdirSync(problemCasesPath)
        .filter((f) => f.endsWith('.h5p'))) {
        it(`uploading and then saving ${file}`, async () => {
            await uploadHelpers.uploadSave(path.join(problemCasesPath, file));
        }, 60000);
    }
});
