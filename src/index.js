const H5P = require('h5p-nodejs-library');

const defaultEditorIntegration = require('./default_editor_integration');
const defaultTranslation = require('./translations/en.json');
const defaultRenderer = require('./renderers/default');

const ContentTypeCache = require('../src/content-type-cache');
const ContentTypeInformationRepository = require('../src/content-type-information-repository');

class H5PEditor {
    constructor(
        storage,
        urls = {
            baseUrl: '/h5p',
            ajaxPath: '/ajax?action=',
            libraryUrl: '/h5p/editor/',
            filesPath: ''
        },
        keyValueStorage,
        config,
        libraryManager,
        user
    ) {
        this.storage = storage;
        this.h5p = new H5P(this.storage.loadLibrary);
        this.renderer = defaultRenderer;
        this.baseUrl = urls.baseUrl;
        this.translation = defaultTranslation;
        this.ajaxPath = urls.ajaxPath;
        this.libraryUrl = urls.libraryUrl;
        this.filesPath = urls.filesPath;
        this.contentTypeCache = new ContentTypeCache(config, keyValueStorage);
        this.contentTypeRepository = new ContentTypeInformationRepository(
            this.contentTypeCache,
            keyValueStorage,
            libraryManager,
            config,
            user
        );
    }

    render() {
        const model = {
            styles: this._coreStyles(),
            scripts: this._coreScripts(),
            integration: this._integration()
        };

        return Promise.resolve(this.renderer(model));
    }

    useRenderer(renderer) {
        this.renderer = renderer;
        return this;
    }

    setAjaxPath(ajaxPath) {
        this.ajaxPath = ajaxPath;
        return this;
    }

    getLibraryData(machineName, majorVersion, minorVersion, language) {
        return this.storage
            .loadSemantics(machineName, majorVersion, minorVersion)
            .then(semantics => {
                return this.storage
                    .loadLibrary(machineName, majorVersion, minorVersion)
                    .then(library => {
                        const assets = {
                            scripts: [],
                            styles: []
                        };
                        return this._loadAssets(
                            library.editorDependencies || [],
                            assets
                        ).then(() => {
                            return this.storage
                                .loadLanguage(
                                    machineName,
                                    majorVersion,
                                    minorVersion,
                                    language
                                )
                                .then(languageObject => {
                                    return this.storage
                                        .listLanguages(
                                            machineName,
                                            majorVersion,
                                            minorVersion
                                        )
                                        .then(languages => {
                                            return Promise.resolve({
                                                name: machineName,
                                                version: {
                                                    major: majorVersion,
                                                    minor: minorVersion
                                                },
                                                semantics,
                                                language: languageObject,
                                                defaultLanguage: null,
                                                javascript: assets.scripts,
                                                css: assets.styles,
                                                translations:
                                                    assets.translations || {},
                                                languages
                                            });
                                        });
                                });
                        });
                    });
            });
    }

    getContentTypeCache() {
        return this.contentTypeRepository.get();
    }

    saveContentFile(contentId, field, file) {
        return new Promise(resolve => {
            this.storage.saveContentFile(contentId, field, file).then(() => {
                resolve({
                    mime: file.mimetype,
                    path: `${file.name}`
                });
            });
        });
    }

    getLibraryOverview(libraries) {
        return Promise.all(
            libraries.map(libraryName => {
                const {
                    machineName,
                    majorVersion,
                    minorVersion
                } = this._parseLibraryString(libraryName);
                return this.storage
                    .loadLibrary(machineName, majorVersion, minorVersion)
                    .then(library => {
                        return {
                            uberName: `${library.machineName} ${
                                library.majorVersion
                            }.${library.minorVersion}`,
                            name: library.machineName,
                            majorVersion: library.majorVersion,
                            minorVersion: library.minorVersion,
                            tutorialUrl: '',
                            title: library.title,
                            runnable: library.runnable,
                            restricted: false,
                            metadataSettings: null
                        };
                    });
            })
        );
    }

