const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const fs = require('fs');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const index = require('./index');

const H5PEditor = require('../');
const H5PPlayer = H5PEditor.Player;

const examples = require('./examples.json');

const start = async () => {
    const h5pEditor = new H5PEditor.Editor(
        {
            baseUrl: '/h5p',
            ajaxPath: '/ajax?action=',
            libraryUrl: '/h5p/editor/', // this is confusing as it loads no library but the editor-library files (needed for the ckeditor)
            filesPath: '/h5p/content'
        },
        new H5PEditor.InMemoryStorage(),
        await new H5PEditor.Config(
            new H5PEditor.JsonStorage(path.resolve('examples/config.json'))
        ).load(),
        new H5PEditor.FileLibraryStorage(`${path.resolve('')}/h5p/libraries`),
        new H5PEditor.FileContentStorage(`${path.resolve('')}/h5p/content`),
        new H5PEditor.User(),
        new H5PEditor.TranslationService(H5PEditor.englishStrings)
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

    const h5pRoute = '/h5p';

    server.get(`${h5pRoute}/libraries/:uberName/:file(*)`, async (req, res) => {
        const stream = await h5pEditor.libraryManager.getFileStream(
            H5PEditor.Library.createFromName(req.params.uberName),
            req.params.file
        );
        stream.on('end', () => {
            res.end();
        });
        stream.pipe(res.type(path.basename(req.params.file)));
    });

    server.get(`${h5pRoute}/content/:id/content/:file(*)`, async (req, res) => {
        const stream = await h5pEditor.contentManager.getContentFileStream(
            req.params.id,
            `content/${req.params.file}`,
            null
        );
        stream.on('end', () => {
            res.end();
        });
        stream.pipe(res.type(path.basename(req.params.file)));
    });

    server.use(h5pRoute, express.static(`${path.resolve('')}/h5p`));

    server.use('/favicon.ico', express.static(`favicon.ico`));

    server.get('/', (req, res) => {
        fs.readdir('h5p/content', (error, files) => {
            if (error) files = [];
            res.end(index({ contentIds: files, examples }));
        });
    });

    server.get('/play', (req, res) => {
        if (!req.query.contentId) {
            return res.redirect('/');
        }

        const libraryLoader = (lib, maj, min) =>
            h5pEditor.libraryManager.loadLibrary(
                new H5PEditor.Library(lib, maj, min)
            );
        Promise.all([
            h5pEditor.contentManager.loadContent(req.query.contentId),
            h5pEditor.contentManager.loadH5PJson(req.query.contentId)
        ]).then(([contentObject, h5pObject]) =>
            new H5PPlayer.Player(libraryLoader)
                .render(req.query.contentId, contentObject, h5pObject)
                .then(h5p_page => res.end(h5p_page))
                .catch(error => res.status(500).end(error.message))
        );
    });

    server.get('/examples/:key', (req, res) => {
        let key = req.params.key;
        let name = path.basename(examples[key].h5p);
        const tempPath = path.resolve('scripts/tmp');
        const tempFilename = path.join(tempPath, name);

        const libraryLoader = async (lib, maj, min) =>
            h5pEditor.libraryManager.loadLibrary(
                new H5PEditor.Library(lib, maj, min)
            );

        exec(`sh scripts/download-example.sh ${examples[key].h5p}`)
            .then(async () => {
                const contentId = await h5pEditor.packageManager.addPackageLibrariesAndContent(
                    tempFilename,
                    { canUpdateAndInstallLibraries: true }
                );
                const h5pObject = await h5pEditor.contentManager.loadH5PJson(
                    contentId
                );
                const contentObject = await h5pEditor.contentManager.loadContent(
                    contentId
                );
                return new H5PPlayer.Player(libraryLoader).render(
                    contentId,
                    contentObject,
                    h5pObject
                );
            })
            .then(h5p_page => res.end(h5p_page))
            .catch(error => res.status(500).end(error.message))
            .finally(() => {
                fs.unlinkSync(tempFilename);
                fs.rmdirSync(tempPath);
            });
    });

    server.get('/edit', async (req, res) => {
        if (!req.query.contentId) {
            res.redirect(
                `?contentId=${await h5pEditor.contentManager.createContentId()}`
            );
        }
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
                h5pEditor.getContentTypeCache().then(contentTypeCache => {
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
                req.body.library
            )
            .then(() => {
                res.status(200).end();
            });
    });

    server.post('/ajax', (req, res) => {
        const { action } = req.query;
        switch (action) {
            case 'libraries':
                h5pEditor
                    .getLibraryOverview(req.body.libraries)
                    .then(libraries => {
                        res.status(200).json(libraries);
                    });
                break;

            case 'files':
                h5pEditor
                    .saveContentFile(
                        req.body.contentId === '0'
                            ? req.query.contentId
                            : req.body.contentId,
                        JSON.parse(req.body.field),
                        req.files.file
                    )
                    .then(response => {
                        res.status(200).json(response);
                    });
                break;

            case 'library-install':
                h5pEditor.installLibrary(req.query.id).then(() =>
                    h5pEditor.getContentTypeCache().then(contentTypeCache => {
                        res.status(200).json({
                            success: true,
                            data: contentTypeCache
                        });
                    })
                );
                break;

            case 'library-upload':
                h5pEditor
                    .uploadPackage(req.files.h5p.data, req.query.contentId)
                    .then(contentId =>
                        Promise.all([
                            h5pEditor.loadH5P(contentId),
                            h5pEditor.getContentTypeCache()
                        ]).then(([content, contentTypes]) =>
                            res.status(200).json({
                                success: true,
                                data: {
                                    h5p: content.h5p,
                                    content: content.params.params,
                                    contentTypes
                                }
                            })
                        )
                    );
                break;

            default:
                res.status(500).end('NOT IMPLEMENTED');
                break;
        }
    });

    server.listen(process.env.PORT || 8080, () => {
        console.log(
            `server running at http://localhost:${process.env.PORT || 8080}`
        );
    });
};

start();
