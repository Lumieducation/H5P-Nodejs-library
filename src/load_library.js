function load_library(name, library_directory) {
    return require(`${library_directory}/${name}/library.json`);
}
module.exports = load_library;
