import { dir, DirectoryResult } from 'tmp-promise';
import bodyParser from 'body-parser';
import express from 'express';
import fileUpload from 'express-fileupload';
import i18next from 'i18next';
import i18nextFsBackend from 'i18next-fs-backend';
import i18nextHttpMiddleware from 'i18next-http-middleware';
import path from 'path';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import session from 'express-session';
import csurf from 'csurf';

import {
    h5pAjaxExpressRouter,
    libraryAdministrationExpressRouter,
    contentTypeCacheExpressRouter
} from '@lumieducation/h5p-express';

import * as H5P from '@lumieducation/h5p-server';
import restExpressRoutes from './routes';
import ExampleUser from './ExampleUser';
import createH5PEditor from './createH5PEditor';
import { displayIps, clearTempFiles } from './utils';
import ExamplePermissionSystem from './ExamplePermissionSystem';
import connectDB from './database';
import UserM, { IUserModel } from './models/userModel';

let tmpDir: DirectoryResult;

connectDB();

const initPassport = (): void => {
    passport.use(
        new LocalStrategy(async (username, password, callback) => {
            try {
                console.log('username', username);
                console.log('password', password);
                let user: IUserModel | null = await UserM.findOne({ username });
                if (!user) {
                    // Tạo mới user nếu không tồn tại
                    user = new UserM({
                        username: username,
                        name: username,
                        email: `${username}@example.com`,
                        role: (password === 'admin') ? 'admin' : 'student'
                    }) as any;
                    await user.save();
                }
                callback(null, user);
            } catch (err) {
                callback(err);
            }
        })
    );

    passport.serializeUser((user: IUserModel, done: any): void => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id: string, done: any) => {
        try {
            const user = await UserM.findById(id);
            done(null, user);
        } catch (err) {
            done(err);
        }
    });
};

