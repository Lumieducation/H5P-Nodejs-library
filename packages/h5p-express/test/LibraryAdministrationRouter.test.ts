import { dir } from 'tmp-promise';
import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import bodyParser from 'body-parser';
import express from 'express';
import fileUpload from 'express-fileupload';
import fsExtra from 'fs-extra';
import path from 'path';
import supertest from 'supertest';
import {
    ILibraryAdministrationOverviewItem,
    IUser,
    LibraryName,
    fs,
    fsImplementations,
    H5PConfig,
    H5PEditor
} from '@lumieducation/h5p-server';

import User from './User';
import LibraryAdministrationExpressRouter from '../src/LibraryAdministrationRouter/LibraryAdministrationExpressRouter';

const axiosMock = new AxiosMockAdapter(axios);

interface RequestEx extends express.Request {
    language: string;
    languages: any;
    t: any;
    user: IUser;
}

describe('Express Library Administration endpoint adapter', () => {
    const user: IUser = new User();
    let app: express.Application;
    let cleanup: () => Promise<void>;
    let h5pEditor: H5PEditor;
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
        h5pEditor = fs(
            new H5PConfig(new fsImplementations.InMemoryStorage(), {
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
        app.use(LibraryAdministrationExpressRouter(h5pEditor));
    });

    afterEach(async () => {
        app = null;
        await cleanup();
        tempDir = '';
    });

    describe('GET /libraries endpoint', () => {
        it('should return 200 with empty library list if no library was installed', async () => {
            const res = await supertest(app).get('/');
            expect(res.status).toBe(200);
            expect(res.body).toEqual([]);
        });

        it('should return 200 and a list of installed libraries', async () => {
            // We install the Course Presentation content type.
            const fileBuffer = fsExtra.readFileSync(
                path.resolve('test/data/validator/valid1.h5p')
            );
            const { installedLibraries } = await h5pEditor.uploadPackage(
                fileBuffer,
                user,
                {
                    onlyInstallLibraries: true
                }
            );
            // Make sure all libraries were installed as expected.
            expect(installedLibraries.length).toEqual(68);

            const res = await supertest(app).get('/');
            expect(res.status).toBe(200);
            expect(res.body.length).toEqual(installedLibraries.length);

            const libraryInformation =
                res.body as ILibraryAdministrationOverviewItem[];
            for (const lib of libraryInformation) {
                expect(lib).toHaveProperty('title');
                expect(lib).toHaveProperty('machineName');
                expect(lib).toHaveProperty('majorVersion');
                expect(lib).toHaveProperty('majorVersion');
                expect(lib).toHaveProperty('minorVersion');
                expect(lib).toHaveProperty('patchVersion');
                expect(lib).toHaveProperty('isAddon');
                expect(lib).toHaveProperty('restricted');
                expect(lib).toHaveProperty('runnable');
                expect(lib).toHaveProperty('instancesCount');
                expect(lib).toHaveProperty('instancesAsDependencyCount');
                expect(lib).toHaveProperty('dependentsCount');
                expect(lib).toHaveProperty('canBeDeleted');
                expect(lib).toHaveProperty('canBeUpdated');
            }

            expect(
                libraryInformation.sort((a, b) =>
                    a.machineName.localeCompare(b.machineName)
                )
            ).toEqual(libraryInformation);
        });
    });

    describe('DELETE /libraries/123 endpoint', () => {
        it('should delete unused libraries', async () => {
            // We install the Greeting Card content type.
            const fileBuffer = fsExtra.readFileSync(
                path.resolve('test/data/validator/valid2.h5p')
            );
            const { installedLibraries } = await h5pEditor.uploadPackage(
                fileBuffer,
                user,
                {
                    onlyInstallLibraries: true
                }
            );
            // Make sure all libraries were installed as expected.
            expect(installedLibraries.length).toEqual(1);

            const res = await supertest(app).delete('/H5P.GreetingCard-1.0');
            expect(res.status).toBe(204);
            const stillInstalledLibraries =
                await h5pEditor.libraryStorage.getInstalledLibraryNames();
            expect(stillInstalledLibraries.length).toEqual(0);
        });

        it('should reject invalid ubernames', async () => {
            const res = await supertest(app).delete('/H5P.GreetingCard');
            expect(res.status).toBe(400);
        });

        it('should detect missing libraries', async () => {
            const res = await supertest(app).delete('/H5P.GreetingCard-1.0');
            expect(res.status).toBe(404);
        });

        it('should reject deleting used libraries', async () => {
            // We install the Greeting Card content type and its content.
            const fileBuffer = fsExtra.readFileSync(
                path.resolve('test/data/validator/valid2.h5p')
            );
            const { installedLibraries, metadata, parameters } =
                await h5pEditor.uploadPackage(fileBuffer, user);

            // Make sure all libraries were installed as expected.
            expect(installedLibraries.length).toEqual(1);
            await h5pEditor.saveOrUpdateContent(
                undefined,
                parameters,
                metadata,
                LibraryName.toUberName(metadata.preloadedDependencies[0], {
                    useWhitespace: true
                }),
                user
            );

            // Try deleting a library that is used by content.
            const res = await supertest(app).delete('/H5P.GreetingCard-1.0');
            expect(res.status).toBe(423);
            const stillInstalledLibraries =
                await h5pEditor.libraryStorage.getInstalledLibraryNames();
            expect(stillInstalledLibraries.length).toEqual(1);
        });
    });

    describe('GET /libraries/123 endpoint', () => {
        it('should reject invalid ubernames', async () => {
            const res = await supertest(app).get('/H5P.GreetingCard');
            expect(res.status).toBe(400);
        });

        it('should detect missing libraries', async () => {
            const res = await supertest(app).get('/H5P.GreetingCard-1.0');
            expect(res.status).toBe(404);
        });

        it('should return 200 and details of the installed library', async () => {
            // We install the Greeting Card content type.
            const fileBuffer = fsExtra.readFileSync(
                path.resolve('test/data/validator/valid2.h5p')
            );
            const { installedLibraries } = await h5pEditor.uploadPackage(
                fileBuffer,
                user,
                {
                    onlyInstallLibraries: true
                }
            );
            // Make sure all libraries were installed as expected.
            expect(installedLibraries.length).toEqual(1);

            const res = await supertest(app).get('/H5P.GreetingCard-1.0');
            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({
                title: 'Greeting Card',
                description: 'Displays a greeting card',
                majorVersion: 1,
                minorVersion: 0,
                patchVersion: 6,
                runnable: 1,
                author: 'Joubel AS',
                license: 'MIT',
                machineName: 'H5P.GreetingCard',
                preloadedJs: [
                    {
                        path: 'greetingcard.js'
                    }
                ],
                preloadedCss: [
                    {
                        path: 'greetingcard.css'
                    }
                ],
                restricted: false,
                dependentsCount: 0,
                instancesAsDependencyCount: 0,
                instancesCount: 0,
                isAddon: false
            });
        });
    });

    describe('PATCH /libraries/123 endpoint', () => {
        it('should reject invalid ubernames', async () => {
            const res = await supertest(app).patch('/H5P.GreetingCard');
            expect(res.status).toBe(400);
        });

        it('should detect missing libraries', async () => {
            const res = await supertest(app).patch('/H5P.GreetingCard-1.0');
            expect(res.status).toBe(404);
        });

        it('should detect invalid bodies', async () => {
            // We install the Greeting Card content type.
            const fileBuffer = fsExtra.readFileSync(
                path.resolve('test/data/validator/valid2.h5p')
            );
            const { installedLibraries } = await h5pEditor.uploadPackage(
                fileBuffer,
                user,
                {
                    onlyInstallLibraries: true
                }
            );

            const res1 = await supertest(app)
                .patch('/H5P.GreetingCard-1.0')
                .send({ otherProperty: true });
            expect(res1.status).toBe(400);

            const res2 = await supertest(app)
                .patch('/H5P.GreetingCard-1.0')
                .send({ restricted: 1 });
            expect(res2.status).toBe(400);
        });

        it('should return 204 when updating restricted', async () => {
            // We install the Greeting Card content type.
            const fileBuffer = fsExtra.readFileSync(
                path.resolve('test/data/validator/valid2.h5p')
            );
            const { installedLibraries } = await h5pEditor.uploadPackage(
                fileBuffer,
                user,
                {
                    onlyInstallLibraries: true
                }
            );
            // Make sure all libraries were installed as expected.
            expect(installedLibraries.length).toEqual(1);

            const res = await supertest(app)
                .patch('/H5P.GreetingCard-1.0')
                .send({ restricted: true });
            expect(res.status).toBe(204);
        });
    });

    describe('POST /libraries', () => {
        it('rejects malformed requests', async () => {
            const mockApp = supertest(app);
            const res = await mockApp
                .post('/')
                .attach(
                    'anotherfile',
                    path.resolve('test/data/validator/valid2.h5p')
                );

            expect(res.status).toBe(400);
        });

        it('rejects invalid libraries', async () => {
            const mockApp = supertest(app);
            const res = await mockApp
                .post('/')
                .attach(
                    'file',
                    path.resolve('test/data/validator/invalid-library-json.h5p')
                );

            expect(res.status).toBe(400);
        });

        it('installs valid uploaded libraries', async () => {
            const mockApp = supertest(app);
            const res = await mockApp
                .post('/')
                .attach('file', path.resolve('test/data/validator/valid2.h5p'));

            expect(res.status).toBe(200);
            expect(res.body.installed).toEqual(1);
            expect(res.body.updated).toEqual(0);
            expect(
                (await h5pEditor.libraryStorage.getInstalledLibraryNames())
                    .length
            ).toEqual(1);
            expect(
                (await h5pEditor.contentManager.listContent()).length
            ).toEqual(0);
        });

        it('installs uploaded libraries even if content is invalid', async () => {
            const mockApp = supertest(app);
            const res = await mockApp
                .post('/')
                .attach(
                    'file',
                    path.resolve('test/data/validator/broken-content-json.h5p')
                );

            expect(res.status).toBe(200);
        });
    });
});
