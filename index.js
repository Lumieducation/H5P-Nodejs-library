module.exports = {
    JsonStorage: require('./build/src/JsonStorage'),
    InMemoryStorage: require('./build/src/InMemoryStorage'),
    Config: require('./build/src/EditorConfig'),
    FileLibraryStorage: require('./build/src/FileLibraryStorage'),
    FileContentStorage: require('./build/src/FileContentStorage'),
    User: require('./build/src/User'),
    TranslationService: require('./build/src/TranslationService'),
    Editor: require('./build/src/H5PEditor'),
    englishStrings: require('./build/src/translations/en.json'),
    Library: require('./build/src/Library')
};
