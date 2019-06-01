const express = require('express');
const path = require('path');
const server = express();

const H5PEditor = require('../src');
const h5pEditor = new H5PEditor(() => {}, '/h5p', '/ajax?action=');

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
            h5pEditor.contentTypeCache().then(content_type_cache => {
                res.status(200).json(content_type_cache);
            });
            break;

        case 'libraries':
            res.status(500).end('NOT IMPLEMENTED');
            break;

        default:
            res.status(400).end();
            break;
    }
});

server.listen(process.env.PORT || 8080, () => {
    console.log('server running at ', process.env.PORT || 8080);
});