    _loadAssets(dependencies, assets, language, loaded = {}) {
        return Promise.all(
            dependencies.map(dependency => {
                const name = dependency.machineName;
                const majVer = dependency.majorVersion;
                const minVer = dependency.minorVersion;

                const key = `${name}-${majVer}.${minVer}`;

                if (key in loaded) return Promise.resolve();
                loaded[key] = true;

                return this.storage
                    .loadLibrary(name, majVer, minVer)
                    .then(lib =>
                        this._loadAssets(
                            lib.preloadedDependencies || [],
                            assets,
                            loaded
                        ).then(() => {
                            this.storage
                                .loadLanguage(
                                    name,
                                    majVer,
                                    minVer,
                                    language || 'en'
                                )
                                .then(translation => {
                                    const path = `${
                                        this.baseUrl
                                    }/libraries/${key}`;
                                    (lib.preloadedCss || []).forEach(asset =>
                                        assets.styles.push(
                                            `${path}/${asset.path}`
                                        )
                                    );
                                    (lib.preloadedJs || []).forEach(script =>
                                        assets.scripts.push(
                                            `${path}/${script.path}`
                                        )
                                    );
                                    assets.translations =
                                        assets.translations || {};
                                    assets.translations[name] = translation;
                                });
                        })
                    );
            })
        );
    }

    // eslint-disable-next-line class-methods-use-this
    _parseLibraryString(libraryName) {
        return {
            machineName: libraryName.split(' ')[0],
            majorVersion: libraryName.split(' ')[1].split('.')[0],
            minorVersion: libraryName.split(' ')[1].split('.')[1]
        };
    }

    _coreScripts() {
        return [
            '/core/js/jquery.js',
            '/core/js/h5p.js',
            '/core/js/h5p-event-dispatcher.js',
            '/core/js/h5p-x-api-event.js',
            '/core/js/h5p-x-api.js',
            '/core/js/h5p-content-type.js',
            '/core/js/h5p-confirmation-dialog.js',
            '/core/js/h5p-action-bar.js',
            '/editor/scripts/h5p-hub-client.js',
            '/editor/scripts/h5peditor-editor.js',
            '/editor/wp/h5p-editor.js',
            '/editor/scripts/h5peditor.js',
            '/editor/scripts/h5peditor-semantic-structure.js',
            '/editor/scripts/h5peditor-library-selector.js',
            '/editor/scripts/h5peditor-form.js',
            '/editor/scripts/h5peditor-text.js',
            '/editor/scripts/h5peditor-html.js',
            '/editor/scripts/h5peditor-number.js',
            '/editor/scripts/h5peditor-textarea.js',
            '/editor/scripts/h5peditor-file-uploader.js',
            '/editor/scripts/h5peditor-file.js',
            '/editor/scripts/h5peditor-image.js',
            '/editor/scripts/h5peditor-image-popup.js',
            '/editor/scripts/h5peditor-av.js',
            '/editor/scripts/h5peditor-group.js',
            '/editor/scripts/h5peditor-boolean.js',
            '/editor/scripts/h5peditor-list.js',
            '/editor/scripts/h5peditor-list-editor.js',
            '/editor/scripts/h5peditor-library.js',
            '/editor/scripts/h5peditor-library-list-cache.js',
            '/editor/scripts/h5peditor-select.js',
            '/editor/scripts/h5peditor-selector-hub.js',
            '/editor/scripts/h5peditor-selector-legacy.js',
            '/editor/scripts/h5peditor-dimensions.js',
            '/editor/scripts/h5peditor-coordinates.js',
            '/editor/scripts/h5peditor-none.js',
            '/editor/scripts/h5peditor-metadata.js',
            '/editor/scripts/h5peditor-metadata-author-widget.js',
            '/editor/scripts/h5peditor-metadata-changelog-widget.js',
            '/editor/scripts/h5peditor-pre-save.js',
            '/editor/ckeditor/ckeditor.js',
            '/editor/wp/h5p-editor.js'
        ].map(file => `${this.baseUrl}${file}`);
    }

