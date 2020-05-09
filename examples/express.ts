import bodyParser from 'body-parser';
import express from 'express';
import fileUpload from 'express-fileupload';
import i18next from 'i18next';
import i18nextExpressMiddleware from 'i18next-express-middleware';
import i18nextNodeFsBackend from 'i18next-node-fs-backend';
import os from 'os';
import path from 'path';

import * as H5P from '../src';
import expressRoutes from './expressRoutes';
import startPageRenderer from './startPageRenderer';
import User from './User';

import dbImplementations from '../src/implementation/db';

/**
 * Displays links to the server at all available IP addresses.
 * @param port The port at which the server can be accessed.
 */
function displayIps(port: string): void {
    // tslint:disable-next-line: no-console
    console.log('Example H5P NodeJs server is running:');
    const networkInterfaces = os.networkInterfaces();
    // tslint:disable-next-line: forin
    for (const devName in networkInterfaces) {
        networkInterfaces[devName]
            .filter((int) => !int.internal)
            .forEach((int) =>
                // tslint:disable-next-line: no-console
                console.log(
                    `http://${int.family === 'IPv6' ? '[' : ''}${int.address}${
                        int.family === 'IPv6' ? ']' : ''
                    }:${port}`
                )
            );
    }
}

const start = async () => {
    await i18next
        .use(i18nextNodeFsBackend)
        .use(i18nextExpressMiddleware.LanguageDetector)
        .init({
            backend: {
                loadPath: 'assets/translations/{{ns}}/{{lng}}.json'
            },
            debug: process.env.DEBUG && process.env.DEBUG.includes('i18n'),
            defaultNS: 'server',
            fallbackLng: 'en',
            ns: ['server', 'storage-file-implementations'],
            preload: ['en']
        });

    const config = await new H5P.H5PConfig(
        new H5P.fsImplementations.JsonStorage(
            path.resolve('examples/config.json')
        )
    ).load();

    const h5pEditor = new H5P.H5PEditor(
        new H5P.fsImplementations.InMemoryStorage(),
        config,
        new H5P.fsImplementations.FileLibraryStorage(
            path.resolve('h5p/libraries') // the path on the local disc where libraries should be stored
        ),
        process.env.CONTENTSTORAGE !== 'mongos3'
            ? new H5P.fsImplementations.FileContentStorage(
                  path.resolve('h5p/content') // the path on the local disc where content is stored
              )
            : new dbImplementations.MongoS3ContentStorage(
                  dbImplementations.initS3({
                      s3ForcePathStyle: true,
                      signatureVersion: 'v4'
                  }),
                  (await dbImplementations.initMongo()).collection(
                      process.env.CONTENT_MONGO_COLLECTION
                  ),
                  { s3Bucket: process.env.CONTENT_AWS_S3_BUCKET }
              ),
        process.env.TEMPORARYSTORAGE === 's3'
            ? new dbImplementations.S3TemporaryStorage(
                  dbImplementations.initS3({
                      s3ForcePathStyle: true,
                      signatureVersion: 'v4'
                  }),
                  { s3Bucket: process.env.TEMPORARY_AWS_S3_BUCKET }
              )
            : new H5P.fsImplementations.DirectoryTemporaryFileStorage(
                  path.resolve('h5p/temporary-storage') // the path on the local disc where temporary files (uploads) should be stored
              )
    );

    // Set bucket lifecycle configuration for S3 temporary storage to make
    // sure temporary files expire.
    if (
        h5pEditor.temporaryStorage instanceof
        dbImplementations.S3TemporaryStorage
    ) {
        await (h5pEditor.temporaryStorage as any).setBucketLifecycleConfiguration(
            h5pEditor.config
        );
    }

    const h5pPlayer = new H5P.H5PPlayer(
        h5pEditor.libraryStorage,
        h5pEditor.contentStorage,
        config
    );

    const server = express();

    server.use(bodyParser.json({ limit: '500mb' }));
    server.use(
        bodyParser.urlencoded({
            extended: true
        })
    );
    server.use(
        fileUpload({
            limits: { fileSize: h5pEditor.config.maxFileSize }
        })
    );

    server.use((req, res, next) => {
        req.user = new User();
        next();
    });

    server.use(i18nextExpressMiddleware.handle(i18next));

    server.use(
        h5pEditor.config.baseUrl,
        H5P.adapters.express(
            h5pEditor,
            path.resolve('h5p/core'), // the path on the local disc where the files of the JavaScript client of the player are stored
            path.resolve('h5p/editor') // the path on the local disc where the files of the JavaScript client of the editor are stored
        )
    );

    server.use(h5pEditor.config.baseUrl, expressRoutes(h5pEditor, h5pPlayer));

    server.get('/', startPageRenderer(h5pEditor));

    const port = process.env.PORT || '8080';
    displayIps(port);
    server.listen(port);
};

start();
