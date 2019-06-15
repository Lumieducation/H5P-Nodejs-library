const express = require('express');
const path = require('path');

const InMemoryStorage = require('../src/in-memory-storage');
const H5PEditorConfig = require('../src/config');
const FileLibraryManager = require('../src/file-library-manager');
const User = require('../src/user');
const H5PEditor = require('../src');

const server = express();

const storage2 = new InMemoryStorage();
const config = new H5PEditorConfig(storage2);
const libraryManager = new FileLibraryManager(config);
const user = new User();

const h5pEditor = new H5PEditor(
    {
        loadSemantics: (machineName, majorVersion, minorVersion) => {
            return Promise.resolve(
                require(`../h5p/libraries/${machineName}-${majorVersion}.${minorVersion}/semantics.json`)
            );
        }
    },
    '/h5p',
    '/ajax?action=',
    storage2,
    config,
    libraryManager,
    user
);

const h5p_route = '/h5p';

server.use(h5p_route, express.static(`${path.resolve('')}/h5p`));

server.get('/', (req, res) => {
    h5pEditor.render().then(h5p_editor_page => {
        res.end(h5p_editor_page);
    });
});

server.get('/ajax', (req, res) => {
    const { action } = req.query;
    switch (action) {
        case 'content-type-cache':
            h5pEditor.getContentTypeCache().then(content_type_cache => {
                res.status(200).json(content_type_cache);
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

server.listen(process.env.PORT || 8080, () => {
    console.log('server running at ', process.env.PORT || 8080);
});
