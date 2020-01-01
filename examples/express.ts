import bodyParser from 'body-parser';
import express from 'express';
import fileUpload from 'express-fileupload';

import path from 'path';

import * as H5P from '../src';

import DirectoryTemporaryFileStorage from './implementation/DirectoryTemporaryFileStorage';
import EditorConfig from './implementation/EditorConfig';
import FileContentStorage from './implementation/FileContentStorage';
import FileLibraryStorage from './implementation/FileLibraryStorage';
import InMemoryStorage from './implementation/InMemoryStorage';
import JsonStorage from './implementation/JsonStorage';
import User from './implementation/User';

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
        '/h5p',
        H5P.adapters.express(
            h5pEditor,
            path.resolve('h5p/core'),
            path.resolve('h5p/editor')
        )
    );

    server.listen(process.env.PORT || 8080);
};

start();
