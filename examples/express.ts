import bodyParser from 'body-parser';
import express from 'express';
import fileUpload from 'express-fileupload';
import os from 'os';
import path from 'path';

import * as H5P from '../src';
import EditorConfig from './EditorConfig';
import expressRoutes from './expressRoutes';
import startPageRenderer from './startPageRenderer';
import User from './User';

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
    const h5pEditor = H5P.fs(
        new EditorConfig(),
        path.resolve('h5p/libraries'),
        path.resolve('h5p/temporary-storage'),
        path.resolve('h5p/content')
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
