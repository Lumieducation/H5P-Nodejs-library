import { dir } from 'tmp-promise';
import bodyParser from 'body-parser';
import express from 'express';
import fileUpload from 'express-fileupload';
import path from 'path';
import supertest from 'supertest';
import * as H5P from '@lumieducation/h5p-server';

import User from './User';
import ContentUserDataExpressRouter from '../src/ContentUserDataRouter/ContentUserDataExpressRouter';

// Mock Setup
const mockReturnData = 'returndata';
const MockContentUserDataManager = jest.fn().mockImplementation(() => {
    return {
        loadContentUserData: jest.fn().mockImplementation(() => {
            return mockReturnData;
        }),
        saveContentUserData: jest.fn().mockImplementation(() => {
            return '';
        })
    };
});

describe('ContentUserData endpoint adapter', () => {
    const user: H5P.IUser = new User();
    let app: express.Application;
    let cleanup: () => Promise<void>;
    let h5pEditor: H5P.H5PEditor;
    let tempDir: string;
    let mockContentUserDataManager: any;

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
            path.resolve(path.join(tempDir, 'content')) // the path on the local disc where content is stored,
        );
        mockContentUserDataManager = MockContentUserDataManager();

        app.use((req: any, res, next) => {
            req.user = user;
            req.language = 'en';
            req.languages = ['en'];
            req.t = (id, replacements) => id;
            next();
        });
        app.use(
            `/contentUserData`,
            ContentUserDataExpressRouter(mockContentUserDataManager)
        );
    });

    afterEach(async () => {
        app = null;
        await cleanup();
        tempDir = '';
    });

    it('calls saveContentUserData on POST', async () => {
        const contentId = 'contentId';
        const dataType = 'state';
        const subContentId = '0';
        const body = { data: 'testData', invalidate: 0, preload: 1 };

        const res = await supertest(app)
            .post(`/contentUserData/${contentId}/${dataType}/${subContentId}`)
            .send(body);

        expect(
            mockContentUserDataManager.saveContentUserData
        ).toHaveBeenCalledWith(
            contentId,
            dataType,
            subContentId,
            body.data,
            false,
            true,
            user
        );
        expect(res.status).toBe(200);
        // expect(res.body).toBe({ data: mockReturnData, success: true });
    });

    it('calls loadContentUserData on GET', async () => {
        const contentId = 'contentId';
        const dataType = 'state';
        const subContentId = '0';

        const res = await supertest(app).get(
            `/contentUserData/${contentId}/${dataType}/${subContentId}`
        );

        expect(
            mockContentUserDataManager.loadContentUserData
        ).toHaveBeenCalledWith(contentId, dataType, subContentId, user);
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ data: mockReturnData, success: true });
    });
});
