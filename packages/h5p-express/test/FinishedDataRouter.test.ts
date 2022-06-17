import { dir } from 'tmp-promise';
import bodyParser from 'body-parser';
import express from 'express';
import fileUpload from 'express-fileupload';
import path from 'path';
import supertest from 'supertest';
import * as H5P from '@lumieducation/h5p-server';

import User from './User';
import FinishedDataExpressRouter from '../src/FinishedDataRouter/FinishedDataExpressRouter';

// Mock Setup
const mockReturnData = { userState: 'returndata' };
const MockContentUserDataManager = jest.fn().mockImplementation(() => {
    return {
        getContentUserData: jest.fn().mockImplementation(() => {
            return mockReturnData;
        }),
        createOrUpdateContentUserData: jest.fn().mockImplementation(() => {
            return '';
        }),
        setFinished: jest.fn().mockImplementation(() => {
            return '';
        })
    };
});

describe('ContentUserData endpoint adapter for finished data', () => {
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
            req.t = (id) => id;
            next();
        });
        app.use(
            `/finishedData`,
            FinishedDataExpressRouter(
                mockContentUserDataManager,
                h5pEditor.config
            )
        );
    });

    afterEach(async () => {
        app = null;
        await cleanup();
        tempDir = '';
    });

    it('calls setFinished on POST to /finishedData', async () => {
        const contentId = 'contentId';
        const score = 1;
        const maxScore = 10;
        const opened = 1291348;
        const finished = 239882384;
        const time = 123;

        const res = await supertest(app).post(`/finishedData`).send({
            contentId,
            score,
            maxScore,
            opened,
            finished,
            time,
            user
        });

        expect(mockContentUserDataManager.setFinished).toHaveBeenCalledWith(
            contentId,
            score,
            maxScore,
            opened,
            finished,
            time,
            user
        );
        expect(res.status).toBe(200);
    });

    it('rejects POST to /finishedData when feature is disabled', async () => {
        const contentId = 'contentId';
        const score = 1;
        const maxScore = 10;
        const opened = 1291348;
        const finished = 239882384;
        const time = 123;

        h5pEditor.config.setFinishedEnabled = false;

        const res = await supertest(app).post(`/finishedData`).send({
            contentId,
            score,
            maxScore,
            opened,
            finished,
            time,
            user
        });

        expect(res.status).toBe(403);
    });
});
