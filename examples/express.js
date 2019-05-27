const express = require('express');
const path = require('path');
const server = express();

const h5p = require('../src');

const h5p_route = '/h5p';

server.use(h5p_route, express.static(`${path.resolve('')}/h5p`));

server.get('/', (req, res) => {
    h5p.editor(
        h5p_route,
        {
            integration: {
                url: '/h5p'
            }
        },
        {
            ajaxPath: '/ajax?action='
        }
    )
        .then(h5p_page => {
            res.end(h5p_page);
        })
        .catch(error => {
            throw new Error(error);
        });
});

server.get('/ajax', (req, res) => {
    const { action } = req.query;
    switch (action) {
        case 'content-type-cache':
            h5p.load_content_type_cache().then(content_type_cache => {
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
