import bodyParser from 'body-parser';
import express from 'express';
import fileUpload from 'express-fileupload';
import os from 'os';
import path from 'path';

import * as H5P from '../src';

import expressRoutes from './expressRoutes';
import DirectoryTemporaryFileStorage from './implementation/DirectoryTemporaryFileStorage';
import EditorConfig from './implementation/EditorConfig';
import FileContentStorage from './implementation/FileContentStorage';
import FileLibraryStorage from './implementation/FileLibraryStorage';
import InMemoryStorage from './implementation/InMemoryStorage';
import JsonStorage from './implementation/JsonStorage';
import User from './implementation/User';
import startPageRenderer from './startPageRenderer';

function displayIps(port: string): void {
    // tslint:disable-next-line: no-console
    console.log('Example H5P NodeJs server is running:');
    const networkInterfaces = os.networkInterfaces();
    // tslint:disable-next-line: forin
    for (const devName in networkInterfaces) {
        networkInterfaces[devName]
            .filter(int => !int.internal)
            .forEach(int =>
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
    const h5pEditor = new H5P.H5PEditor(
        new InMemoryStorage(),
        await new EditorConfig(
            new JsonStorage(path.resolve('examples/config.json'))
        ).load(),
        new FileLibraryStorage(path.resolve('h5p/libraries')),
        new FileContentStorage(path.resolve('h5p/content')),
        new H5P.TranslationService(H5P.englishStrings),
        new DirectoryTemporaryFileStorage(path.resolve('h5p/temporary-storage'))
    );

    const server = express();

    server.use(bodyParser.json());
    server.use(
        bodyParser.urlencoded({
            extended: true
        })
    );
    server.use(
        fileUpload({
            limits: { fileSize: 50 * 1024 * 1024 }
        })
    );

    server.use((req, res, next) => {
        req.user = new User();
        next();
    });

    server.use(
        h5pEditor.config.baseUrl,
        H5P.adapters.express(
            h5pEditor,
            path.resolve('h5p/core'),
            path.resolve('h5p/editor')
        )
    );

    server.use(h5pEditor.config.baseUrl, expressRoutes(h5pEditor));

    server.get('/', startPageRenderer(h5pEditor));

    const port = process.env.PORT || '8080';
    displayIps(port);
    server.listen(port);
};

start();
