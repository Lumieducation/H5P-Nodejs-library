import express from 'express';
import path from 'path';
import supertest from 'supertest';
import { dir } from 'tmp-promise';

import User from '../../examples/User';
import * as H5P from '../../src';

describe('Express Ajax endpoint adapter', () => {
    let app: express;
    let h5pEditor: H5P.H5PEditor;
    let tempDir: string;
    let cleanup: () => Promise<void>;

    beforeEach(async () => {
        app = express();
        const tDir = await dir({ unsafeCleanup: true });
        tempDir = tDir.path;
        cleanup = tDir.cleanup;
        h5pEditor = H5P.fs(
            new H5P.EditorConfig(new H5P.fsImplementations.InMemoryStorage(), {
                hubContentTypesEndpoint: '',
                hubRegistrationEndpoint: ''
            }),
            path.resolve(path.join(tempDir, 'libraries')), // the path on the local disc where libraries should be stored
            path.resolve(path.join(tempDir, 'temporary-storage')), // the path on the local disc where temporary files (uploads) should be stored
            path.resolve(path.join(tempDir, 'content')) // the path on the local disc where content is stored
        );
        app.use((req, res, next) => {
            req.user = new User();
            req.language = 'en';
            req.languages = 'en';
            req.t = (id, replacements) => id;
            next();
        });
        app.use(
            H5P.adapters.express(
                h5pEditor,
                path.resolve(path.join(tempDir, 'core')), // the path on the local disc where the files of the JavaScript client of the player are stored
                path.resolve(path.join(tempDir, 'editor')) // the path on the local disc where the files of the JavaScript client of the editor are stored
            )
        );
    });

    afterEach(async () => {
        app = null;
        await cleanup();
        tempDir = '';
    });

    it('should return 404 for not installed library files', async () => {
        const res = await supertest(app).get('/libraries/H5P.Test-1.0/test.js');
        expect(res.statusCode).toBe(404);
    });

    it('should return 200 for installed library files', async () => {
        const installResult = await h5pEditor.packageImporter.installLibrariesFromPackage(
            path.resolve('test/data/validator/valid2.h5p')
        );
        expect(installResult.length).toEqual(1);
        expect(installResult[0].newVersion.machineName).toEqual(
            'H5P.GreetingCard'
        );
        expect(installResult[0].newVersion.majorVersion).toEqual(1);
        expect(installResult[0].newVersion.minorVersion).toEqual(0);
        const res = await supertest(app).get(
            '/libraries/H5P.GreetingCard-1.0/greetingcard.js'
        );
        expect(res.statusCode).toBe(200);
    });
});
