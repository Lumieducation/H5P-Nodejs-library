module.exports = {
    Editor: require('./build/src/H5PEditor').default,
    englishStrings: require('./build/src/translations/translations/en.json'),
    LibraryName: require('./build/src/LibraryName').default,
    PackageExporter: require('./build/src/PackageExporter').default,
    Player: require('./build/src/H5PPlayer').default,
    TranslationService: require('./build/src/TranslationService').default
};
