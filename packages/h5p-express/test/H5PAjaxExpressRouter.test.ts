import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import bodyParser from 'body-parser';
import express from 'express';
import fileUpload from 'express-fileupload';
import path from 'path';
import supertest from 'supertest';
import { dir } from 'tmp-promise';
import fsExtra from 'fs-extra';
import * as H5P from '@lumieducation/h5p-server';

import User from './User';
import H5PAjaxExpressRouter from '../src/H5PAjaxRouter/H5PAjaxExpressRouter';

const axiosMock = new AxiosMockAdapter(axios);
interface RequestEx extends express.Request {
    language: string;
    languages: any;
    t: any;
    user: H5P.IUser;
}
describe('Express Ajax endpoint adapter', () => {
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
        app.use(
            H5PAjaxExpressRouter(
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

    // libraries endpoints

    it('should return 404 for unspecified paths', async () => {
        const res = await supertest(app).get('/unused');
        expect(res.status).toBe(404);
    });

    it('should return 404 for not installed library files', async () => {
        const res = await supertest(app).get('/libraries/H5P.Test-1.0/test.js');
        expect(res.status).toBe(404);
    });

    it('should return 400 for illegal attempts to access files through relative paths', async () => {
        const res = await supertest(app).get('/libraries/usr/bin/secret');
        expect(res.status).toBe(400);
    });

    it('should return 200 for installed library files', async () => {
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
        expect(res.status).toBe(200);
    });

    it('should return aggregated library data for installed libraries', async () => {
        await h5pEditor.packageImporter.installLibrariesFromPackage(
            path.resolve('test/data/validator/valid2.h5p')
        );
        const res = await supertest(app).get('/ajax?action=libraries').query({
            language: 'en',
            machineName: 'H5P.GreetingCard',
            majorVersion: 1,
            minorVersion: 0
        });
        expect(res.status).toBe(200);
        const parsedData = JSON.parse(res.text);
        expect(parsedData.name).toBe('H5P.GreetingCard');
        expect(parsedData.version).toMatchObject({ major: 1, minor: 0 });
        expect(parsedData.title).toBe('Greeting Card');
        expect(parsedData.css).toMatchObject([
            '/libraries/H5P.GreetingCard-1.0/greetingcard.css?version=1.0.6'
        ]);
        expect(parsedData.javascript).toMatchObject([
            '/libraries/H5P.GreetingCard-1.0/greetingcard.js?version=1.0.6'
        ]);
        expect(parsedData.languages.sort()).toMatchObject(
            ['en', 'fr', 'nb'].sort()
        );
        expect(parsedData.semantics).toMatchObject([
            {
                default: 'Hello world!',
                description: 'The greeting text displayed to the end user.',
                label: 'Greeting text',
                name: 'greeting',
                type: 'text'
            },
            {
                description:
                    'Image shown on card, optional. Without this the card will show just the text.',
                label: 'Card image',
                name: 'image',
                optional: true,
                type: 'image'
            }
        ]);
        // the test doesn't include the translations property, as the PHP H5P server doesn't add
        // any value here. Our implementation does add the translation files, however.
    });

    it('should return 200 when downloading package', async () => {
        const installResult =
            await h5pEditor.packageImporter.addPackageLibrariesAndContent(
                path.resolve('test/data/validator/valid2.h5p'),
                user
            );
        const res = await supertest(app).get(`/download/${installResult.id}`);
        expect(res.status).toBe(200);
    });

    it('should return 404 when downloading unknown packages', async () => {
        const res = await supertest(app).get(`/download/invalid`);
        expect(res.status).toBe(404);
    });

    it('should return the list of installed libraries', async () => {
        await h5pEditor.packageImporter.installLibrariesFromPackage(
            path.resolve('test/data/validator/valid2.h5p')
        );

        const getLibrariesResult = await supertest(app)
            .post('/ajax?action=libraries')
            .send('libraries%5B%5D=H5P.GreetingCard+1.0'); // this seems like the only way to send body arrays with supertest
        expect(getLibrariesResult.status).toBe(200);
    });

    it('should return translation files of requested libraries', async () => {
        await h5pEditor.packageImporter.installLibrariesFromPackage(
            path.resolve('test/data/validator/valid2.h5p')
        );

        const getTranslationsResult = await supertest(app)
            .post('/ajax?action=translations')
            .query({ language: 'fr' })
            .send('libraries%5B%5D=H5P.GreetingCard+1.0'); // this seems like the only way to send body arrays with supertest
        expect(getTranslationsResult.status).toBe(200);
        const parsedResult = JSON.parse(getTranslationsResult.text).data;
        expect(JSON.parse(parsedResult['H5P.GreetingCard 1.0'])).toMatchObject({
            semantics: [
                {
                    default: 'Meilleurs voeux!',
                    description:
                        'Les félicitaions ou voeux qui seront affichés.',
                    label: 'Texte des voeux'
                },
                {
                    description: 'Image affichée sur le carte. Optionel.',
                    label: 'Ajouter une image'
                }
            ]
        });
    });

    // content file endpoints

    it('should return 200 for installed content files', async () => {
        const installResult =
            await h5pEditor.packageImporter.addPackageLibrariesAndContent(
                path.resolve('test/data/validator/valid2.h5p'),
                user
            );
        expect(installResult.installedLibraries.length).toEqual(1);
        expect(
            installResult.installedLibraries[0].newVersion.machineName
        ).toEqual('H5P.GreetingCard');
        expect(
            installResult.installedLibraries[0].newVersion.majorVersion
        ).toEqual(1);
        expect(
            installResult.installedLibraries[0].newVersion.minorVersion
        ).toEqual(0);
        expect(installResult.id).toBeGreaterThan(0);

        const mockApp = supertest(app);
        expect(
            (await mockApp.get(`/content/${installResult.id}/earth.jpg`)).status
        ).toBe(200);

        expect((await mockApp.get(`/params/${installResult.id}`)).status).toBe(
            200
        );
    });

    it('should allow uploads for existing content', async () => {
        const installResult =
            await h5pEditor.packageImporter.addPackageLibrariesAndContent(
                path.resolve('test/data/validator/valid2.h5p'),
                user
            );

        const mockApp = supertest(app);
        const res = await mockApp
            .post('/ajax?action=files')
            .field('contentId', installResult.id)
            .field(
                'field',
                JSON.stringify({
                    description:
                        'Image shown on card, optional. Without this the card will show just the text.',
                    label: 'Card image',
                    name: 'image',
                    optional: true,
                    type: 'image'
                })
            )
            .attach(
                'file',
                path.resolve('test/data/sample-content/content/earth.jpg')
            );
        expect(res.status).toBe(200);
        const parsedRes = JSON.parse(res.text);
        expect(parsedRes.path).toBeDefined();
        expect(parsedRes.mime).toBeDefined();
        expect(
            (await mockApp.get(`/temp-files/${parsedRes.path}`)).status
        ).toBe(200);
    });

    it('should allow uploads for new content', async () => {
        const mockApp = supertest(app);
        const res = await mockApp
            .post('/ajax?action=files')
            .field(
                'field',
                JSON.stringify({
                    description:
                        'Image shown on card, optional. Without this the card will show just the text.',
                    label: 'Card image',
                    name: 'image',
                    optional: true,
                    type: 'image'
                })
            )
            .attach(
                'file',
                path.resolve('test/data/sample-content/content/earth.jpg')
            );
        expect(res.status).toBe(200);
        const parsedRes = JSON.parse(res.text);
        expect(parsedRes.path).toBeDefined();
        expect(parsedRes.mime).toBeDefined();
        expect(
            (await mockApp.get(`/temp-files/${parsedRes.path}`)).status
        ).toBe(200);
    });

    // get ajax endpoint error handler
    it('should return 400 for invalid actions', async () => {
        const mockApp = supertest(app);
        const result = await mockApp.get(`/ajax?action=unsupported-action`);
        expect(result.status).toBe(400);
    });

    // content type cache endpoint
    it('should return a valid content type cache', async () => {
        const mockApp = supertest(app);
        const result = await mockApp.get(`/ajax?action=content-type-cache`);
        expect(result.status).toBe(200);
        const data = JSON.parse(result.text);
        expect(data.apiVersion).toBeDefined();
        expect(data.libraries).toBeDefined();
        expect(data.outdated).toBeDefined();
    });

    it('requesting non-existent temporary files should return 404', async () => {
        const imageResult = await supertest(app).get(
            `/temp-files/idontexist.png`
        );
        expect(imageResult.status).toBe(404);
    });

    it('should return the proper error message for validation errors when uploading H5P packages', async () => {
        const mockApp = supertest(app);
        const uploadResult = await mockApp
            .post(`/ajax?action=library-upload`)
            .attach(
                'h5p',
                path.resolve(
                    'test/data/validator/invalid-language-file-json.h5p'
                ),
                {
                    contentType: 'application/zip',
                    filename: 'invalid-language-file-json.h5p'
                }
            );
        expect(uploadResult.status).toBe(400);
        expect(JSON.parse(uploadResult.text).message).toBe(
            'package-validation-failed'
        );
        expect(JSON.parse(uploadResult.text).details).toMatchObject([
            {
                code: 'invalid-language-file-json',
                message: 'invalid-language-file-json'
            }
        ]);
    });

    describe('tests requiring uploaded files', () => {
        let mockApp: supertest.SuperTest<supertest.Test>;
        let uploadResult: any;
        beforeEach(async () => {
            mockApp = supertest(app);
            uploadResult = await mockApp
                .post(`/ajax?action=library-upload`)
                .attach('h5p', path.resolve('test/data/validator/valid2.h5p'), {
                    contentType: 'application/zip',
                    filename: 'valid2.h5p'
                });
        });

        it('should upload h5p packages successfully', async () => {
            expect(uploadResult.status).toBe(200);
            const returned = JSON.parse(uploadResult.text);
            expect(returned.data.content).toMatchObject({
                greeting: 'Hello world!',
                image: {
                    copyright: { license: 'U' },
                    height: 300,
                    width: 300
                }
            });
            expect(returned.data.h5p).toMatchObject({
                embedTypes: ['div'],
                language: 'und',
                license: 'U',
                mainLibrary: 'H5P.GreetingCard',
                preloadedDependencies: [
                    {
                        machineName: 'H5P.GreetingCard',
                        majorVersion: '1',
                        minorVersion: '0'
                    }
                ]
            });
        });

        it('temporary files of uploaded packages should be accessible', async () => {
            const returned = JSON.parse(uploadResult.text);
            const imagePath = returned.data.content.image.path;
            const imageResult = await mockApp.get(`/temp-files/${imagePath}`);
            expect(imageResult.status).toBe(200);
        });
    });

    it('returns 200 on filter requests', async () => {
        const installResult =
            await h5pEditor.packageImporter.installLibrariesFromPackage(
                path.resolve('test/data/validator/valid2.h5p')
            );

        const imageResult = await supertest(app)
            .post(`/ajax?action=filter`)
            .send({
                libraryParameters: JSON.stringify({
                    params: await fsExtra.readJson(
                        path.resolve(
                            'test/data/sample-content/content/content.json'
                        )
                    ),
                    metadata: await fsExtra.readJson(
                        path.resolve('test/data/sample-content/h5p.json')
                    ),
                    library: 'H5P.GreetingCard 1.0'
                })
            });
        expect(imageResult.status).toBe(200);
    });

    it('installs content types from the H5P Hub', async () => {
        axiosMock
            .onGet(`${h5pEditor.config.hubContentTypesEndpoint}H5P.DragText`)
            .reply(() => [
                200,
                fsExtra.createReadStream(
                    path.resolve('test/data/example-packages/H5P.DragText.h5p')
                )
            ]);
        const result = await supertest(app).post(
            `/ajax?action=library-install&id=H5P.DragText`
        );
        expect(result.status).toEqual(200);
        expect(result.body.success).toEqual(true);
        expect(
            result.body.data.libraries.find(
                (l) => l.machineName === 'H5P.DragText'
            ).installed
        ).toEqual(true);
    });
});
