const load_library = require('./load_library');
const load_semantics = require('./load_semantics');

function build_library(name, library_directory) {
    return new Promise(resolve => {
        const library = load_library(name, library_directory);
    });
}
