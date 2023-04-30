import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import bodyParser from 'body-parser';
import express from 'express';
import fileUpload from 'express-fileupload';
import path from 'path';
import supertest from 'supertest';
import { dir } from 'tmp-promise';
import * as H5P from '@lumieducation/h5p-server';
import fsExtra from 'fs-extra';

import User from './User';
import H5PAjaxExpressRouter from '../src/H5PAjaxRouter/H5PAjaxExpressRouter';

const axiosMock = new AxiosMockAdapter(axios);
interface RequestEx extends express.Request {
    language: string;
    languages: any;
    t: any;
    user: H5P.IUser;
}

describe('Configuration of the Express Ajax endpoint adapter', () => {
    const user: H5P.IUser = new User();
    let app: express.Application;
    let cleanup: () => Promise<void>;
    let h5pEditor: H5P.H5PEditor;
    let tempDir: string;

    beforeEach(async () => {
        app = express();
        const tDir = await dir({ unsafeCleanup: true });

        app.use(bodyParser.json());
        app.use(
            bodyParser.urlencoded({
                extended: true
            })
        );
        app.use(
            fileUpload({
                limits: { fileSize: 50 * 1024 * 1024 }
            })
        );
        tempDir = tDir.path;
        cleanup = tDir.cleanup;
        h5pEditor = H5P.fs(
            new H5P.H5PConfig(new H5P.fsImplementations.InMemoryStorage(), {
                baseUrl: ''
            }),
            path.resolve(path.join(tempDir, 'libraries')), // the path on the local disc where libraries should be stored
            path.resolve(path.join(tempDir, 'temporary-storage')), // the path on the local disc where temporary files (uploads) should be stored
            path.resolve(path.join(tempDir, 'content')) // the path on the local disc where content is stored
        );
        axiosMock
            .onPost(h5pEditor.config.hubRegistrationEndpoint)
            .reply(
                200,
                fsExtra.readJSONSync(
                    path.resolve(
                        'test/data/content-type-cache/registration.json'
                    )
                )
            );
        axiosMock
            .onPost(h5pEditor.config.hubContentTypesEndpoint)
            .reply(
                200,
                fsExtra.readJSONSync(
                    path.resolve(
                        'test/data/content-type-cache/real-content-types.json'
                    )
                )
            );
        app.use((req: RequestEx, res, next) => {
            req.user = user;
            req.language = 'en';
            req.languages = 'en';
            req.t = (id, replacements) => id;
            next();
        });
    });

    afterEach(async () => {
        app = null;
        await cleanup();
        tempDir = '';
    });

    it('should throw generic Express errors when then error handler is turned off in the configuration', async () => {
        app.use(
            H5PAjaxExpressRouter(
                h5pEditor,
                path.resolve(path.join(tempDir, 'core')), // the path on the local disc where the files of the JavaScript client of the player are stored
                path.resolve(path.join(tempDir, 'editor')), // the path on the local disc where the files of the JavaScript client of the editor are stored
                { handleErrors: true }
            )
        );
        const res = await supertest(app).get('/libraries/H5P.Test-1.0/test.js');
        expect(res.error).toBeDefined();
        expect((res.error as any).message).toEqual(
            'cannot GET /libraries/H5P.Test-1.0/test.js (404)'
        );
    });

    it('should not handle routes that are disabled in the configuration', async () => {
        app.use(
            H5PAjaxExpressRouter(
                h5pEditor,
                path.resolve(path.join(tempDir, 'core')), // the path on the local disc where the files of the JavaScript client of the player are stored
                path.resolve(path.join(tempDir, 'editor')), // the path on the local disc where the files of the JavaScript client of the editor are stored
                { routeGetLibraryFile: false }
            )
        );

        const installResult =
            await h5pEditor.packageImporter.installLibrariesFromPackage(
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
        expect(res.status).toBe(404);
    });
});
