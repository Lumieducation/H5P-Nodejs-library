require("@babel/core");
require("babel-polyfill");

const os = require("os");
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const fs = require('fs');
const mkdirp = require('mkdirp');
const shortid = require('shortid');

const InMemoryStorage = require('../test/mockups/in-memory-storage');
const H5PEditorConfig = require('../build/config');
const FileLibraryManager = require('../test/mockups/file-library-manager');
const User = require('../test/mockups/user');
const H5PEditor = require('../build');

const server = express();

const valueStorage = new InMemoryStorage();
const config = new H5PEditorConfig(valueStorage);
config.uuid = '8de62c47-f335-42f6-909d-2d8f4b7fb7f5';
const libraryManager = new FileLibraryManager(
    `${path.resolve('')}/h5p/libraries`
);
const user = new User();

const readJson = file => new Promise((y, n) =>
    fs.readFile(file, 'utf8', (err, data) => {
        if (err) return n(err);
        y(JSON.parse(data));
    }))

const h5pEditor = new H5PEditor(
    {
        loadSemantics: (machineName, majorVersion, minorVersion) => {
            return readJson(`h5p/libraries/${machineName}-${majorVersion}.${minorVersion}/semantics.json`)
        },
        loadLibrary: (machineName, majorVersion, minorVersion) => {
            return readJson(`h5p/libraries/${machineName}-${majorVersion}.${minorVersion}/library.json`)
        },
        saveContentFile: (contentId, field, file) => {
            return new Promise(resolve => {
                const dir = `${path.resolve()}/h5p/content/${contentId}/content/`;
                mkdirp(dir, () => {
                    fs.writeFile(`${dir}${file.name}`, file.data, () => {
                        resolve();
                    });
                });
            });
        },
        saveH5P: (contentId, h5pJson) => {
            return new Promise(resolve => {
                const dir = `${path.resolve('')}/h5p/content/${contentId}/`;
                mkdirp(dir, () => {
                    fs.writeFile(
                        `${dir}/h5p.json`,
                        JSON.stringify(h5pJson),
                        'utf8',
                        resolve
                    );
                });
            });
        },
        loadH5PJson: contentId => {
            const dir = `${path.resolve('')}/h5p/content/${contentId}`;

            return readJson(`${dir}/h5p.json`);
        },
        loadContent: contentId => {
            return readJson(`h5p/content/${contentId}/content/content.json`);
        },
        saveContent: (contentId, content) => {
            return new Promise(resolve => {
                const dir = `h5p/content/${contentId}/content`;
                mkdirp(dir, () => {
                    fs.writeFile(
                        `${dir}/content.json`,
                        JSON.stringify(content),
                        'utf8',
                        () => {
                            resolve();
                        }
                    );
                });
            });
        },
        loadLanguage: (machineName, majorVersion, minorVersion, language) => {
            return readJson(`h5p/libraries/${machineName}-${majorVersion}.${minorVersion}/language/${language}.json`)
                .catch(() => null)
        },
        listLanguages: (machineName, majorVersion, minorVersion) => {
            return new Promise(resolve => {
                try {
                    fs.readdir(
                        `${path.resolve()}/h5p/libraries/${machineName}-${majorVersion}.${minorVersion}/language`,
                        (error, files) => {
                            if (error) {
                                resolve([]);
                            }
                            resolve(
                                files.map(file => file.replace('.json', ''))
                            );
                        }
                    );
                } catch (err) {
                    resolve([]);
                }
            });
        },
        saveLibraryFile: (filePath, stream) => {
            const fullPath = `h5p/libraries/${filePath}`;

            return new Promise(y => fs.mkdir(path.dirname(fullPath), { recursive: true }, y))
                .then(() => new Promise(y =>
                    stream.pipe(fs.createWriteStream(fullPath))
                        .on('finish', y)))
        },
        saveContentFile2: (id, filePath, stream) => {
            const fullPath = `h5p/content/${id}/${filePath}`;

            return new Promise(y => fs.mkdir(path.dirname(fullPath), { recursive: true }, y))
                .then(() => new Promise(y =>
                    stream.pipe(fs.createWriteStream(fullPath))
                        .on('finish', y)))
        }
    },
    {
        baseUrl: '/h5p',
        ajaxPath: '/ajax?action=',
        libraryUrl: '/h5p/editor/', // this is confusing as it loads no library but the editor-library files (needed for the ckeditor)
        filesPath: '/h5p/content'
    },
    valueStorage,
    config,
    libraryManager,
    user
);

const h5pRoute = '/h5p';

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

server.use(h5pRoute, express.static(`${path.resolve('')}/h5p`));

server.get('/', (req, res) => {
    if (!req.query.contentId) {
        res.redirect(`?contentId=${shortid()}`);
    }
    h5pEditor.render(req.query.contentId)
        .then(page => res.end(page));
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

server.post('/', (req, res) => {
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
            h5pEditor.getLibraryOverview(req.body.libraries).then(libraries => {
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
            h5pEditor.installLibrary(req.query.id)
                .then(() => h5pEditor.getContentTypeCache()
                    .then(contentTypeCache => {
                        res.status(200).json({ success: true, data: contentTypeCache });
                    }))
            break;

        case 'library-upload':
            h5pEditor.uploadPackage(req.query.contentId, req.files.h5p.data)
                .then(() => Promise.all([
                    h5pEditor.loadH5P(req.query.contentId),
                    h5pEditor.getContentTypeCache()
                ])

                    .then(([content, contentTypes]) =>
                        res.status(200).json({
                            success: true,
                            data: {
                                h5p: content.h5p,
                                content: content.params.params,
                                contentTypes
                            }
                        })))
            break;

        default:
            res.status(500).end('NOT IMPLEMENTED');
            break;
    }
});

server.listen(process.env.PORT || 8080, () => {
    console.log(`server running at http://${os.hostname()}:${process.env.PORT || 8080}`);
});
