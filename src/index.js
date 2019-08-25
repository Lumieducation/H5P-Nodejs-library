const { withFile } = require('tmp-promise');
const promisePipe = require('promisepipe');
const fs = require('fs-extra');
const stream = require('stream');

const defaultEditorIntegration = require('../assets/default_editor_integration');
const defaultTranslation = require('../assets/translations/en.json');
const defaultRenderer = require('./renderers/default');

const ContentTypeCache = require('../src/content-type-cache');
const ContentTypeInformationRepository = require('../src/content-type-information-repository');
const H5pError = require("./helpers/h5p-error");
const PackageManager = require('./package-manager').default;

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
        contentManager,
        user,
        translationService
    ) {
        this.storage = storage;
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
            user,
            translationService
        );
        this.libraryManager = libraryManager;
        this.contentManager = contentManager;
        this.translationService = translationService;
        this.config = config;
        this.user = user;
    }

    render(contentId) {
        const model = {
            styles: this._coreStyles(),
            scripts: this._coreScripts(),
            integration: this._integration(contentId)
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

    saveH5P(contentId, content, metadata, library) {
        return this.storage.saveContent(contentId, content)
            .then(() => this._generateH5PJSON(metadata, library))
            .then(h5pJson => this.storage.saveH5P(contentId, h5pJson))
    }

    loadH5P(contentId) {
        return Promise.all([
            this.storage.loadH5PJson(contentId),
            this.storage.loadContent(contentId)
        ])
            .then(([h5pJson, content]) => ({
                library: this._getUbernameFromH5pJson(h5pJson),
                h5p: h5pJson,
                params: {
                    params: content,
                    metadata: h5pJson
                }
            }))
    }

    getLibraryData(machineName, majorVersion, minorVersion, language) {
        return Promise.all([
            this._loadAssets(machineName, majorVersion, minorVersion, language),
            this.storage.loadSemantics(machineName, majorVersion, minorVersion),
            this.storage.loadLanguage(machineName, majorVersion, minorVersion, language),
            this.storage.listLanguages(machineName, majorVersion, minorVersion)
        ])
            .then(([
                assets,
                semantics,
                languageObject,
                languages
            ]) => ({
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
                translations: assets.translations,
                languages
            }))
    }

    _loadAssets(machineName, majorVersion, minorVersion, language, loaded = {}) {
        const key = `${machineName}-${majorVersion}.${minorVersion}`;
        const path = `${this.baseUrl}/libraries/${key}`;

        if (key in loaded) return Promise.resolve(null);
        loaded[key] = true;

        const assets = {
            scripts: [],
            styles: [],
            translations: {}
        };

        return Promise.all([
            this.storage.loadLibrary(machineName, majorVersion, minorVersion),
            this.storage.loadLanguage(machineName, majorVersion, minorVersion, language || 'en')
        ])
            .then(([library, translation]) =>
                Promise.all([
                    this._resolveDependencies(library.preloadedDependencies || [], language, loaded),
                    this._resolveDependencies(library.editorDependencies || [], language, loaded)
                ])
                    .then(combinedDependencies => {

                        combinedDependencies.forEach(dependencies =>
                            dependencies.forEach(dependency => {
                                dependency.scripts.forEach(script =>
                                    assets.scripts.push(script));
                                dependency.styles.forEach(script =>
                                    assets.styles.push(script));
                                Object.keys(dependency.translations).forEach(k => {
                                    assets.translations[k] = dependency.translations[k]
                                });
                            }));

                        (library.preloadedJs || []).forEach(script => assets.scripts.push(`${path}/${script.path}`));
                        (library.preloadedCss || []).forEach(style => assets.styles.push(`${path}/${style.path}`));
                        assets.translations[machineName] = translation || undefined;
                    }))

            .then(() => assets)
    }

    _resolveDependencies(originalDependencies, language, loaded) {
        const dependencies = originalDependencies.slice();
        const resolved = [];

        const resolve = dependency => {
            if (!dependency) return Promise.resolve(resolved)

            return this._loadAssets(dependency.machineName, dependency.majorVersion, dependency.minorVersion, language, loaded)
                .then(assets => assets ? resolved.push(assets) : null)
                .then(() => resolve(dependencies.shift()))
        }

        return resolve(dependencies.shift())
    }

    getContentTypeCache() {
        return this.contentTypeRepository.get();
    }

    saveContentFile(contentId, field, file) {
        const dataStream = new stream.PassThrough();
        dataStream.end(file.data);

        return this.storage.saveContentFile(contentId, `content/${file.name}`, dataStream)
            .then(() => ({
                mime: file.mimetype,
                path: file.name
            }))
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

    _generateH5PJSON(metadata, _library) {
        return new Promise(resolve => {
            const lib = this._parseLibraryString(_library);
            this.storage
                .loadLibrary(
                    lib.machineName,
                    lib.majorVersion,
                    lib.minorVersion
                )
                .then(library => {
                    const h5pJson = Object.assign({}, metadata, {
                        mainLibrary: library.machineName,
                        preloadedDependencies: [
                            ...library.preloadedDependencies,
                            {
                                machineName: library.machineName,
                                majorVersion: library.majorVersion,
                                minorVersion: library.minorVersion
                            }
                        ]
                    });

                    resolve(h5pJson);
                });
        });
    }

    // eslint-disable-next-line class-methods-use-this
    _getUbernameFromH5pJson(h5pJson) {
        const library = h5pJson.preloadedDependencies.filter(
            dependency => dependency.machineName === h5pJson.mainLibrary
        )[0];
        return `${library.machineName} ${library.majorVersion}.${
            library.minorVersion
            }`;
    }

    // eslint-disable-next-line class-methods-use-this
    _parseLibraryString(libraryName) {
        return {
            machineName: libraryName.split(' ')[0],
            majorVersion: libraryName.split(' ')[1].split('.')[0],
            minorVersion: libraryName.split(' ')[1].split('.')[1]
        };
    }

    /**
     * Installs a content type from the H5P Hub.
     * @param {string} id The name of the content type to install (e.g. H5P.Test-1.0)
     * @returns {Promise<true>} true if successful. Will throw errors if something goes wrong.
     */
    async installLibrary(id) {
        return this.contentTypeRepository.install(id);
    }

    /**
     * Adds the contents of a package to the system.
     * @param {*} data The data (format?)
     * @param {*} contentId (optional) the content id of the uploaded package
     * @returns {Promise<string>} the newly created content it or the one passed to it
     */
    async uploadPackage(data, contentId) {
        const dataStream = new stream.PassThrough();
        dataStream.end(data);

        await withFile(async ({ path: tempPackagePath }) => {
            const writeStream = fs.createWriteStream(tempPackagePath);
            try {
                await promisePipe(dataStream, writeStream);
            }
            catch (error) {
                throw new H5pError(this.translationService.getTranslation("upload-package-failed-tmp"));
            }
            const packageManger = new PackageManager(this.libraryManager, this.translationService, this.config, this.contentManager);
            contentId = await packageManger.addPackageLibrariesAndContent(tempPackagePath, this.user, contentId);
        }, { postfix: '.h5p', keep: false });

        return contentId;
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

    _editorIntegration(contentId) {
        return Object.assign(defaultEditorIntegration, {
            ajaxPath: this.ajaxPath,
            libraryUrl: this.libraryUrl,
            filesPath: `${this.filesPath}/${contentId}/content`,
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

    _integration(contentId) {
        return {
            url: this.baseUrl,
            postUserStatistics: false,
            saveFreq: false,
            hubIsEnabled: true,
            l10n: {
                H5P: this.translation
            },
            editor: this._editorIntegration(contentId)
        };
    }
}

module.exports = H5PEditor;