    _coreStyles() {
        return [
            '/core/styles/h5p.css',
            '/core/styles/h5p-confirmation-dialog.css',
            '/core/styles/h5p-core-button.css',
            '/editor/libs/darkroom.css',
            '/editor/styles/css/h5p-hub-client.css',
            '/editor/styles/css/fonts.css',
            '/editor/styles/css/application.css',
            '/editor/styles/css/libs/zebra_datepicker.min.css'
        ].map(file => `${this.baseUrl}${file}`);
    }

    _editorIntegration() {
        return Object.assign(defaultEditorIntegration, {
            ajaxPath: this.ajaxPath,
            libraryUrl: this.libraryUrl,
            filesPath: this.filesPath,
            assets: {
                css: [
                    '/core/styles/h5p.css',
                    '/core/styles/h5p-confirmation-dialog.css',
                    '/core/styles/h5p-core-button.css',
                    '/editor/libs/darkroom.css',
                    '/editor/styles/css/h5p-hub-client.css',
                    '/editor/styles/css/fonts.css',
                    '/editor/styles/css/application.css',
                    '/editor/styles/css/libs/zebra_datepicker.min.css'
                ].map(asset => `${this.baseUrl}${asset}`),
                js: [
                    '/core/js/jquery.js',
                    '/core/js/h5p.js',
                    '/core/js/h5p-event-dispatcher.js',
                    '/core/js/h5p-x-api-event.js',
                    '/core/js/h5p-x-api.js',
                    '/core/js/h5p-content-type.js',
                    '/core/js/h5p-confirmation-dialog.js',
                    '/core/js/h5p-action-bar.js',
                    '/editor/scripts/h5p-hub-client.js',
                    '/editor/scripts/h5peditor.js',
                    '/editor/language/en.js',
                    '/editor/scripts/h5peditor-semantic-structure.js',
                    '/editor/scripts/h5peditor-library-selector.js',
                    '/editor/scripts/h5peditor-form.js',
                    '/editor/scripts/h5peditor-text.js',
                    '/editor/scripts/h5peditor-html.js',
                    '/editor/scripts/h5peditor-number.js',
                    '/editor/scripts/h5peditor-textarea.js',
                    '/editor/scripts/h5peditor-file-uploader.js',
                    '/editor/scripts/h5peditor-file.js',
                    '/editor/scripts/h5peditor-image.js',
                    '/editor/scripts/h5peditor-image-popup.js',
                    '/editor/scripts/h5peditor-av.js',
                    '/editor/scripts/h5peditor-group.js',
                    '/editor/scripts/h5peditor-boolean.js',
                    '/editor/scripts/h5peditor-list.js',
                    '/editor/scripts/h5peditor-list-editor.js',
                    '/editor/scripts/h5peditor-library.js',
                    '/editor/scripts/h5peditor-library-list-cache.js',
                    '/editor/scripts/h5peditor-select.js',
                    '/editor/scripts/h5peditor-selector-hub.js',
                    '/editor/scripts/h5peditor-selector-legacy.js',
                    '/editor/scripts/h5peditor-dimensions.js',
                    '/editor/scripts/h5peditor-coordinates.js',
                    '/editor/scripts/h5peditor-none.js',
                    '/editor/scripts/h5peditor-metadata.js',
                    '/editor/scripts/h5peditor-metadata-author-widget.js',
                    '/editor/scripts/h5peditor-metadata-changelog-widget.js',
                    '/editor/scripts/h5peditor-pre-save.js',
                    '/editor/ckeditor/ckeditor.js'
                ].map(asset => `${this.baseUrl}${asset}`)
            }
        });
    }

    _integration() {
        return {
            url: this.baseUrl,
            postUserStatistics: false,
            saveFreq: false,
            hubIsEnabled: true,
            l10n: {
                H5P: this.translation
            },
            editor: this._editorIntegration()
        };
    }
}

module.exports = H5PEditor;
