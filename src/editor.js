const default_integration = require('./default_integration');
const default_editor_integration = require('./default_editor_integration');

function editor(url_prefix, options, editor_integration) {
    return new Promise(resolve => {
        const assets = {
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
            ],
            css: [
                '/core/styles/h5p.css',
                '/core/styles/h5p-confirmation-dialog.css',
                '/core/styles/h5p-core-button.css',
                '/editor/libs/darkroom.css',
                '/editor/styles/css/h5p-hub-client.css',
                '/editor/styles/css/fonts.css',
                '/editor/styles/css/application.css',
                '/editor/styles/css/libs/zebra_datepicker.min.css'
            ]
        };

        const h5p_editor_page = `<html>
                <head>
            <script> window.H5PIntegration = parent.H5PIntegration || ${JSON.stringify(
                Object.assign(default_integration, options.integration, {
                    editor: Object.assign(
                        default_editor_integration,
                        editor_integration,
                        {
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
                                ].map(asset => `${url_prefix}${asset}`),
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
                                ].map(asset => `${url_prefix}${asset}`)
                            }
                        }
                    )
                })
            )}</script>
            ${assets.css
                .map(
                    asset =>
                        `<link rel="stylesheet" href="${url_prefix}${asset}">`
                )
                .reduce((p, c) => p + c, '')}
            ${assets.js
                .map(asset => `<script src="${url_prefix}${asset}"></script>`)
                .reduce((p, c) => p + c, '')}
            </head>
            <body>
            <form method="post" enctype="multipart/form-data" id="h5p-content-form"><div id="post-body-content"><div class="h5p-create"><div class="h5p-editor"></div></div></div><input type="submit" name="submit" value="Create" class="button button-primary button-large"></form>
            </body>
            </html>`;

        resolve(h5p_editor_page);
    });
}

module.exports = editor;
