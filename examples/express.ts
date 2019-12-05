import bodyParser from 'body-parser';
import child_process from 'child_process';
import express from 'express';
import fileUpload from 'express-fileupload';
import fs from 'fs';

import path from 'path';
import util from 'util';
const exec = util.promisify(child_process.exec);
import index from './index';

import * as h5pLib from '../src';

import DirectoryTemporaryFileStorage from './implementation/DirectoryTemporaryFileStorage';
import EditorConfig from './implementation/EditorConfig';
import FileContentStorage from './implementation/FileContentStorage';
import FileLibraryStorage from './implementation/FileLibraryStorage';
import InMemoryStorage from './implementation/InMemoryStorage';
import JsonStorage from './implementation/JsonStorage';
import User from './implementation/User';

import examples from './examples.json';

const start = async () => {
    const h5pEditor = new h5pLib.H5PEditor(
        new InMemoryStorage(),
        await new EditorConfig(
            new JsonStorage(path.resolve('examples/config.json'))
        ).load(),
        new FileLibraryStorage(path.resolve('h5p/libraries')),
        new FileContentStorage(path.resolve('h5p/content')),
        new h5pLib.TranslationService(h5pLib.englishStrings),
        (library, file) =>
            `${h5pRoute}/libraries/${library.machineName}-${library.majorVersion}.${library.minorVersion}/${file}`,
        new DirectoryTemporaryFileStorage(path.resolve('h5p/temporary-storage'))
    );

    const user = new User();

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

    const h5pRoute = '/h5p';

    server.get(`${h5pRoute}/libraries/:uberName/:file(*)`, async (req, res) => {
        const stream = h5pEditor.libraryManager.getFileStream(
            h5pLib.LibraryName.fromUberName(req.params.uberName),
            req.params.file
        );
        stream.on('end', () => {
            res.end();
        });
        stream.pipe(res.type(path.basename(req.params.file)));
    });

    server.get(`${h5pRoute}/content/:id/:file(*)`, async (req, res) => {
        const stream = await h5pEditor.getContentFileStream(
            req.params.id,
            req.params.file,
            user
        );
        stream.on('end', () => {
            res.end();
            stream.close();
        });
        stream.pipe(res.type(path.basename(req.params.file)));
    });

    server.get(
        `${h5pEditor.config.temporaryFilesPath}/:file(*)`,
        async (req, res) => {
            const stream = await h5pEditor.getContentFileStream(
                undefined,
                req.params.file,
                user
            );
            stream.on('end', () => {
                res.end();
                stream.close();
            });
            stream.pipe(res.type(path.basename(req.params.file)));
        }
    );

    server.use(h5pRoute, express.static(`${path.resolve('')}/h5p`));

    server.use('/favicon.ico', express.static(`favicon.ico`));

    server.get('/', (req, res) => {
        fs.readdir('h5p/content', (error, files) => {
            res.end(index({ contentIds: error ? [] : files, examples }));
        });
    });

    server.get('/play', (req, res) => {
        if (!req.query.contentId) {
            return res.redirect('/');
        }

        const libraryLoader = (lib, maj, min) =>
            h5pEditor.libraryManager.loadLibrary(
                new h5pLib.LibraryName(lib, maj, min)
            );
        Promise.all([
            h5pEditor.contentManager.loadContent(
                req.query.contentId,
                new User()
            ),
            h5pEditor.contentManager.loadH5PJson(
                req.query.contentId,
                new User()
            )
        ]).then(([contentObject, h5pObject]) =>
            new h5pLib.H5PPlayer(libraryLoader as any, {}, null, null, null)
                .render(req.query.contentId, contentObject, h5pObject)
                .then(h5pPage => res.end(h5pPage))
                .catch(error => res.status(500).end(error.message))
        );
    });

    server.get('/download', async (req, res) => {
        if (!req.query.contentId) {
            return res.redirect('/');
        }

        const packageExporter = new h5pLib.PackageExporter(
            h5pEditor.libraryManager,
            h5pEditor.translationService,
            h5pEditor.config,
            h5pEditor.contentManager
        );

        // set filename for the package with .h5p extension
        res.setHeader(
            'Content-disposition',
            `attachment; filename=${req.query.contentId}.h5p`
        );
        await packageExporter.createPackage(req.query.contentId, res, user);
    });

    server.get('/examples/:key', (req, res) => {
        const key = req.params.key;
        const name = path.basename(examples[key].h5p);
        const tempPath = path.resolve('scripts/tmp');
        const tempFilename = path.join(tempPath, name);

        const libraryLoader = async (lib, maj, min) =>
            h5pEditor.libraryManager.loadLibrary(
                new h5pLib.LibraryName(lib, maj, min)
            );

        exec(`sh scripts/download-example.sh ${examples[key].h5p}`)
            .then(async () => {
                const {
                    id: contentId
                } = await h5pEditor.packageImporter.addPackageLibrariesAndContent(
                    tempFilename,
                    new User()
                );
                const h5pObject = await h5pEditor.contentManager.loadH5PJson(
                    contentId,
                    new User()
                );
                const contentObject = await h5pEditor.contentManager.loadContent(
                    contentId,
                    new User()
                );
                return new h5pLib.H5PPlayer(
                    libraryLoader as any,
                    {},
                    null,
                    null,
                    ''
                ).render(contentId, contentObject, h5pObject);
            })
            .then(h5pPage => res.end(h5pPage))
            .catch(error => res.status(500).end(error.message))
            .finally(() => {
                fs.unlinkSync(tempFilename);
                fs.rmdirSync(tempPath);
            });
    });

    server.get('/edit', async (req, res) => {
        h5pEditor.render(req.query.contentId).then(page => res.end(page));
    });

    server.get('/params', (req, res) => {
        h5pEditor
            .loadH5P(req.query.contentId)
            .then(content => {
                res.status(200).json(content);
            })
            .catch(() => {
                res.status(404).end();
            });
    });

    server.get('/ajax', (req, res) => {
        const { action } = req.query;
        const { majorVersion, minorVersion, machineName, language } = req.query;

        switch (action) {
            case 'content-type-cache':
                h5pEditor.getContentTypeCache(user).then(contentTypeCache => {
                    res.status(200).json(contentTypeCache);
                });
                break;

            case 'libraries':
                h5pEditor
                    .getLibraryData(
                        machineName,
                        majorVersion,
                        minorVersion,
                        language
                    )
                    .then(library => {
                        res.status(200).json(library);
                    });
                break;

            default:
                res.status(400).end();
                break;
        }
    });

    server.post('/edit', (req, res) => {
        h5pEditor
            .saveH5P(
                req.query.contentId,
                req.body.params.params,
                req.body.params.metadata,
                req.body.library,
                user
            )
            .then(() => {
                res.status(200).end();
            });
    });

    server.post('/ajax', async (req, res) => {
        const { action } = req.query;
        switch (action) {
            case 'libraries':
                const libraryOverview = await h5pEditor.getLibraryOverview(
                    req.body.libraries
                );
                res.status(200).json(libraryOverview);
                break;
            case 'translations':
                const translationsResponse = await h5pEditor.getLibraryLanguageFiles(
                    req.body.libraries,
                    req.query.language
                );
                res.status(200).json({
                    data: translationsResponse,
                    success: true
                });
                break;
            case 'files':
                const uploadFileResponse = await h5pEditor.saveContentFile(
                    req.body.contentId === '0'
                        ? req.query.contentId
                        : req.body.contentId,
                    JSON.parse(req.body.field),
                    req.files.file,
                    user
                );
                res.status(200).json(uploadFileResponse);
                break;
            case 'library-install':
                await h5pEditor.installLibrary(req.query.id, user);
                const contentTypeCache = await h5pEditor.getContentTypeCache(
                    user
                );
                res.status(200).json({
                    data: contentTypeCache,
                    success: true
                });
                break;
            case 'library-upload':
                const { metadata, parameters } = await h5pEditor.uploadPackage(
                    req.files.h5p.data,
                    user
                );
                const contentTypes = await h5pEditor.getContentTypeCache(user);

                res.status(200).json({
                    data: {
                        content: parameters,
                        contentTypes,
                        h5p: metadata
                    },
                    success: true
                });
                break;
            case 'filter':
                res.status(200).json({
                    data: JSON.parse(req.body.libraryParameters),
                    success: true
                });
                break;
            default:
                res.status(500).end('NOT IMPLEMENTED');
                break;
        }
    });

    server.listen(process.env.PORT || 8080);
};

start();
