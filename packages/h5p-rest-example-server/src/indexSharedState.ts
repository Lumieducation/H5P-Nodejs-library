import { dir, DirectoryResult } from 'tmp-promise';
import { Strategy as LocalStrategy } from 'passport-local';
import bodyParser from 'body-parser';
import express from 'express';
import fileUpload from 'express-fileupload';
import http from 'http';
import i18next from 'i18next';
import i18nextFsBackend from 'i18next-fs-backend';
import i18nextHttpMiddleware from 'i18next-http-middleware';
import passport from 'passport';
import path from 'path';
import session from 'express-session';
import { promisify } from 'util';
import cors from 'cors';

import {
    h5pAjaxExpressRouter,
    libraryAdministrationExpressRouter,
    contentTypeCacheExpressRouter
} from '@lumieducation/h5p-express';
import * as H5P from '@lumieducation/h5p-server';
import SharedStateServer from '@lumieducation/h5p-shared-state-server';

import restExpressRoutes from './routes';
import ExampleUser from './ExampleUser';
import createH5PEditor from './createH5PEditor';
import { displayIps, clearTempFiles } from './utils';
import { IUser } from '@lumieducation/h5p-server';
import ExamplePermissionSystem from './ExamplePermissionSystem';

let tmpDir: DirectoryResult;
let sharedStateServer: SharedStateServer;

const users = {
    teacher1: {
        username: 'teacher1',
        name: 'Teacher 1',
        email: 'teacher1@example.com',
        role: 'teacher'
    },
    teacher2: {
        username: 'teacher2',
        name: 'Teacher 2',
        email: 'teacher2@example.com',
        role: 'teacher'
    },
    student1: {
        username: 'student1',
        name: 'Student 1',
        email: 'student1@example.com',
        role: 'student'
    },
    student2: {
        username: 'student2',
        name: 'Student 2',
        email: 'student2@example.com',
        role: 'student'
    },
    admin: {
        username: 'admin',
        name: 'Administration',
        email: 'admin@example.com',
        role: 'admin'
    },
    anonymous: {
        username: 'anonymous',
        name: 'Anonymous',
        email: '',
        role: 'anonymous'
    }
};

const initPassport = (): void => {
    passport.use(
        new LocalStrategy((username, password, callback) => {
            // We don't check the password. In a real application you'll perform
            // DB access here.
            const user = users[username];
            if (!user) {
                callback('User not found in user table');
            } else {
                callback(null, user);
            }
        })
    );
    passport.serializeUser((user, done): void => {
        done(null, user);
    });

    passport.deserializeUser((user, done): void => {
        done(null, user);
    });
};

/**
 * Maps the user received from passport to the one expected by
 * h5p-express and h5p-server
 **/
const expressUserToH5PUser = (user?: {
    username: string;
    name: string;
    email: string;
    role: 'anonymous' | 'teacher' | 'student' | 'admin';
}): IUser => {
    if (user) {
        return new ExampleUser(user.username, user.name, user.email, user.role);
    } else {
        return new ExampleUser('anonymous', 'Anonymous', '', 'anonymous');
    }
};

