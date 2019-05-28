// const default_integration = require('./default_integration');
const default_editor_integration = require('./default_editor_integration');
const default_translation = require('./translations/en.json');
const default_renderer = require('./renderers/default');
const content_type_cache = require('./content_type_cache');

// const H5P = require('h5p-nodejs-library');

class H5PEditor {
    constructor(
        library_loader,
        base_url = '/h5p',
        ajax_path = '/ajaxPath?action='
    ) {
        this.library_loader = library_loader;
        // this.h5p = new H5P(library_loader);
        this.renderer = default_renderer;
        this.base_url = base_url;
        this.translation = default_translation;
        this.ajax_path = ajax_path;
    }

    render() {
        const model = {
            styles: this._coreStyles(),
            scripts: this._coreScripts(),
            integration: this._integration()
        };

        return Promise.resolve(this.renderer(model));
    }

    use_renderer(renderer) {
        this.renderer = renderer;
        return this;
    }

    set_ajax_path(ajax_path) {
        this.ajax_path = ajax_path;
        return this;
    }

    content_type_cache() {
        return new Promise(resolve => {
            resolve(content_type_cache);
        });
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
        ].map(file => `${this.base_url}${file}`);
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
        ].map(file => `${this.base_url}${file}`);
    }

    _editor_integration() {
        return Object.assign(default_editor_integration, {
            ajaxPath: this.ajax_path,
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
                ].map(asset => `${this.base_url}${asset}`),
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
                ].map(asset => `${this.base_url}${asset}`)
            }
        });
    }

    _integration() {
        return {
            url: this.base_url,
            postUserStatistics: false,
            saveFreq: false,
            hubIsEnabled: true,
            l10n: {
                H5P: this.translation
            },
            editor: this._editor_integration()
        };
    }
}

module.exports = H5PEditor;
