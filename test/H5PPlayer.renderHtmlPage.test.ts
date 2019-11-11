import H5PPlayer from '../src/H5PPlayer';

describe('Rendering the HTML page', () => {
    it('uses default renderer and integration values', () => {
        const contentId = 'foo';
        const contentObject = {
            my: 'content'
        };
        const h5pObject = {};

        return new H5PPlayer(undefined, undefined, undefined, undefined)
            .render(contentId, contentObject, h5pObject as any)
            .then(html => {
                expect(html.replace(/ /g, '')).toBe(
                    `<!doctype html>
                <html class="h5p-iframe">
                <head>
                    <meta charset="utf-8">
                    
                    <link rel="stylesheet" href="/h5p/core/styles/h5p.css"/>
                    <link rel="stylesheet" href="/h5p/core/styles/h5p-confirmation-dialog.css"/>
                    <script src="/h5p/core/js/jquery.js"></script>
                    <script src="/h5p/core/js/h5p.js"></script>
                    <script src="/h5p/core/js/h5p-event-dispatcher.js"></script>
                    <script src="/h5p/core/js/h5p-x-api-event.js"></script>
                    <script src="/h5p/core/js/h5p-x-api.js"></script>
                    <script src="/h5p/core/js/h5p-content-type.js"></script>
                    <script src="/h5p/core/js/h5p-confirmation-dialog.js"></script>
                    <script src="/h5p/core/js/h5p-action-bar.js"></script>
                    <script src="/h5p/core/js/request-queue.js"></script>
                
                    <script>
                        H5PIntegration = {
                  "contents": {
                    "cid-foo": {
                      "contentUrl": "/h5p/content/foo",
                      "displayOptions": {
                        "copy": false,
                        "copyright": false,
                        "embed": false,
                        "export": false,
                        "frame": false,
                        "icon": false
                      },
                      "fullScreen": false,
                      "jsonContent": "{\\"my\\":\\"content\\"}"
                    }
                  },
                  "l10n": {
                    "H5P": {
                      "fullscreen": "Fullscreen",
                      "disableFullscreen": "Disable fullscreen",
                      "download": "Download",
                      "copyrights": "Rights of use",
                      "embed": "Embed",
                      "size": "Size",
                      "showAdvanced": "Show advanced",
                      "hideAdvanced": "Hide advanced",
                      "advancedHelp": "Include this script on your website if you want dynamic sizing of the embedded content:",
                      "copyrightInformation": "Rights of use",
                      "close": "Close",
                      "title": "Title",
                      "author": "Author",
                      "year": "Year",
                      "source": "Source",
                      "license": "License",
                      "thumbnail": "Thumbnail",
                      "noCopyrights": "No copyright information available for this content.",
                      "downloadDescription": "Download this content as a H5P file.",
                      "copyrightsDescription": "View copyright information for this content.",
                      "embedDescription": "View the embed code for this content.",
                      "h5pDescription": "Visit H5P.org to check out more cool content.",
                      "contentChanged": "This content has changed since you last used it.",
                      "startingOver": "You'll be starting over.",
                      "by": "by",
                      "showMore": "Show more",
                      "showLess": "Show less",
                      "subLevel": "Sublevel"
                    }
                  },
                  "postUserStatistics": false,
                  "saveFreq": false,
                  "url": "/h5p"
                };
                    </script>
                </head>
                <body>
                    <div class="h5p-content" data-content-id="foo"></div>
                    <a href="/download?contentId=foo">Download</button>
                </body>
                </html>`.replace(/ /g, '')
                );
            });
    });

    it('resolves the main library', () => {
        const contentId = 'foo';
        const contentObject = {};
        const h5pObject = {
            mainLibrary: 'Foo',
            preloadedDependencies: [
                {
                    machineName: 'Bar'
                },
                {
                    machineName: 'Foo',
                    majorVersion: 4,
                    minorVersion: 2
                }
            ]
        };

        return new H5PPlayer(
            () => Promise.resolve({}) as any,
            undefined,
            undefined,
            undefined
        )
            .useRenderer(model => model)
            .render(contentId, contentObject, h5pObject as any)
            .then(model => {
                expect(
                    (model as any).integration.contents['cid-foo'].library
                ).toBe('Foo 4.2');
            });
    });

    it('includes custom scripts', () => {
        const contentId = 'foo';
        const contentObject = {};
        const h5pObject = {};

        return new H5PPlayer(
            () => {
                return {} as any;
            },
            {},
            {} as any,
            {},
            '<script src="/test" />'
        )
            .useRenderer(model => model)
            .render(contentId, contentObject, h5pObject as any)
            .then(model => {
                expect((model as any).customScripts).toBe(
                    '<script src="/test" />'
                );
            });
    });

    it('includes custom integration', () => {
        const contentId = 'foo';
        const contentObject = {};
        const h5pObject = {};

        return new H5PPlayer(
            () => {
                return {} as any;
            },
            {},
            { integration: 'test' } as any,
            undefined
        )
            .useRenderer(model => model)
            .render(contentId, contentObject, h5pObject as any)
            .then(model => {
                expect((model as any).integration.integration).toBe('test');
            });
    });

    it('includes custom content', () => {
        const contentId = 'foo';
        const contentObject = {};
        const h5pObject = {};

        return new H5PPlayer(
            () => {
                return {} as any;
            },
            {},
            {} as any,
            { test: 'test' }
        )
            .useRenderer(model => model)
            .render(contentId, contentObject, h5pObject as any)
            .then(model => {
                expect(
                    (model as any).integration.contents['cid-foo'].test
                ).toBe('test');
            });
    });

    it('includes custom scripts in the generated html', () => {
        const contentId = 'foo';
        const contentObject = {
            my: 'content'
        };
        const h5pObject = {};

        return new H5PPlayer(
            () => {
                return {} as any;
            },
            {},
            {} as any,
            {},
            '<script src="/test" />'
        )
            .render(contentId, contentObject, h5pObject as any)
            .then(html => {
                expect(html.replace(/ /g, '')).toBe(
                    `<!doctype html>
                    <html class="h5p-iframe">
                    <head>
                        <meta charset="utf-8">
                        
                        <link rel="stylesheet" href="/h5p/core/styles/h5p.css"/>
                        <link rel="stylesheet" href="/h5p/core/styles/h5p-confirmation-dialog.css"/>
                        <script src="/h5p/core/js/jquery.js"></script>
                        <script src="/h5p/core/js/h5p.js"></script>
                        <script src="/h5p/core/js/h5p-event-dispatcher.js"></script>
                        <script src="/h5p/core/js/h5p-x-api-event.js"></script>
                        <script src="/h5p/core/js/h5p-x-api.js"></script>
                        <script src="/h5p/core/js/h5p-content-type.js"></script>
                        <script src="/h5p/core/js/h5p-confirmation-dialog.js"></script>
                        <script src="/h5p/core/js/h5p-action-bar.js"></script>
                        <script src="/h5p/core/js/request-queue.js"></script>
                    
                        <script>
                            H5PIntegration = {
                      "contents": {
                        "cid-foo": {
                          "contentUrl": "/h5p/content/foo",
                          "displayOptions": {
                            "copy": false,
                            "copyright": false,
                            "embed": false,
                            "export": false,
                            "frame": false,
                            "icon": false
                          },
                          "fullScreen": false,
                          "jsonContent": "{\\"my\\":\\"content\\"}"
                        }
                      },
                      "l10n": {
                        "H5P": {
                          "fullscreen": "Fullscreen",
                          "disableFullscreen": "Disable fullscreen",
                          "download": "Download",
                          "copyrights": "Rights of use",
                          "embed": "Embed",
                          "size": "Size",
                          "showAdvanced": "Show advanced",
                          "hideAdvanced": "Hide advanced",
                          "advancedHelp": "Include this script on your website if you want dynamic sizing of the embedded content:",
                          "copyrightInformation": "Rights of use",
                          "close": "Close",
                          "title": "Title",
                          "author": "Author",
                          "year": "Year",
                          "source": "Source",
                          "license": "License",
                          "thumbnail": "Thumbnail",
                          "noCopyrights": "No copyright information available for this content.",
                          "downloadDescription": "Download this content as a H5P file.",
                          "copyrightsDescription": "View copyright information for this content.",
                          "embedDescription": "View the embed code for this content.",
                          "h5pDescription": "Visit H5P.org to check out more cool content.",
                          "contentChanged": "This content has changed since you last used it.",
                          "startingOver": "You'll be starting over.",
                          "by": "by",
                          "showMore": "Show more",
                          "showLess": "Show less",
                          "subLevel": "Sublevel"
                        }
                      },
                      "postUserStatistics": false,
                      "saveFreq": false,
                      "url": "/h5p"
                    };
                        </script><script src="/test" />
                    </head>
                    <body>
                        <div class="h5p-content" data-content-id="foo"></div>
                        <a href="/download?contentId=foo">Download</button>
                    </body>
                    </html>`.replace(/ /g, '')
                );
            });
    });
});
