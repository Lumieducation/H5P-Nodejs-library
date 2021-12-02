import { ITheme } from '../types';

export default (theme?: ITheme): string => {
    if (!theme) {
        return ``;
    }
    return `
.h5peditor-form {
    background-color: ${theme.backgroundColor} !important; /* backgroundColor */
}

.h5p-hub-client-drop-down {
    color: ${theme.fontColor} !important;
    background-color: ${theme.backgroundColor} !important; /* backgroundColor */
}

/* hub selection text */
.h5p-hub .h5p-hub-client-drop-down .h5p-hub-selected {
    color: ${theme.fontColor} !important; /* fontColor */
}
.h5p-hub .h5p-hub-client-drop-down .h5p-hub-icon-hub-icon {
    color: ${theme.fontColor} !important; /* fontColor */
}

.h5peditor-copy-button:before,
.h5peditor-paste-button:before {
    font-family: 'H5P';
    margin-right: 5px;
    font-size: 1.5em;
    position: relative;
    top: 0.2em;
    color: ${theme.primaryContrastColor} !important; /* primaryContrastColor */
}

.h5p-tutorial-url,
.h5p-example-url {
    color: ${theme.primaryColor} !important; /* primaryColor */
}

.h5peditor {
    background-color: ${theme.backgroundColor} !important; /* backgroundColor */
}

.h5p-hub {
    font-family: 'Open Sans', sans-serif;
    font-size: .917em;
    color: ${theme.fontColor} !important;
}

.form-manager-head {
    color: ${theme.fontColor} !important; /* fontColor */
    background-color: ${theme.backgroundColor} !important; /* backgroundColor */
    border-bottom: 1px solid ${theme.dividerColor}; /* dividerColor */
    height: 41px;
    line-height: 40px;
    box-sizing: border-box;
    position: relative;
    display: flex;
    z-index: 3;
    justify-content: space-between;
    align-items: flex-start;
    box-shadow: 0px 2px 2px rgb(128 128 128 / 15%);
}

.form-manager-button {
    background: transparent;
    margin: 0;
    padding: 0;
    border: 0;
    cursor: pointer;
    color: ${theme.fontColor} !important; /* fontColor */
    position: relative;
    white-space: nowrap;
    line-height: normal;
}

.h5p-hub .h5p-hub-tab-panel [role='tablist'] {
    background-color: ${theme.paperBackgroundColor} !important; /* paperBackgroundColor */
}

.h5p-hub-search-wrapper {
    background-color: ${theme.paperBackgroundColor} !important; /* paperBackgroundColor */
}

.h5p-hub .h5p-hub-navbar {
    background: ${theme.paperBackgroundColor} !important; /* paperBackgroundColor */
}

.h5p-hub .h5p-hub-content-type-list ol {
    background-color: ${theme.backgroundColor} !important; /* backgroundColor */
}

.h5p-hub .h5p-hub-content-type-list {
    background-color: ${theme.backgroundColor} !important; /* backgroundColor */
}
.h5peditor-label {
    display: block;
    margin-bottom: 6px;
    font-weight: 600;
    font-size: 16px;
    color: ${theme.fontColor}; /* fontColor */
}

button.h5p-core-button {
    font-family: 'Open Sans', sans-serif;
    font-weight: 600;
    font-size: 1em;
    line-height: 1.2;
    padding: 0.5em 1.25em;
    border-radius: 2em;
    background: ${theme.primaryColor} !important; /* primaryColor */
    color: ${theme.primaryContrastColor} !important; /* primaryContrastColor */
    cursor: pointer;
    border: none;
    box-shadow: none;
    outline: none;
    display: inline-block;
    text-align: center;
    text-shadow: none;
    vertical-align: baseline;
    text-decoration: none;
    -webkit-transition: initial;
    transition: initial;
}

.h5peditor-field-description,
.h5p-help-text {
    font-size: 12px;
    margin-top: 0.3em;
    margin-bottom: 1em;
    font-weight: 500;
    color: ${theme.fontColor}; /* fontColor */
    line-height: 15px;
    letter-spacing: 0.5px;
}

.h5p-hub-media .h5p-hub-highlight {
    background-color: ${theme.paperBackgroundColor} !important;
}

.h5p-hub .h5p-hub-content-type-list .h5p-hub-media[tabindex='0'] {
    background-color: ${theme.paperBackgroundColor} !important;
}

.h5p-hub .h5p-hub-content-type-list .h5p-hub-media:not(:last-child) {
    border-bottom: 1px solid ${theme.dividerColor};
}

/* button */
.h5p-hub .h5p-hub-button.h5p-hub-button-primary {
    background-color: ${theme.primaryColor} !important;
    color: #fff !important;
    border-color: ${theme.primaryColor} !important;
}

.h5p-hub .h5p-hub-button.h5p-hub-button-inverse-primary {
    background-color: ${theme.secondaryColor} !important;
    color: ${theme.secondaryContrastColor} !important;
    border-color: ${theme.secondaryColor} !important;
}

.h5p-hub .h5p-hub-content-type-list .h5p-hub-media:hover {
    background-color: ${theme.paperBackgroundColor} !important;
}

.h5p-hub .h5p-hub-navbar {
    background-color: transparent;
    list-style: none;
    color: ${theme.fontColor} !important;
    border: 0;
    padding: 1.2em 1.2em 0.975422574em 2.292em;
    margin: 0;
    font-size: 1em;
    opacity: 1;
    visibility: visible;
    transition: opacity 0.2s, visibility 0s linear 0s;
    overflow: auto;
    display: block;
}

.h5peditor-paste-button,
.h5peditor-copy-button {
    padding: 0.5em 0.75em 0.75em 0.5em;
    margin-left: 0.5em;
    border-radius: 0.25em;
    cursor: pointer;
    color: ${theme.primaryContrastColor} !important; /* primaryContrastColor */
    background: ${theme.primaryColor} !important; /* primaryColor */
    line-height: 0.5em;
}
/* input */
.h5peditor textarea,
.h5peditor .h5peditor-text,
.h5peditor .ckeditor {
    background: ${theme.backgroundColor} !important; /* backgroundColor */
}

.h5peditor textarea,
.h5peditor .h5peditor-text,
.h5peditor .ckeditor {
    -webkit-box-shadow: compact(
        inset 0px 0px 5px rgba(0, 0, 0, 0.12),
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false
    );
    -moz-box-shadow: compact(
        inset 0px 0px 5px rgba(0, 0, 0, 0.12),
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false
    );
    box-shadow: compact(
        inset 0px 0px 5px rgba(0, 0, 0, 0.12),
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false
    );
    box-sizing: border-box;
    margin: 0;
    padding: 10px;
    min-height: 40px;
    border: 1px solid ${theme.dividerColor} !important; /* dividerColor */
    background: #ffffff;
    color: ${theme.fontColor} !important; /* fontColor */
    outline: none;
    font-size: 16px;
    word-wrap: break-word;
}

/* accordion header */
.group.importance-low > .title,
.h5p-li > .list-item-title-bar.importance-low,
.common > .h5peditor-label {
    background: ${theme.paperBackgroundColor}; /* paperBackgroundColor */
    height: 38px;
    border: 1px solid ${theme.dividerColor}; /* dividerColor */
    color: ${theme.fontColor} !important; /* fontColor */
}
.h5p-course-presentation {
    color: ${theme.fontColor} !important; /* fontColor */
}
.h5p-dragnbar-keywords span {
    color: ${theme.fontColor} !important; /* fontColor */
}
/* settings */
.group > .content {
    position: relative;
    display: none;
    margin: 0;
    padding: 20px;
    border: 1px solid ${theme.dividerColor} !important; /* dividerColor */
    border-top: none;
    background: ${theme.backgroundColor} !important; /* backgroundColor */
}

.common > .fields {
    min-height: 2em;
    padding: 20px;
    color: ${theme.fontColor} !important; /* fontColor */
    border: 1px solid ${theme.dividerColor} !important; /* dividerColor */
    border-top: none;
    background: ${theme.backgroundColor} !important; /* backgroundColor */
    position: relative;
}

.h5peditor fieldset.common-fields-library-wrapper > legend {
    display: block;
    cursor: pointer;
    outline: none;
    color: ${theme.fontColor} !important; /* fontColor */
    background-color: ${theme.paperBackgroundColor} !important; /* paperBackgroundColor */
    border: 1px solid ${theme.dividerColor} !important; /* dividerColor*/
    padding: 10px;
    font-weight: bold;
    font-size: 0.875em;
}

.h5peditor fieldset.common-fields-library-wrapper {
    width: 100%;
    padding: 0 1em 1em;
    box-sizing: border-box;
    height: 20px;
    border: solid 1px ${theme.dividerColor} !important; /* dividerColor */
    border-radius: 4px;
    margin-bottom: 1em;
}

.h5peditor .h5peditor-language-switcher select {
    color: ${theme.fontColor} !important; /* fontColor */
    background-color: ${theme.paperBackgroundColor} !important; /* paperBackgroundColor */
    border: solid 1px ${theme.dividerColor} !important; /* dividerColor */
}

.h5p-confirmation-dialog-header {
    padding: 1.5em;
    background: ${theme.backgroundColor} !important; /* backgroundColor */
    color: ${theme.fontColor} !important; /* fontColor */
}

.h5p-confirmation-dialog-body {
    color: ${theme.fontColor} !important; /* fontColor */
    background: ${theme.backgroundColor} !important; /* backgroundColor */
    border-top: solid 1px ${theme.dividerColor} !important; /* dividerColor */
    padding: 1.25em 1.5em;
}

.h5p-hub .h5p-hub-content-type-detail {
    color: white;
    background-color: ${theme.backgroundColor} !important;
    padding: 1.3em;
    display: inherit;
    position: absolute;
    top: 0;
    left: 0;
    visibility: hidden;
    outline: none;
    overflow: auto;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    transform: translateX(100%);
    transition: transform 0.2s ease-out, visibility 0s linear 0.2s;
    box-shadow: 0 0.4em 0.4em -0.2em rgb(79 87 99 / 20%) inset,
        0 -0.4em 0.4em -0.2em rgb(79 87 99 / 20%) inset;
}

.h5p-hub .h5p-hub-button {
    font-family: 'Open Sans', sans-serif;
    font-size: .95em;
    font-weight: 600;
    text-align: center;
    text-decoration: none;
    line-height: 1em;
    min-width: 4em;
    padding: 0.708em 1.5em;
    border-radius: 1.375em;
    background-color: ${theme.primaryColor} !important;
    color: ${theme.primaryContrastColor} !important;
    display: inline-block;
    cursor: pointer;
    border: 2px solid transparent;
    transition: background-color .35s ease;
}

.h5p-hub-accordion-toggler {
    display: block;
    box-sizing: border-box;
    text-decoration: none;
    width: 100%;
    padding: 0.833em;
    color: ${theme.fontColor} !important;
}

.h5p-hub ul.h5p-hub-sort-by-list>li>a.h5p-hub-highlight {
    font-weight: 600;
    color: ${theme.primaryColor} !important;
    text-decoration: underline;
}

.h5p-hub ul.h5p-hub-sort-by-list>li>a {
    display: block;
    color: ${theme.fontColor} !important;
    padding: 0.25em 0.75em;
    font-size: 0.9em;
    text-decoration: none;
}

.h5p-hub small, .h5p-hub .small, .h5p-hub .h5p-hub-small {
    color: ${theme.fontColor} !important;
    line-height: 1.7em;
    font-size: .95em;
}

.h5p-hub-carousel .h5p-hub-navigation {
    width: 2.1em;
    height: 2.1em;
    line-height: 2.1em;
    position: absolute;
    border-radius: 50%;
    color: ${theme.primaryContrastColor} !important;
    background-color: ${theme.primaryColor} !important;
    cursor: pointer;
    border: 2px solid transparent;
    top: 50%;
    transform: translateY(-50%);
}

.h5p-hub-accordion-heading {
    border-bottom: 1px solid ${theme.dividerColor} !important;
    background-color: ${theme.paperBackgroundColor} !important;
    cursor: pointer;
}

.h5peditor-form-manager-head {
    background: ${theme.paperBackgroundColor} !important;
    color: ${theme.fontColor} !important;
    border-bottom: 1px solid ${theme.dividerColor} !important; /* dividerColor */
    border-bottom: 1px solid ${theme.dividerColor} !important; /* dividerColor */

    height: 41px;
    line-height: 40px;
    box-sizing: border-box;
    position: relative;
    display: flex;
    z-index: 3;
    justify-content: space-between;
    align-items: flex-start;
    box-shadow: 0px 2px 2px rgb(128 128 128 / 15%);
    padding: 0 1em 0 0.5em;
}

.field.wizard .h5peditor-tab-a {
    display: block;
    position: relative;
    background: ${theme.paperBackgroundColor} !important;
    margin-right: 1px;
    padding: 11px 15px;
    color: ${theme.fontColor} !important;
    overflow: hidden;
    white-space: nowrap;
}

.h5p-hub-search-wrapper .h5p-hub-border-wrap {
    padding: 3px;
    background: ${theme.paperBackgroundColor} !important;
    border-radius: 1.25em;
    font-size: 1.15em;
}

.h5p-hub-search-bar {
    border: 1px solid ${theme.dividerColor};
    padding: 0.5em 0.5em 0.5em 1.2em;
    font-style: italic;
    font-weight: 400;
    font-size: 1em;
    box-shadow: inset 0 0 10px rgb(0 0 0 / 40%);
    color: ${theme.fontColor};
    border-radius: 1.25em;
    width: 100%;
    box-sizing: border-box;
    background: ${theme.paperBackgroundColor} !important;
}

.h5p-editor-table-list tbody td {
    background: ${theme.paperBackgroundColor};
    border-top: 1px solid ${theme.dividerColor};
    border-bottom: 1px solid ${theme.dividerColor};
    vertical-align: top;
}

.field.wizard {
    border: 1px solid ${theme.dividerColor} !important;
}

.field.wizard .h5peditor-tab-a.h5peditor-active {
    background: ${theme.paperBackgroundColor} !important;
    cursor: default;
    color: ${theme.fontColor} !important;
}

.field.wizard .h5peditor-wizard-navigation-buttons {
    display: table;
    width: 100%;
    background-color: ${theme.paperBackgroundColor} !important;
    font-size: 17px;
    line-height: initial;
}

.form-manager-form {
    background: ${theme.backgroundColor} !important; /* backgroundColor */
    padding: 20px;
    max-width: 918px;
    margin: 0 auto;
}

.form-manager-done,
.form-manager-proceed {
    background: ${theme.primaryColor} !important; /* primaryColor */
    color: ${theme.primaryContrastColor} !important; /* primaryContrastColor */
}

.form-manager-footer {
    padding-left: 6px;
    box-shadow: 0px -2px 2px rgb(128 128 128 / 15%);
    border-bottom: none;
    border-top: solid 1px ${theme.dividerColor} !important; /* dividerColor */
}

.h5peditor > select,
.h5peditor .h5peditor-language-switcher select,
.h5peditor h5peditor-select,
.h5peditor .field > select {
    padding: 10px 30px 10px 8px;
    font-family: 'Open Sans', sans-serif;
    font-size: 16px;
    border: 1px solid ${theme.dividerColor} !important; /* dividerColor */
    background: ${theme.paperBackgroundColor} !important; /* paperBackgroundColor */
    background-position: calc(100% - 10px);
    -webkit-box-shadow: compact(
        inset 0px 0px 5px rgba(0, 0, 0, 0.12),
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false
    );
    -moz-box-shadow: compact(
        inset 0px 0px 5px rgba(0, 0, 0, 0.12),
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false
    );
    box-shadow: compact(
        inset 0px 0px 5px rgba(0, 0, 0, 0.12),
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false
    );
    -moz-appearance: none;
    -webkit-appearance: none;
}

.h5peditor .file .add {
    display: inline-block;
    cursor: pointer;
    padding: 0.5em 1.5em 0.5em 3em;
    background: ${theme.primaryColor} !important; /* primaryColor */
    border: 1px solid ${theme.dividerColor}; /* dividerColor */
    border-radius: 0.25em;
    color: ${theme.primaryContrastColor} !important; /* primaryContrastColor */
    font-weight: bold;
    line-height: normal;
}

.h5peditor .file .add .h5peditor-field-file-upload-text:before {
    font-family: 'H5P';
    content: '\e902';
    line-height: 1;
    color: ${theme.primaryContrastColor} !important; /* primaryContrastColor */
    font-size: 2em;
    position: absolute;
    left: 0.3em;
    top: 0.1em;
}

.group > .title,
.h5p-li > .list-item-title-bar {
    background: ${theme.paperBackgroundColor} !important; /* paperBackgroundColor */
    border: 1px solid ${theme.dividerColor} !important; /* dividerColor */
    color: ${theme.fontColor} !important; /* fontColor */
    height: 38px;
}

.h5peditor-button-textual.importance-low {
    background: ${theme.paperBackgroundColor} !important; /* paperBackgroundColor */
    border-color: ${theme.dividerColor} !important; /* dividerColor */
    color: ${theme.fontColor} !important; /* fontColor */
}

.h5peditor-button-textual.importance-high {
    background: ${theme.paperBackgroundColor} !important; /* paperBackgroundColor */
    border-color: ${theme.dividerColor} !important; /* dividerColor */
    color: ${theme.fontColor} !important; /* fontColor */
    text-transform: uppercase;
    height: 42px;
    line-height: 42px;
}

.field.importance-high > .h5peditor-label-wrapper > .h5peditor-label {
    font-size: 18px;
    color: ${theme.primaryColor} !important; /* primaryColor */
}

.content {
    display: block;
    margin: 0;
    padding: 20px;
    border: 1px solid ${theme.dividerColor} !important; /* dividerColor */
    border-top: none;
    background: ${theme.backgroundColor} !important; /* backgroundColor */
}

.h5peditor-button-textual {
    -webkit-border-radius: 0.25em;
    -moz-border-radius: 0.25em;
    -ms-border-radius: 0.25em;
    -o-border-radius: 0.25em;
    border-radius: 0.25em;
    background: ${theme.paperBackgroundColor} !important; /* paperBackgroundColor */
    display: inline-block;
    width: auto;
    margin: 10px 0 0 0;
    padding: 0 20px;
    box-sizing: border-box;
    height: 38px;
    border: 1px solid ${theme.dividerColor} !important; /* dividerColor */
    font-size: 16px;
    font-family: 'Open Sans', sans-serif;
    line-height: 38px;
    color: ${theme.fontColor} !important; /* fontColor */
    cursor: pointer;
    font-weight: 600;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}
`;
};
