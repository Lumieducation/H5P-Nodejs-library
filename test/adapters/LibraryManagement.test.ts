import { dir } from 'tmp-promise';
import bodyParser from 'body-parser';
import express from 'express';
import fileUpload from 'express-fileupload';
import fsExtra from 'fs-extra';
import path from 'path';
import supertest from 'supertest';

import User from '../../examples/User';
import * as H5P from '../../src';
import { ILibraryManagementOverviewItem } from '../../src/adapters/LibraryManagementRouter/LibraryManagementTypes';

interface RequestEx extends express.Request {
    language: string;
    languages: string;
    t: (id: string, replacements: any) => string;
    user: H5P.IUser;
}

describe('Express Library Management endpoint adapter', () => {
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
        app.use((req: RequestEx, res, next) => {
            req.user = user;
            req.language = 'en';
            req.languages = 'en';
            req.t = (id, replacements) => id;
            next();
        });
        app.use(H5P.adapters.LibraryManagementExpressRouter(h5pEditor));
    });

    afterEach(async () => {
        app = null;
        await cleanup();
        tempDir = '';
    });

    // library management endpoints

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

        const libraryInformation = res.body as ILibraryManagementOverviewItem[];
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
