import { dir } from 'tmp-promise';
import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import bodyParser from 'body-parser';
import express from 'express';
import fileUpload from 'express-fileupload';
import path from 'path';
import supertest from 'supertest';
import * as H5P from '@lumieducation/h5p-server';
import fsExtra from 'fs-extra';

import User from './User';
import ContentTypeCacheExpressRouter from '../src/ContentTypeCacheRouter/ContentTypeCacheExpressRouter';

const axiosMock = new AxiosMockAdapter(axios);

describe('Content Type Cache endpoint adapter', () => {
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
                        'test',
                        'data',
                        'content-type-cache',
                        'registration.json'
                    )
                )
            );
        axiosMock
            .onPost(h5pEditor.config.hubContentTypesEndpoint)
            .reply(
                200,
                fsExtra.readJSONSync(
                    path.resolve(
                        'test',
                        'data',
                        'content-type-cache',
                        'real-content-types.json'
                    )
                )
            );

        app.use((req: any, res, next) => {
            req.user = user;
            req.language = 'en';
            req.languages = ['en'];
            req.t = (id, replacements) => id;
            next();
        });
        app.use(ContentTypeCacheExpressRouter(h5pEditor.contentTypeCache));
    });

    afterEach(async () => {
        app = null;
        await cleanup();
        tempDir = '';
    });

    it('should update the cache on POST', async () => {
        const res = await supertest(app).post('/update');
        expect(res.status).toBe(200);
        expect(res.body.lastUpdate).toBeGreaterThan(Date.now() - 20000);
    });
    it('should retrieve a null value for last update date on GET without prior content type cache update', async () => {
        const res1 = await supertest(app).get('/update');
        expect(res1.status).toBe(200);
        expect(res1.body.lastUpdate).toEqual(null);
    });
    it('should retrieve a value for last update date on GET with prior content type cache update', async () => {
        await h5pEditor.getContentTypeCache(user);
        const res2 = await supertest(app).get('/update');
        expect(res2.status).toBe(200);
        expect(res2.body.lastUpdate).toBeGreaterThan(Date.now() - 20000);
    });
});
