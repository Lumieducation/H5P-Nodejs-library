module.exports = {
    JsonStorage: require('./build/src/JsonStorage').default,
    InMemoryStorage: require('./build/src/InMemoryStorage').default,
    Config: require('./build/src/EditorConfig').default,
    FileLibraryStorage: require('./build/src/FileLibraryStorage').default,
    FileContentStorage: require('./build/src/FileContentStorage').default,
    User: require('./build/src/User').default,
    TranslationService: require('./build/src/TranslationService').default,
    Editor: require('./build/src/H5PEditor').default,
    englishStrings: require('./build/src/translations/en.json'),
    Library: require('./build/src/Library').default
};
