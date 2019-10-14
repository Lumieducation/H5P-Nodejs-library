module.exports = {
    TranslationService: require('./build/src/TranslationService').default,
    Editor: require('./build/src/H5PEditor').default,
    englishStrings: require('./build/src/translations/translations/en.json'),
    PackageExporter: require('./build/src/PackageExporter').default,
    Player: require('./build/src/H5PPlayer').default,
    Library: require('./build/src/Library').default
};