const addCsrfTokenToUser = (req, res, next): void => {
    (req.user as any).csrfToken = req.csrfToken;
    next();
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

    const urlGenerator = new H5P.UrlGenerator(config, {
        queryParamGenerator: (user) => {
            if ((user as any).csrfToken) {
                return {
                    name: '_csrf',
                    value: (user as any).csrfToken()
                };
            }
            return {
                name: '',
                value: ''
            };
        },
        protectAjax: true,
        protectContentUserData: true,
        protectSetFinished: true
    });

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
        urlGenerator,
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
        (key, language) => translationFunction(key, { lng: language })
    );

    h5pEditor.setRenderer((model) => model);

    // The H5PPlayer object is used to display H5P content.
    const h5pPlayer = new H5P.H5PPlayer(
        h5pEditor.libraryStorage,
        h5pEditor.contentStorage,
        config,
        undefined,
        urlGenerator,
        undefined,
        { permissionSystem },
        h5pEditor.contentUserDataStorage
    );

    h5pPlayer.setRenderer((model) => model);

    // We now set up the Express server in the usual fashion.
    const server = express();

    server.use(bodyParser.json({ limit: '500mb' }));
    server.use(
        bodyParser.urlencoded({
            extended: true
        })
    );

    // Configure file uploads
    server.use(
        fileUpload({
            limits: { fileSize: h5pEditor.config.maxTotalSize },
            useTempFiles: useTempUploads,
            tempFileDir: useTempUploads ? tmpDir?.path : undefined
        })
    );

    // delete temporary files left over from uploads
    if (useTempUploads) {
        server.use((req: express.Request & { files: any }, res, next) => {
            res.on('finish', async () => clearTempFiles(req));
            next();
        });
    }

    // Initialize session with cookie storage
    server.use(
        session({ secret: 'mysecret', resave: false, saveUninitialized: false })
    );

    // Initialize passport for login
    initPassport();
    server.use(passport.initialize());
    server.use(passport.session());

    // Initialize CSRF protection. If we add it as middleware, it checks if a
    // token was passed into a state altering route. We pass this token to the
    // client in two ways:
    //   - Return it as a property of the return data on login (used for the CUD
    //     routes in the content service)
    //   - Add the token to the URLs in the H5PIntegration object as a query
    //     parameter. This is done by passing in a custom UrlGenerator that gets
    //     the csrfToken from the user object. We put the token into the user
    //     object in the addCsrfTokenToUser middleware.
    const csrfProtection = csurf();

    // It is important that you inject a user object into the request object!
    // The Express adapter below (H5P.adapters.express) expects the user
    // object to be present in requests.
    server.use(
        (
            req: express.Request & { user: H5P.IUser } & {
                user: {
                    username?: string;
                    name?: string;
                    email?: string;
                    role?: 'anonymous' | 'teacher' | 'student' | 'admin';
                };
            },
            res,
            next
        ) => {
            // Maps the user received from passport to the one expected by
            // h5p-express and h5p-server
            if (req.user) {
                req.user = new ExampleUser(
                    req.user.username,
                    req.user.name,
                    req.user.email,
                    req.user.role
                );
            } else {
                req.user = new ExampleUser(
                    'anonymous',
                    'Anonymous',
                    '',
                    'anonymous'
                );
            }
            next();
        }
    );

    // The i18nextExpressMiddleware injects the function t(...) into the req
    // object. This function must be there for the Express adapter
    // (H5P.adapters.express) to function properly.
    server.use(i18nextHttpMiddleware.handle(i18next));

    // The Express adapter handles GET and POST requests to various H5P
    // endpoints. You can add an options object as a last parameter to configure
    // which endpoints you want to use. In this case we don't pass an options
    // object, which means we get all of them.
    server.use(
        h5pEditor.config.baseUrl,
        csrfProtection,
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
    server.use(
        h5pEditor.config.baseUrl,
        csrfProtection,
        // We need to add the token to the user by adding the addCsrfTokenToUser
        // middleware, so that the UrlGenerator can read it when we generate the
        // integration object with the URLs that contain the token.
        addCsrfTokenToUser,
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
    server.use(
        `${h5pEditor.config.baseUrl}/libraries`,
        csrfProtection,
        libraryAdministrationExpressRouter(h5pEditor)
    );

    // The ContentTypeCacheExpress routes are REST endpoints that allow updating
    // the content type cache manually.
    server.use(
        `${h5pEditor.config.baseUrl}/content-type-cache`,
        csrfProtection,
        contentTypeCacheExpressRouter(h5pEditor.contentTypeCache)
    );

    // Simple login endpoint that returns HTTP 200 on auth and sets the user in
    // the session
    server.post(
        '/login',
        passport.authenticate('local', {
            failWithError: true
        }),
        csurf({
            // We need csurf to get the token for the current session, but we
            // don't want to protect the current route, as the login can't have
            // a CSRF token.
            ignoreMethods: ['POST']
        }),
        async function (
            req: express.Request & {
                user: { username: string; email: string; name: string };
            },
            res: express.Response
        ) {
            try {
                const user = await UserM.findOne({ username: req.user.username });
                if (!user) {
                    return res.status(400).json({ message: 'User not found' });
                }
                res.status(200).json({
                    username: user.username,
                    email: user.email,
                    name: user.name,
                    csrfToken: req.csrfToken(),
                });
            } catch (err) {
                res.status(500).json({ message: err.message });
            }
        }
    );

    server.post('/logout', csrfProtection, (req, res) => {
        req.logout((err) => {
            if (!err) {
                res.status(200).send();
            } else {
                res.status(500).send(err.message);
            }
        });
    });

    const port = process.env.PORT || '8080';

    // For developer convenience we display a list of IPs, the server is running
    // on. You can then simply click on it in the terminal.
    displayIps(port);

    server.listen(port);
};

// We can't use await outside a an async function, so we use the start()
// function as a workaround.

start();
