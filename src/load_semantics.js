const path = require('path');

function load_semantics(library_directory, name) {
    return require(path.join(library_directory, name, 'semantics.json'));
}

module.exports = load_semantics;
