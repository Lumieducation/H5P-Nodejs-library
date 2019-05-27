const content_type_cache = require('./content_type_cache');

function load_content_type_cache() {
    return new Promise(resolve => {
        resolve(content_type_cache);
    });
}

module.exports = load_content_type_cache;