const start = async (): Promise<void> => {
    const useTempUploads = process.env.TEMP_UPLOADS === 'true';
    if (useTempUploads) {
        tmpDir = await dir({ keep: false, unsafeCleanup: true });
    }

    // We use i18next to localize messages sent to the user. You can use any
    // localization library you like.
    const translationFunction = await i18next
        .use(i18nextFsBackend)
        .use(i18nextHttpMiddleware.LanguageDetector) // This will add the
        // properties language and languages to the req object. See
        // https://github.com/i18next/i18next-http-middleware#adding-own-detection-functionality
        // how to detect language in your own fashion. You can also choose not
        // to add a detector if you only want to use one language.
        .init({
            backend: {
                loadPath: path.join(
                    __dirname,
                    '../node_modules/@lumieducation/h5p-server/build/assets/translations/{{ns}}/{{lng}}.json'
                )
            },
            debug: process.env.DEBUG && process.env.DEBUG.includes('i18n'),
            defaultNS: 'server',
            fallbackLng: 'en',
            ns: [
                'client',
                'copyright-semantics',
                'hub',
                'library-metadata',
                'metadata-semantics',
                'mongo-s3-content-storage',
                's3-temporary-storage',
                'server',
                'storage-file-implementations'
            ],
            preload: ['en', 'de'] // If you don't use a language detector of
            // i18next, you must preload all languages you want to use!
        });

    // Load the configuration file from the local file system
    const config = await new H5P.H5PConfig(
        new H5P.fsImplementations.JsonStorage(path.resolve('config.json'))
    ).load();

    const permissionSystem = new ExamplePermissionSystem();

    // The H5PEditor object is central to all operations of h5p-nodejs-library
    // if you want to user the editor component.
    //
    // To create the H5PEditor object, we call a helper function, which
    // uses implementations of the storage classes with a local filesystem
    // or a MongoDB/S3 backend, depending on the configuration values set
    // in the environment variables.
    // In your implementation, you will probably instantiate H5PEditor by
    // calling new H5P.H5PEditor(...) or by using the convenience function
    // H5P.fs(...).
    const h5pEditor: H5P.H5PEditor = await createH5PEditor(
        config,
        undefined,
        permissionSystem,
        path.resolve('h5p/libraries'), // the path on the local disc where
        // libraries should be stored)
        path.resolve('h5p/content'), // the path on the local disc where content
        // is stored. Only used / necessary if you use the local filesystem
        // content storage class.
        path.resolve('h5p/temporary-storage'), // the path on the local disc
        // where temporary files (uploads) should be stored. Only used /
        // necessary if you use the local filesystem temporary storage class.
        path.resolve('h5p/user-data'),
        (key, language) => translationFunction(key, { lng: language }),
        {
            contentWasDeleted: (contentId) => {
                return sharedStateServer.deleteState(contentId);
            },
            contentWasUpdated: (contentId) => {
                return sharedStateServer.deleteState(contentId);
            }
        }
    );

    h5pEditor.setRenderer((model) => model);

    // The H5PPlayer object is used to display H5P content.
    const h5pPlayer = new H5P.H5PPlayer(
        h5pEditor.libraryStorage,
        h5pEditor.contentStorage,
        config,
        undefined,
        undefined,
        undefined,
        { permissionSystem }
    );

    h5pPlayer.setRenderer((model) => model);

    // We now set up the Express server in the usual fashion.
    const app = express();

    app.use(bodyParser.json({ limit: '500mb' }));
    app.use(
        bodyParser.urlencoded({
            extended: true
        })
    );

    // Configure file uploads
    app.use(
        fileUpload({
            limits: { fileSize: h5pEditor.config.maxTotalSize },
            useTempFiles: useTempUploads,
            tempFileDir: useTempUploads ? tmpDir?.path : undefined
        })
    );

    // delete temporary files left over from uploads
    if (useTempUploads) {
        app.use((req: express.Request & { files: any }, res, next) => {
            res.on('finish', async () => clearTempFiles(req));
            next();
        });
    }

    // Initialize session with cookie storage
    const sessionParser = session({
        secret: 'mysecret',
        resave: false,
        saveUninitialized: false
    });
    app.use(sessionParser);
    const sessionParserPromise = promisify(sessionParser);

    // Initialize passport for login
    initPassport();
    const passportInitialize = passport.initialize();
    app.use(passportInitialize);
    const passportInitializePromise = promisify(passportInitialize);

    const passportSession = passport.session();
    app.use(passportSession);
    const passportSessionPromise = promisify(passportSession);

    // It is important that you inject a user object into the request object!
    // The Express adapter below (H5P.adapters.express) expects the user
    // object to be present in requests.
    app.use(
        (
            req: express.Request & {
                user?: {
                    username: string;
                    name: string;
                    email: string;
                    role: 'anonymous' | 'teacher' | 'student' | 'admin';
                };
            },
            res,
            next
        ) => {
            req.user = expressUserToH5PUser(req.user) as any;
            next();
        }
    );

    // The i18nextExpressMiddleware injects the function t(...) into the req
    // object. This function must be there for the Express adapter
    // (H5P.adapters.express) to function properly.
    app.use(i18nextHttpMiddleware.handle(i18next));

    // The Express adapter handles GET and POST requests to various H5P
    // endpoints. You can add an options object as a last parameter to configure
    // which endpoints you want to use. In this case we don't pass an options
    // object, which means we get all of them.
    app.use(
        h5pEditor.config.baseUrl,
        h5pAjaxExpressRouter(
            h5pEditor,
            path.resolve('h5p/core'), // the path on the local disc where the
            // files of the JavaScript client of the player are stored
            path.resolve('h5p/editor'), // the path on the local disc where the
            // files of the JavaScript client of the editor are stored
            undefined,
            'auto' // You can change the language of the editor here by setting
            // the language code you need here. 'auto' means the route will try
            // to use the language detected by the i18next language detector.
        )
    );

    // The expressRoutes are routes that create pages for these actions:
    // - Creating new content
    // - Editing content
    // - Saving content
    // - Deleting content
    app.use(
        h5pEditor.config.baseUrl,
        restExpressRoutes(
            h5pEditor,
            h5pPlayer,
            'auto' // You can change the language of the editor here by setting
            // the language code you need here. 'auto' means the route will try
            // to use the language detected by the i18next language detector.
        )
    );

    // The LibraryAdministrationExpress routes are REST endpoints that offer
    // library management functionality.
    app.use(
        `${h5pEditor.config.baseUrl}/libraries`,
        libraryAdministrationExpressRouter(h5pEditor)
    );

    // The ContentTypeCacheExpress routes are REST endpoints that allow updating
    // the content type cache manually.
    app.use(
        `${h5pEditor.config.baseUrl}/content-type-cache`,
        contentTypeCacheExpressRouter(h5pEditor.contentTypeCache)
    );

    // Simple login endpoint that returns HTTP 200 on auth and sets the user in
    // the session
    app.post(
        '/login',
        passport.authenticate('local', {
            failWithError: true
        }),
        function (
            req: express.Request & {
                user: { username: string; email: string; name: string };
            },
            res: express.Response
        ): void {
            res.status(200).json({
                username: req.user.username,
                email: req.user.email,
                name: req.user.name
            });
        }
    );

    app.post('/logout', (req, res) => {
        req.logout((err) => {
            if (!err) {
                res.status(200).send();
            } else {
                res.status(500).send(err.message);
            }
        });
    });

    /**
     * The route returns information about the user. It is used by the client to
     * find out who the user is and what privilege level he/she has.
     */
    app.get(
        '/auth-data/:contentId',
        cors({ credentials: true, origin: 'http://localhost:3000' }),
        (req: express.Request<{ contentId: string }>, res) => {
            if (!req.user) {
                res.status(200).json({ level: 'anonymous' });
            } else {
                let level: string;
                if (
                    users[(req.user as any)?.id]?.role === 'teacher' ||
                    users[(req.user as any)?.id]?.role === 'admin'
                ) {
                    level = 'privileged';
                } else {
                    level = 'user';
                }
                res.status(200).json({
                    level,
                    userId: (req.user as any).id?.toString()
                });
            }
        }
    );

    const port = process.env.PORT || '8080';

    // For developer convenience we display a list of IPs, the server is running
    // on. You can then simply click on it in the terminal.
    displayIps(port);

    // We need to create our own http server to pass it to the shared state
    // package.
    const server = http.createServer(app);

    // Add shared state websocket and ShareDB to the server
    sharedStateServer = new SharedStateServer(
        server,
        h5pEditor.libraryManager.libraryStorage.getLibrary.bind(
            h5pEditor.libraryManager.libraryStorage
        ),
        h5pEditor.libraryManager.libraryStorage.getFileAsJson.bind(
            h5pEditor.libraryManager.libraryStorage
        ),
        async (req: express.Request) => {
            // We get the raw request that was upgraded to the websocket from
            // SharedStateServer and have to get the user for it from the
            // session. As the request hasn't passed through the express
            // middleware, we have to call the required middleware ourselves.
            await sessionParserPromise(req, {} as any);
            await passportInitializePromise(req, {} as any);
            await passportSessionPromise(req, {});
            return expressUserToH5PUser(req.user as any);
        },
        async (user, _contentId) => {
            const userInTable = users[user.id];
            if (!userInTable) {
                return undefined;
            }
            return userInTable.role === 'teacher' || userInTable === 'admin'
                ? 'privileged'
                : 'user';
        },
        h5pEditor.contentManager.getContentMetadata.bind(
            h5pEditor.contentManager
        ),
        h5pEditor.contentManager.getContentParameters.bind(
            h5pEditor.contentManager
        )
    );

    server.listen(port);
};

// We can't use await outside a an async function, so we use the start()
// function as a workaround.

start();
