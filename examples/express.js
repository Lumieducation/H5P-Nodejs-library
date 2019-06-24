const express = require('express');
const path = require('path');
const server = express();
const bodyParser = require('body-parser');
const H5PEditor = require('../src');
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
        }
    },
    {
        baseUrl: '/h5p',
        ajaxPath: '/ajax?action=',
        libraryUrl: '/h5p/editor', // this is confusing as it loads no library but the editor-library files (needed for the ckeditor)
        filesPath: 'filesPath'
    }
);

const h5p_route = '/h5p';

server.use(bodyParser.json());
server.use(
    bodyParser.urlencoded({
        extended: true
    })
);
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
            h5pEditor.contentTypeCache().then(content_type_cache => {
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

server.post('/ajax', (req, res) => {
    const { action } = req.query;
    switch (action) {
        case 'libraries':
        default:
            h5pEditor.getLibraryOverview(req.body.libraries).then(libraries => {
                res.status(200).json(libraries);
            });
    }
});

server.listen(process.env.PORT || 8080, () => {
    console.log('server running at ', process.env.PORT || 8080);
});
