import H5PPlayer from '../src/H5PPlayer';
import H5PConfig from '../src/implementation/H5PConfig';
import { ILibraryName, ILibraryMetadata } from '../src/types';
import User from './User';

describe('Rendering the HTML page', () => {
    it('uses default renderer and integration values', () => {
        const contentId = 'foo';
        const contentObject = {
            my: 'content'
        };
        const h5pObject = {};
        const config = new H5PConfig(undefined);
        return new H5PPlayer(undefined, undefined, config)
            .render(contentId, new User(), {
                parametersOverride: contentObject,
                metadataOverride: h5pObject as any
            })
            .then((html) => {
                expect(html.replace(/ /g, '')).toBe(
                    `<!doctype html>
                <html class="h5p-iframe">
                <head>
                    <meta charset="utf-8">
                    
                    <link rel="stylesheet" href="/h5p/core/styles/h5p.css?version=${config.h5pVersion}"/>
                    <link rel="stylesheet" href="/h5p/core/styles/h5p-confirmation-dialog.css?version=${config.h5pVersion}"/>
                    <link rel="stylesheet" href="/h5p/core/styles/h5p-core-button.css?version=${config.h5pVersion}"/>
                    <script src="/h5p/core/js/jquery.js?version=${config.h5pVersion}"></script>
                    <script src="/h5p/core/js/h5p.js?version=${config.h5pVersion}"></script>
                    <script src="/h5p/core/js/h5p-event-dispatcher.js?version=${config.h5pVersion}"></script>
                    <script src="/h5p/core/js/h5p-x-api-event.js?version=${config.h5pVersion}"></script>
                    <script src="/h5p/core/js/h5p-x-api.js?version=${config.h5pVersion}"></script>
                    <script src="/h5p/core/js/h5p-content-type.js?version=${config.h5pVersion}"></script>
                    <script src="/h5p/core/js/h5p-confirmation-dialog.js?version=${config.h5pVersion}"></script>
                    <script src="/h5p/core/js/h5p-action-bar.js?version=${config.h5pVersion}"></script>
                    <script src="/h5p/core/js/request-queue.js?version=${config.h5pVersion}"></script>
                
                    <script>
                        window.H5PIntegration = {
                  "ajax":{
                     "contentUserData":"/h5p/contentUserData",
                     "setFinished":"/h5p/setFinished"
                  },
                  "ajaxPath":"/h5p/ajax?action=",
                  "contents": {
                    "cid-foo": {
                      "displayOptions": {
                        "copy": false,
                        "copyright": false,
                        "embed": false,
                        "export": false,
                        "frame": false,
                        "icon": false
                      },
                      "fullScreen": "0",
                      "jsonContent": "{\\"my\\":\\"content\\"}",
                      "metadata":{
                        "license":"U",
                        "title":"",
                        "defaultLanguage":"en"
                       },                       
                        "scripts":[],
                        "styles":[]
                    }
                  },
                  "core":{
                    "scripts":[
                    "/h5p/core/js/jquery.js?version=${config.h5pVersion}",
                    "/h5p/core/js/h5p.js?version=${config.h5pVersion}",
                    "/h5p/core/js/h5p-event-dispatcher.js?version=${config.h5pVersion}",
                    "/h5p/core/js/h5p-x-api-event.js?version=${config.h5pVersion}",
                    "/h5p/core/js/h5p-x-api.js?version=${config.h5pVersion}",
                    "/h5p/core/js/h5p-content-type.js?version=${config.h5pVersion}",
                    "/h5p/core/js/h5p-confirmation-dialog.js?version=${config.h5pVersion}",
                    "/h5p/core/js/h5p-action-bar.js?version=${config.h5pVersion}",
                    "/h5p/core/js/request-queue.js?version=${config.h5pVersion}"
                    ],
                    "styles":[
                    "/h5p/core/styles/h5p.css?version=${config.h5pVersion}",
                    "/h5p/core/styles/h5p-confirmation-dialog.css?version=${config.h5pVersion}",
                    "/h5p/core/styles/h5p-core-button.css?version=${config.h5pVersion}"
                    ]
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
                        "reuse": "Reuse",
                        "reuseContent": "Reuse Content",
                        "reuseDescription": "Reuse this content.",
                        "downloadDescription": "Download this content as a H5P file.",
                        "copyrightsDescription": "View copyright information for this content.",
                        "embedDescription": "View the embed code for this content.",
                        "h5pDescription": "Visit H5P.org to check out more cool content.",
                        "contentChanged": "This content has changed since you last used it.",
                        "startingOver": "You'll be starting over.",
                        "by": "by",
                        "showMore": "Show more",
                        "showLess": "Show less",
                        "subLevel": "Sublevel",
                        "confirmDialogHeader": "Confirm action",
                        "confirmDialogBody": "Please confirm that you wish to proceed. This action is not reversible.",
                        "cancelLabel": "Cancel",
                        "confirmLabel": "Confirm",
                        "licenseU": "Undisclosed",
                        "licenseCCBY": "Attribution",
                        "licenseCCBYSA": "Attribution-ShareAlike",
                        "licenseCCBYND": "Attribution-NoDerivs",
                        "licenseCCBYNC": "Attribution-NonCommercial",
                        "licenseCCBYNCSA": "Attribution-NonCommercial-ShareAlike",
                        "licenseCCBYNCND": "Attribution-NonCommercial-NoDerivs",
                        "licenseCC40": "4.0 International",
                        "licenseCC30": "3.0 Unported",
                        "licenseCC25": "2.5 Generic",
                        "licenseCC20": "2.0 Generic",
                        "licenseCC10": "1.0 Generic",
                        "licenseGPL": "General Public License",
                        "licenseV3": "Version 3",
                        "licenseV2": "Version 2",
                        "licenseV1": "Version 1",
                        "licensePD": "Public Domain",
                        "licenseCC010": "CC0 1.0 Universal (CC0 1.0) Public Domain Dedication",
                        "licensePDM": "Public Domain Mark",
                        "licenseC": "Copyright",
                        "contentType": "Content Type",
                        "licenseExtras": "License Extras",
                        "changes": "Changelog",
                        "contentCopied": "Content is copied to the clipboard",
                        "connectionLost": "Connection lost. Results will be stored and sent when you regain connection.",
                        "connectionReestablished": "Connection reestablished.",
                        "resubmitScores": "Attempting to submit stored results.",
                        "offlineDialogHeader": "Your connection to the server was lost",
                        "offlineDialogBody": "We were unable to send information about your completion of this task. Please check your internet connection.",
                        "offlineDialogRetryMessage": "Retrying in :num....",
                        "offlineDialogRetryButtonLabel": "Retry now",
                        "offlineSuccessfulSubmit": "Successfully submitted results."
                    }
                  },
                  "postUserStatistics": false,
                  "saveFreq": false,
                  "url": "/h5p",
                  "hubIsEnabled": true,
                  "fullscreenDisabled": 0,
                  "user":{
                    "name":"FirstnameSurname",
                    "mail":"test@example.com",
                    "id":"1"
                  }
                };
                    </script>
                </head>
                <body>
                    <div class="h5p-content" data-content-id="foo"></div>
                    <a href="/h5p/download/foo">Download</button>
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
                    machineName: 'Bar',
                    majorVersion: 1,
                    minorVersion: 0
                },
                {
                    machineName: 'Foo',
                    majorVersion: 4,
                    minorVersion: 2
                }
            ]
        };

        const mockLibraryStorage: any = {
            getLibrary: async (libName: ILibraryName) => {
                return {};
            }
        };

        return new H5PPlayer(
            mockLibraryStorage,
            undefined,
            new H5PConfig(undefined)
        )
            .setRenderer((model) => model)
            .render(contentId, new User(), {
                parametersOverride: contentObject,
                metadataOverride: h5pObject as any
            })
            .then((model) => {
                expect(
                    (model as any).integration.contents['cid-foo'].library
                ).toBe('Foo 4.2');
            });
    });

    it('includes custom scripts and styles', async () => {
        const contentId = 'foo';
        const contentObject = {};
        const h5pObject = {};

        const mockLibraryStorage: any = {
            getLibrary: async (libName: ILibraryName) => {
                return {};
            }
        };

        const player = new H5PPlayer(
            mockLibraryStorage,
            undefined,
            new H5PConfig(undefined),
            undefined,
            undefined,
            {
                customization: {
                    global: {
                        scripts: ['/test.js'],
                        styles: ['/test.css']
                    }
                }
            }
        );
        player.setRenderer((mod) => mod);
        const model = await player.render(contentId, new User(), {
            parametersOverride: contentObject,
            metadataOverride: h5pObject as any
        });

        expect((model as any).scripts.includes('/test.js')).toEqual(true);
        expect((model as any).styles.includes('/test.css')).toEqual(true);
    });

    it('includes custom integration', () => {
        const contentId = 'foo';
        const contentObject = {};
        const h5pObject = {};

        return new H5PPlayer(undefined, undefined, new H5PConfig(undefined), {
            integration: 'test'
        } as any)
            .setRenderer((model) => model)
            .render(contentId, new User(), {
                parametersOverride: contentObject,
                metadataOverride: h5pObject as any
            })
            .then((model) => {
                expect((model as any).integration.integration).toBe('test');
            });
    });

    it('includes custom scripts and styles in the generated html', () => {
        const contentId = 'foo';
        const contentObject = {
            my: 'content'
        };
        const h5pObject = {};
        const config = new H5PConfig(undefined);

        return new H5PPlayer(
            undefined,
            undefined,
            new H5PConfig(undefined),
            undefined,
            undefined,
            {
                customization: {
                    global: {
                        scripts: ['/test.js'],
                        styles: ['/test.css']
                    }
                }
            }
        )
            .render(contentId, new User(), {
                parametersOverride: contentObject,
                metadataOverride: h5pObject as any
            })
            .then((html) => {
                expect(html.replace(/ /g, '')).toBe(
                    `<!doctype html>
                    <html class="h5p-iframe">
                    <head>
                        <meta charset="utf-8">
                        
                        <link rel="stylesheet" href="/h5p/core/styles/h5p.css?version=${config.h5pVersion}"/>
                        <link rel="stylesheet" href="/h5p/core/styles/h5p-confirmation-dialog.css?version=${config.h5pVersion}"/>
                        <link rel="stylesheet" href="/h5p/core/styles/h5p-core-button.css?version=${config.h5pVersion}"/>
                        <link rel="stylesheet" href="/test.css"/>
                        <script src="/h5p/core/js/jquery.js?version=${config.h5pVersion}"></script>
                        <script src="/h5p/core/js/h5p.js?version=${config.h5pVersion}"></script>
                        <script src="/h5p/core/js/h5p-event-dispatcher.js?version=${config.h5pVersion}"></script>
                        <script src="/h5p/core/js/h5p-x-api-event.js?version=${config.h5pVersion}"></script>
                        <script src="/h5p/core/js/h5p-x-api.js?version=${config.h5pVersion}"></script>
                        <script src="/h5p/core/js/h5p-content-type.js?version=${config.h5pVersion}"></script>
                        <script src="/h5p/core/js/h5p-confirmation-dialog.js?version=${config.h5pVersion}"></script>
                        <script src="/h5p/core/js/h5p-action-bar.js?version=${config.h5pVersion}"></script>
                        <script src="/h5p/core/js/request-queue.js?version=${config.h5pVersion}"></script>
                        <script src="/test.js"></script>
                    
                        <script>
                            window.H5PIntegration = {
                      "ajax":{
                         "contentUserData":"/h5p/contentUserData",
                         "setFinished":"/h5p/setFinished"
                       },
                      "ajaxPath":"/h5p/ajax?action=",
                      "contents": {
                        "cid-foo": {
                          "displayOptions": {
                            "copy": false,
                            "copyright": false,
                            "embed": false,
                            "export": false,
                            "frame": false,
                            "icon": false
                          },
                          "fullScreen": "0",
                          "jsonContent": "{\\"my\\":\\"content\\"}",
                          "metadata":{
                            "license":"U",
                            "title":"",
                            "defaultLanguage":"en"
                          },
                          "scripts":[],
                          "styles":[]
                        }
                      },
                      "core":{
                          "scripts":[
                          "/h5p/core/js/jquery.js?version=${config.h5pVersion}",
                          "/h5p/core/js/h5p.js?version=${config.h5pVersion}",
                          "/h5p/core/js/h5p-event-dispatcher.js?version=${config.h5pVersion}",
                          "/h5p/core/js/h5p-x-api-event.js?version=${config.h5pVersion}",
                          "/h5p/core/js/h5p-x-api.js?version=${config.h5pVersion}",
                          "/h5p/core/js/h5p-content-type.js?version=${config.h5pVersion}",
                          "/h5p/core/js/h5p-confirmation-dialog.js?version=${config.h5pVersion}",
                          "/h5p/core/js/h5p-action-bar.js?version=${config.h5pVersion}",
                          "/h5p/core/js/request-queue.js?version=${config.h5pVersion}",
                          "/test.js"
                          ],
                          "styles":[
                          "/h5p/core/styles/h5p.css?version=${config.h5pVersion}",
                          "/h5p/core/styles/h5p-confirmation-dialog.css?version=${config.h5pVersion}",
                          "/h5p/core/styles/h5p-core-button.css?version=${config.h5pVersion}",
                          "/test.css"
                          ]
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
                            "reuse": "Reuse",
                            "reuseContent": "Reuse Content",
                            "reuseDescription": "Reuse this content.",
                            "downloadDescription": "Download this content as a H5P file.",
                            "copyrightsDescription": "View copyright information for this content.",
                            "embedDescription": "View the embed code for this content.",
                            "h5pDescription": "Visit H5P.org to check out more cool content.",
                            "contentChanged": "This content has changed since you last used it.",
                            "startingOver": "You'll be starting over.",
                            "by": "by",
                            "showMore": "Show more",
                            "showLess": "Show less",
                            "subLevel": "Sublevel",
                            "confirmDialogHeader": "Confirm action",
                            "confirmDialogBody": "Please confirm that you wish to proceed. This action is not reversible.",
                            "cancelLabel": "Cancel",
                            "confirmLabel": "Confirm",
                            "licenseU": "Undisclosed",
                            "licenseCCBY": "Attribution",
                            "licenseCCBYSA": "Attribution-ShareAlike",
                            "licenseCCBYND": "Attribution-NoDerivs",
                            "licenseCCBYNC": "Attribution-NonCommercial",
                            "licenseCCBYNCSA": "Attribution-NonCommercial-ShareAlike",
                            "licenseCCBYNCND": "Attribution-NonCommercial-NoDerivs",
                            "licenseCC40": "4.0 International",
                            "licenseCC30": "3.0 Unported",
                            "licenseCC25": "2.5 Generic",
                            "licenseCC20": "2.0 Generic",
                            "licenseCC10": "1.0 Generic",
                            "licenseGPL": "General Public License",
                            "licenseV3": "Version 3",
                            "licenseV2": "Version 2",
                            "licenseV1": "Version 1",
                            "licensePD": "Public Domain",
                            "licenseCC010": "CC0 1.0 Universal (CC0 1.0) Public Domain Dedication",
                            "licensePDM": "Public Domain Mark",
                            "licenseC": "Copyright",
                            "contentType": "Content Type",
                            "licenseExtras": "License Extras",
                            "changes": "Changelog",
                            "contentCopied": "Content is copied to the clipboard",
                            "connectionLost": "Connection lost. Results will be stored and sent when you regain connection.",
                            "connectionReestablished": "Connection reestablished.",
                            "resubmitScores": "Attempting to submit stored results.",
                            "offlineDialogHeader": "Your connection to the server was lost",
                            "offlineDialogBody": "We were unable to send information about your completion of this task. Please check your internet connection.",
                            "offlineDialogRetryMessage": "Retrying in :num....",
                            "offlineDialogRetryButtonLabel": "Retry now",
                            "offlineSuccessfulSubmit": "Successfully submitted results."
                        }
                      },
                      "postUserStatistics": false,
                      "saveFreq": false,
                      "url": "/h5p",
                      "hubIsEnabled": true,
                      "fullscreenDisabled": 0,
                      "user":{
                        "name":"FirstnameSurname",
                        "mail":"test@example.com",
                        "id":"1"
                      }
                    };
                        </script>
                    </head>
                    <body>
                        <div class="h5p-content" data-content-id="foo"></div>
                        <a href="/h5p/download/foo">Download</button>
                    </body>
                    </html>`.replace(/ /g, '')
                );
            });
    });

    it('includes custom scripts and styles for certain content types', async () => {
        const contentId = 'foo';
        const contentObject = {};
        const h5pObject = {
            mainLibrary: 'Foo',
            preloadedDependencies: [
                {
                    machineName: 'Foo',
                    majorVersion: 1,
                    minorVersion: 0
                }
            ]
        };

        const mockLibraryStorage: any = {
            getLibrary: async (
                libName: ILibraryName
            ): Promise<ILibraryMetadata> => {
                return {
                    machineName: 'Foo',
                    majorVersion: 1,
                    minorVersion: 0,
                    patchVersion: 0,
                    runnable: 1,
                    title: 'Foo',
                    preloadedCss: [
                        { path: 'preload1.css' },
                        { path: 'preload2.css' }
                    ],
                    preloadedJs: [
                        { path: 'preload1.js' },
                        { path: 'preload2.js' }
                    ]
                };
            }
        };

        const player = new H5PPlayer(
            mockLibraryStorage,
            undefined,
            new H5PConfig(undefined),
            undefined,
            undefined,
            {
                customization: {
                    alterLibraryFiles: (lib, scripts, styles) => {
                        if (
                            lib.machineName === 'Foo' &&
                            lib.majorVersion === 1 &&
                            lib.minorVersion === 0
                        ) {
                            return {
                                scripts: [
                                    ...scripts,
                                    'preload3.js',
                                    'https://example.com/script.js'
                                ],
                                styles: [styles[0], styles[1]]
                            };
                        }
                        return { scripts, styles };
                    }
                }
            }
        );
        player.setRenderer((mod) => mod);
        const model = await player.render(contentId, new User(), {
            parametersOverride: contentObject,
            metadataOverride: h5pObject as any
        });

        expect(
            (model as any).scripts.includes(
                '/h5p/libraries/Foo-1.0/preload1.js?version=1.0.0'
            )
        ).toBe(true);
        expect(
            (model as any).scripts.includes(
                '/h5p/libraries/Foo-1.0/preload2.js?version=1.0.0'
            )
        ).toBe(true);
        expect(
            (model as any).scripts.includes(
                '/h5p/libraries/Foo-1.0/preload3.js?version=1.0.0'
            )
        ).toBe(true);
        expect(
            (model as any).scripts.includes('https://example.com/script.js')
        ).toBe(true);

        expect(
            (model as any).styles.includes(
                '/h5p/libraries/Foo-1.0/preload2.css?version=1.0.0'
            )
        ).toBe(true);
    });

    it("doesn't include custom scripts and styles for other content types", async () => {
        const contentId = 'foo';
        const contentObject = {};
        const h5pObject = {
            mainLibrary: 'Foo',
            preloadedDependencies: [
                {
                    machineName: 'Foo',
                    majorVersion: 1,
                    minorVersion: 0
                }
            ]
        };

        const mockLibraryStorage: any = {
            getLibrary: async (
                libName: ILibraryName
            ): Promise<ILibraryMetadata> => {
                return {
                    machineName: 'Foo',
                    majorVersion: 1,
                    minorVersion: 0,
                    patchVersion: 0,
                    runnable: 1,
                    title: 'Foo',
                    preloadedCss: [
                        { path: 'preload1.css' },
                        { path: 'preload2.css' }
                    ],
                    preloadedJs: [
                        { path: 'preload1.js' },
                        { path: 'preload2.js' }
                    ]
                };
            }
        };

        const player = new H5PPlayer(
            mockLibraryStorage,
            undefined,
            new H5PConfig(undefined),
            undefined,
            undefined,
            {
                customization: {
                    alterLibraryFiles: (lib, scripts, styles) => {
                        if (
                            lib.machineName === 'Bar' &&
                            lib.majorVersion === 1 &&
                            lib.minorVersion === 0
                        ) {
                            return {
                                scripts: [
                                    ...scripts,
                                    'preload3.js',
                                    'https://example.com/script.js'
                                ],
                                styles: [styles[1], styles[2]]
                            };
                        }
                        return { scripts, styles };
                    }
                }
            }
        );
        player.setRenderer((mod) => mod);
        const model = await player.render(contentId, new User(), {
            parametersOverride: contentObject,
            metadataOverride: h5pObject as any
        });

        expect(
            (model as any).scripts.includes(
                '/h5p/libraries/Foo-1.0/preload1.js?version=1.0.0'
            )
        ).toBe(true);
        expect(
            (model as any).scripts.includes(
                '/h5p/libraries/Foo-1.0/preload2.js?version=1.0.0'
            )
        ).toBe(true);

        expect(
            (model as any).styles.includes(
                '/h5p/libraries/Foo-1.0/preload1.css?version=1.0.0'
            )
        ).toBe(true);
        expect(
            (model as any).styles.includes(
                '/h5p/libraries/Foo-1.0/preload2.css?version=1.0.0'
            )
        ).toBe(true);
    });
});
