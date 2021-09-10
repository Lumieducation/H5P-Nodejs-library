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
                        "styles":[],
                        "url":"foo",
                        "exportUrl": "/h5p/download/foo"
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
                        "offlineSuccessfulSubmit": "Successfully submitted results.",
                        "mainTitle": "Sharing <strong>:title</strong>",
                        "editInfoTitle": "Edit info for <strong>:title</strong>",
                        "cancel": "Cancel",
                        "back": "Back",
                        "next": "Next",
                        "reviewInfo": "Review info",
                        "share": "Share",
                        "saveChanges": "Save changes",
                        "registerOnHub": "Register on the H5P Hub",
                        "updateRegistrationOnHub": "Save account settings",
                        "requiredInfo": "Required Info",
                        "optionalInfo": "Optional Info",
                        "reviewAndShare": "Review & Share",
                        "reviewAndSave": "Review & Save",
                        "shared": "Shared",
                        "currentStep": "Step :step of :total",
                        "sharingNote": "All content details can be edited after sharing",
                        "licenseDescription": "Select a license for your content",
                        "licenseVersion": "License Version",
                        "licenseVersionDescription": "Select a license version",
                        "disciplineLabel": "Disciplines",
                        "disciplineDescription": "You can select multiple disciplines",
                        "disciplineLimitReachedMessage": "You can select up to :numDisciplines disciplines",
                        "discipline": {
                            "searchPlaceholder": "Type to search for disciplines",
                            "in": "in",
                            "dropdownButton": "Dropdown button"
                        },
                        "removeChip": "Remove :chip from the list",
                        "keywordsPlaceholder": "Add keywords",
                        "keywords": "Keywords",
                        "keywordsDescription": "You can add multiple keywords separated by commas. Press \\"Enter\\" or \\"Add\\" to confirm keywords",
                        "altText": "Alt text",
                        "reviewMessage": "Please review the info below before you share",
                        "subContentWarning": "Sub-content (images, questions etc.) will be shared under :license unless otherwise specified in the authoring tool",
                        "disciplines": "Disciplines",
                        "shortDescription": "Short description",
                        "longDescription": "Long description",
                        "icon": "Icon",
                        "screenshots": "Screenshots",
                        "helpChoosingLicense": "Help me choose a license",
                        "shareFailed": "Share failed.",
                        "editingFailed": "Editing failed.",
                        "shareTryAgain": "Something went wrong, please try to share again.",
                        "pleaseWait": "Please wait...",
                        "language": "Language",
                        "level": "Level",
                        "shortDescriptionPlaceholder": "Short description of your content",
                        "longDescriptionPlaceholder": "Long description of your content",
                        "description": "Description",
                        "iconDescription": "640x480px. If not selected content will use category icon",
                        "screenshotsDescription": "Add up to five screenshots of your content",
                        "submitted": "Submitted!",
                        "isNowSubmitted": "Is now submitted to H5P Hub",
                        "changeHasBeenSubmitted": "A change has been submited for",
                        "contentAvailable": "Your content will normally be available in the Hub within one business day.",
                        "contentUpdateSoon": "Your content will update soon",
                        "contentLicenseTitle": "Content License Info",
                        "licenseDialogDescription": "Click on a specific license to get info about proper usage",
                        "publisherFieldTitle": "Publisher",
                        "publisherFieldDescription": "This will display as the \\"Publisher name\\" on shared content",
                        "emailAddress": "Email Address",
                        "publisherDescription": "Publisher description",
                        "publisherDescriptionText": "This will be displayed under \\"Publisher info\\" on shared content",
                        "contactPerson": "Contact Person",
                        "phone": "Phone",
                        "address": "Address",
                        "city": "City",
                        "zip": "Zip",
                        "country": "Country",
                        "logoUploadText": "Organization logo or avatar",
                        "acceptTerms": "I accept the <a href=':url' target='_blank'>terms of use</a>",
                        "successfullyRegistred": "You have successfully registered an account on the H5P Hub",
                        "successfullyRegistredDescription": "You account details can be changed",
                        "successfullyUpdated": "Your H5P Hub account settings have successfully been changed",
                        "accountDetailsLinkText": "here",
                        "registrationTitle": "H5P Hub Registration",
                        "registrationFailed": "An error occurred",
                        "registrationFailedDescription": "We were not able to create an account at this point. Something went wrong. Try again later.",
                        "maxLength": ":length is the maximum number of characters",
                        "keywordExists": "Keyword already exists!",
                        "licenseDetails": "License details",
                        "remove": "Remove",
                        "removeImage": "Remove image",
                        "cancelPublishConfirmationDialogTitle": "Cancel sharing",
                        "cancelPublishConfirmationDialogDescription": "Are you sure you want to cancel the sharing process?",
                        "cancelPublishConfirmationDialogCancelButtonText": "No",
                        "cancelPublishConfirmationDialogConfirmButtonText": "Yes",
                        "add": "Add",
                        "age": "Typical age",
                        "ageDescription": "The target audience of this content. Possible input formats separated by commas: \\"1,34-45,-50,59-\\".",
                        "invalidAge": "Invalid input format for Typical age. Possible input formats separated by commas: \\"1, 34-45, -50, -59-\\".",
                        "contactPersonDescription": "H5P will reach out to the contact person in case there are any issues with the content shared by the publisher. The contact person\\"s name or other information will not be published or shared with third parties",
                        "emailAddressDescription": "The email address will be used by H5P to reach out to the publisher in case of any issues with the content or in case the publisher needs to recover their account. It will not be published or shared with any third parties",
                        "copyrightWarning": "Copyrighted material cannot be shared in the H5P Content Hub. If the content is licensed with a OER friendly license like Creative Commons, please choose the appropriate license. If not this content cannot be shared.",
                        "keywordsExits": "Keywords already exists!",
                        "someKeywordsExits": "Some of these keywords already exist"
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
            getLibrary: async (libName: ILibraryName) => ({})
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
            getLibrary: async (libName: ILibraryName) => ({})
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
                          "styles":[],
                          "url":"foo",
                          "exportUrl": "/h5p/download/foo"
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
                            "offlineSuccessfulSubmit": "Successfully submitted results.",
                            "mainTitle": "Sharing <strong>:title</strong>",
                            "editInfoTitle": "Edit info for <strong>:title</strong>",
                            "cancel": "Cancel",
                            "back": "Back",
                            "next": "Next",
                            "reviewInfo": "Review info",
                            "share": "Share",
                            "saveChanges": "Save changes",
                            "registerOnHub": "Register on the H5P Hub",
                            "updateRegistrationOnHub": "Save account settings",
                            "requiredInfo": "Required Info",
                            "optionalInfo": "Optional Info",
                            "reviewAndShare": "Review & Share",
                            "reviewAndSave": "Review & Save",
                            "shared": "Shared",
                            "currentStep": "Step :step of :total",
                            "sharingNote": "All content details can be edited after sharing",
                            "licenseDescription": "Select a license for your content",
                            "licenseVersion": "License Version",
                            "licenseVersionDescription": "Select a license version",
                            "disciplineLabel": "Disciplines",
                            "disciplineDescription": "You can select multiple disciplines",
                            "disciplineLimitReachedMessage": "You can select up to :numDisciplines disciplines",
                            "discipline": {
                                "searchPlaceholder": "Type to search for disciplines",
                                "in": "in",
                                "dropdownButton": "Dropdown button"
                            },
                            "removeChip": "Remove :chip from the list",
                            "keywordsPlaceholder": "Add keywords",
                            "keywords": "Keywords",
                            "keywordsDescription": "You can add multiple keywords separated by commas. Press \\"Enter\\" or \\"Add\\" to confirm keywords",
                            "altText": "Alt text",
                            "reviewMessage": "Please review the info below before you share",
                            "subContentWarning": "Sub-content (images, questions etc.) will be shared under :license unless otherwise specified in the authoring tool",
                            "disciplines": "Disciplines",
                            "shortDescription": "Short description",
                            "longDescription": "Long description",
                            "icon": "Icon",
                            "screenshots": "Screenshots",
                            "helpChoosingLicense": "Help me choose a license",
                            "shareFailed": "Share failed.",
                            "editingFailed": "Editing failed.",
                            "shareTryAgain": "Something went wrong, please try to share again.",
                            "pleaseWait": "Please wait...",
                            "language": "Language",
                            "level": "Level",
                            "shortDescriptionPlaceholder": "Short description of your content",
                            "longDescriptionPlaceholder": "Long description of your content",
                            "description": "Description",
                            "iconDescription": "640x480px. If not selected content will use category icon",
                            "screenshotsDescription": "Add up to five screenshots of your content",
                            "submitted": "Submitted!",
                            "isNowSubmitted": "Is now submitted to H5P Hub",
                            "changeHasBeenSubmitted": "A change has been submited for",
                            "contentAvailable": "Your content will normally be available in the Hub within one business day.",
                            "contentUpdateSoon": "Your content will update soon",
                            "contentLicenseTitle": "Content License Info",
                            "licenseDialogDescription": "Click on a specific license to get info about proper usage",
                            "publisherFieldTitle": "Publisher",
                            "publisherFieldDescription": "This will display as the \\"Publisher name\\" on shared content",
                            "emailAddress": "Email Address",
                            "publisherDescription": "Publisher description",
                            "publisherDescriptionText": "This will be displayed under \\"Publisher info\\" on shared content",
                            "contactPerson": "Contact Person",
                            "phone": "Phone",
                            "address": "Address",
                            "city": "City",
                            "zip": "Zip",
                            "country": "Country",
                            "logoUploadText": "Organization logo or avatar",
                            "acceptTerms": "I accept the <a href=':url' target='_blank'>terms of use</a>",
                            "successfullyRegistred": "You have successfully registered an account on the H5P Hub",
                            "successfullyRegistredDescription": "You account details can be changed",
                            "successfullyUpdated": "Your H5P Hub account settings have successfully been changed",
                            "accountDetailsLinkText": "here",
                            "registrationTitle": "H5P Hub Registration",
                            "registrationFailed": "An error occurred",
                            "registrationFailedDescription": "We were not able to create an account at this point. Something went wrong. Try again later.",
                            "maxLength": ":length is the maximum number of characters",
                            "keywordExists": "Keyword already exists!",
                            "licenseDetails": "License details",
                            "remove": "Remove",
                            "removeImage": "Remove image",
                            "cancelPublishConfirmationDialogTitle": "Cancel sharing",
                            "cancelPublishConfirmationDialogDescription": "Are you sure you want to cancel the sharing process?",
                            "cancelPublishConfirmationDialogCancelButtonText": "No",
                            "cancelPublishConfirmationDialogConfirmButtonText": "Yes",
                            "add": "Add",
                            "age": "Typical age",
                            "ageDescription": "The target audience of this content. Possible input formats separated by commas: \\"1,34-45,-50,59-\\".",
                            "invalidAge": "Invalid input format for Typical age. Possible input formats separated by commas: \\"1, 34-45, -50, -59-\\".",
                            "contactPersonDescription": "H5P will reach out to the contact person in case there are any issues with the content shared by the publisher. The contact person\\"s name or other information will not be published or shared with third parties",
                            "emailAddressDescription": "The email address will be used by H5P to reach out to the publisher in case of any issues with the content or in case the publisher needs to recover their account. It will not be published or shared with any third parties",
                            "copyrightWarning": "Copyrighted material cannot be shared in the H5P Content Hub. If the content is licensed with a OER friendly license like Creative Commons, please choose the appropriate license. If not this content cannot be shared.",
                            "keywordsExits": "Keywords already exists!",
                            "someKeywordsExits": "Some of these keywords already exist"
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
            ): Promise<ILibraryMetadata> => ({
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
                preloadedJs: [{ path: 'preload1.js' }, { path: 'preload2.js' }]
            })
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
                                    '/preload4.js',
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
        expect((model as any).scripts.includes('/preload4.js')).toBe(true);
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
            ): Promise<ILibraryMetadata> => ({
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
                preloadedJs: [{ path: 'preload1.js' }, { path: 'preload2.js' }]
            })
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
