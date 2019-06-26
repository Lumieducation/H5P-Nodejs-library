const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const fs = require('fs');
const mkdirp = require('mkdirp');
const InMemoryStorage = require('../test/mockups/in-memory-storage');
const H5PEditorConfig = require('../src/config');
const FileLibraryManager = require('../test/mockups/file-library-manager');
const User = require('../test/mockups/user');
const H5PEditor = require('../src');

const server = express();

const valueStorage = new InMemoryStorage();
const config = new H5PEditorConfig(valueStorage);
config.uuid = '8de62c47-f335-42f6-909d-2d8f4b7fb7f5';
const libraryManager = new FileLibraryManager(
    `${path.resolve('')}/h5p/libraries`
);
const user = new User();

const h5pEditor = new H5PEditor(
    {
        loadSemantics: (machineName, majorVersion, minorVersion) => {
            return Promise.resolve(
                require(`../h5p/libraries/${machineName}-${majorVersion}.${minorVersion}/semantics.json`)
            );
        },
        loadLibrary: (machineName, majorVersion, minorVersion) => {
            return Promise.resolve(
                require(`../h5p/libraries/${machineName}-${majorVersion}.${minorVersion}/library.json`)
            );
        },
        saveContentFile: (contentId, field, file) => {
            return new Promise(resolve => {
                const dir =
                    contentId === '0'
                        ? `${path.resolve('')}/h5p/tmp/`
                        : `${path.resolve()}/h5p/content/${contentId}/content/`;
                mkdirp(dir, mkdirp_error => {
                    fs.writeFile(`${dir}${file.name}`, file.data, error => {
                        resolve();
                    });
                });
            });
        }
    },
    {
        baseUrl: '/h5p',
        ajaxPath: '/ajax?action=',
        libraryUrl: '/h5p/editor/', // this is confusing as it loads no library but the editor-library files (needed for the ckeditor)
        filesPath: '/h5p/tmp'
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
    h5pEditor.render().then(h5pEditorPage => {
        res.end(h5pEditorPage);
    });
});

server.get('/ajax', (req, res) => {
    const { action } = req.query;
    switch (action) {
        case 'content-type-cache':
            h5pEditor.getContentTypeCache().then(contentTypeCache => {
                res.status(200).json(contentTypeCache);
            });
            break;

        case 'libraries':
            const { majorVersion, minorVersion, machineName } = req.query;
            h5pEditor
                .getLibraryData(machineName, majorVersion, minorVersion)
                .then(library => {
                    res.status(200).json(library);
                });
            break;

        default:
            res.status(400).end();
            break;
    }
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
                    req.body.contentId,
                    JSON.parse(req.body.field),
                    req.files.file
                )
                .then(response => {
                    res.status(200).json(response);
                });
            break;
        default:
            res.status(500).end('NOT IMPLEMENTED');
            break;
    }
});

server.listen(process.env.PORT || 8080, () => {
    console.log('server running at ', process.env.PORT || 8080);
});
