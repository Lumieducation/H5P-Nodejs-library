import { ITheme } from '../types';

export default (theme?: ITheme): string => {
    if (!theme) {
        return ``;
    }
    return `
.h5peditor-form {
    background-color: ${theme.backgroundColor} !important; /* backgroundColor */
}

body {
    font-family: ${theme.fontFamily} !important;
    color: ${theme.fontColor} !important;
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
    color: ${theme.fontColor} !important;
    font-family: ${theme.fontFamily} !important;
}

.h5p-hub .link, .h5p-hub a {
    font-family: ${theme.fontFamily} !important;
}

.h5p-hub .h5p-hub-button {
    font-family: $${theme.fontFamily} !important;
}

.form-manager-head {
    color: ${theme.fontColor} !important; /* fontColor */
    background-color: ${theme.backgroundColor} !important; /* backgroundColor */
    border-bottom: 1px solid ${theme.dividerColor}; /* dividerColor */
}

.form-manager-button {
    color: ${theme.fontColor} !important; /* fontColor */
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
    color: ${theme.fontColor}; /* fontColor */
}

button.h5p-core-button {
    font-family: ${theme.fontFamily} !important;
    border-radius: ${theme.buttonBorderRadius} !important;
    background: ${theme.primaryColor} !important; /* primaryColor */
    color: ${theme.primaryContrastColor} !important; /* primaryContrastColor */
}

.h5peditor-field-description,
.h5p-help-text {
    color: ${theme.fontColor}; /* fontColor */
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
    border-color: ${theme.primaryColor} !important;
    font-family: ${theme.fontFamily} !important;
}

.h5p-hub .h5p-hub-button.h5p-hub-button-inverse-primary {
    background-color: ${theme.secondaryColor} !important;
    color: ${theme.secondaryContrastColor} !important;
    border-color: ${theme.secondaryColor} !important;
    font-family: ${theme.fontFamily} !important;
}

.h5p-hub .h5p-hub-content-type-list .h5p-hub-media:hover {
    background-color: ${theme.paperBackgroundColor} !important;
}

.h5p-hub .h5p-hub-navbar {
    color: ${theme.fontColor} !important;
}

.h5peditor-paste-button,
.h5peditor-copy-button {
    color: ${theme.primaryContrastColor} !important; /* primaryContrastColor */
    background: ${theme.primaryColor} !important; /* primaryColor */
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
    border: 1px solid ${theme.dividerColor} !important; /* dividerColor */
    color: ${theme.fontColor} !important; /* fontColor */
}

/* accordion header */
.group.importance-low > .title,
.h5p-li > .list-item-title-bar.importance-low,
.common > .h5peditor-label {
    background: ${theme.paperBackgroundColor}; /* paperBackgroundColor */
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
    border: 1px solid ${theme.dividerColor} !important; /* dividerColor */
    background: ${theme.backgroundColor} !important; /* backgroundColor */
}

.common > .fields {
    color: ${theme.fontColor} !important; /* fontColor */
    border: 1px solid ${theme.dividerColor} !important; /* dividerColor */
    background: ${theme.backgroundColor} !important; /* backgroundColor */
}

.h5peditor fieldset.common-fields-library-wrapper > legend {
    color: ${theme.fontColor} !important; /* fontColor */
    background-color: ${theme.paperBackgroundColor} !important; /* paperBackgroundColor */
    border: 1px solid ${theme.dividerColor} !important; /* dividerColor*/
}

.h5peditor fieldset.common-fields-library-wrapper {
    border: solid 1px ${theme.dividerColor} !important; /* dividerColor */
}

.h5peditor .h5peditor-language-switcher select {
    color: ${theme.fontColor} !important; /* fontColor */
    background-color: ${theme.paperBackgroundColor} !important; /* paperBackgroundColor */
    border: solid 1px ${theme.dividerColor} !important; /* dividerColor */
}

.h5p-confirmation-dialog-header {
    background: ${theme.backgroundColor} !important; /* backgroundColor */
    color: ${theme.fontColor} !important; /* fontColor */
}

.h5p-confirmation-dialog-body {
    color: ${theme.fontColor} !important; /* fontColor */
    background: ${theme.backgroundColor} !important; /* backgroundColor */
    border-top: solid 1px ${theme.dividerColor} !important; /* dividerColor */
}

.h5p-hub .h5p-hub-content-type-detail {
    background-color: ${theme.backgroundColor} !important;
}

.h5p-hub .h5p-hub-button {
    border-radius: ${theme.buttonBorderRadius} !important;
    background-color: ${theme.primaryColor} !important;
    color: ${theme.primaryContrastColor} !important;
}

.h5p-hub-accordion-toggler {
    color: ${theme.fontColor} !important;
}

.h5p-hub ul.h5p-hub-sort-by-list>li>a.h5p-hub-highlight {
    color: ${theme.primaryColor} !important;
}

.h5p-hub ul.h5p-hub-sort-by-list>li>a {
    color: ${theme.fontColor} !important;
}

.h5p-hub small, .h5p-hub .small, .h5p-hub .h5p-hub-small {
    color: ${theme.fontColor} !important;
}

.h5p-hub-carousel .h5p-hub-navigation {
    color: ${theme.primaryContrastColor} !important;
    background-color: ${theme.primaryColor} !important;
}

.h5p-hub-accordion-heading {
    border-bottom: 1px solid ${theme.dividerColor} !important;
    background-color: ${theme.paperBackgroundColor} !important;
}

.h5peditor-form-manager-head {
    background: ${theme.paperBackgroundColor} !important;
    color: ${theme.fontColor} !important;
    border-bottom: 1px solid ${theme.dividerColor} !important; /* dividerColor */
    border-bottom: 1px solid ${theme.dividerColor} !important; /* dividerColor */
}

.field.wizard .h5peditor-tab-a {
    background: ${theme.paperBackgroundColor} !important;
    color: ${theme.fontColor} !important;
}

.h5p-hub-search-wrapper .h5p-hub-border-wrap {
    background: ${theme.paperBackgroundColor} !important;
}

.h5p-hub-search-bar {
    border: 1px solid ${theme.dividerColor};
    color: ${theme.fontColor};
    background: ${theme.paperBackgroundColor} !important;
}

.h5p-editor-table-list tbody td {
    background: ${theme.paperBackgroundColor};
    border-top: 1px solid ${theme.dividerColor};
    border-bottom: 1px solid ${theme.dividerColor};
}

.field.wizard {
    border: 1px solid ${theme.dividerColor} !important;
}

.field.wizard .h5peditor-tab-a.h5peditor-active {
    background: ${theme.paperBackgroundColor} !important;
    color: ${theme.fontColor} !important;
}

.field.wizard .h5peditor-wizard-navigation-buttons {
    background-color: ${theme.paperBackgroundColor} !important;
}

.form-manager-form {
    background: ${theme.backgroundColor} !important; /* backgroundColor */
}

.form-manager-done,
.form-manager-proceed {
    background: ${theme.primaryColor} !important; /* primaryColor */
    color: ${theme.primaryContrastColor} !important; /* primaryContrastColor */
}

.form-manager-footer {
    border-top: solid 1px ${theme.dividerColor} !important; /* dividerColor */
}

.h5peditor > select,
.h5peditor .h5peditor-language-switcher select,
.h5peditor h5peditor-select,
.h5peditor .field > select {
    border: 1px solid ${theme.dividerColor} !important; /* dividerColor */
    background: ${theme.paperBackgroundColor} !important; /* paperBackgroundColor */
}

.h5peditor .file .add {
    background: ${theme.primaryColor} !important; /* primaryColor */
    border: 1px solid ${theme.dividerColor}; /* dividerColor */
    color: ${theme.primaryContrastColor} !important; /* primaryContrastColor */
}

.h5peditor .file .add .h5peditor-field-file-upload-text:before {
    color: ${theme.primaryContrastColor} !important; /* primaryContrastColor */
}

.group > .title,
.h5p-li > .list-item-title-bar {
    background: ${theme.paperBackgroundColor} !important; /* paperBackgroundColor */
    border: 1px solid ${theme.dividerColor} !important; /* dividerColor */
    color: ${theme.fontColor} !important; /* fontColor */
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
}

.field.importance-high > .h5peditor-label-wrapper > .h5peditor-label {
    color: ${theme.primaryColor} !important; /* primaryColor */
}

.content {
    border: 1px solid ${theme.dividerColor} !important; /* dividerColor */
    background: ${theme.backgroundColor} !important; /* backgroundColor */
}

.h5peditor-button-textual {
    background: ${theme.paperBackgroundColor} !important; /* paperBackgroundColor */
    border: 1px solid ${theme.dividerColor} !important; /* dividerColor */
    color: ${theme.fontColor} !important; /* fontColor */
}

.h5peditor .ui-dialog .h5p-joubelui-button, .h5peditor .h5p-joubelui-button, .h5p-joubelui-button {
    background: ${theme.primaryColor};
    color: ${theme.primaryContrastColor};
}

.h5p-content {
    color: ${theme.fontColor};
    background: ${theme.backgroundColor};
    border: 1px solid ${theme.dividerColor};
}

.h5p-question {
    background: ${theme.backgroundColor};
    color: ${theme.fontColor};
}

.h5p-multichoice .h5p-alternative-container {
    color: ${theme.fontColor};
    background: ${theme.paperBackgroundColor};
}

.h5p-joubelui-score-bar {
    color: ${theme.fontColor};
    background: ${theme.paperBackgroundColor};
    border: 1px solid ${theme.dividerColor};

}

.h5p-joubelui-score-number {
    color: ${theme.fontColor};
}

.h5p-drag-text [aria-dropeffect] {
    background-color: ${theme.paperBackgroundColor};
}

.h5p-drag-text [aria-grabbed] {
    border: 0.1em solid ${theme.dividerColor};
    background: ${theme.paperBackgroundColor};

}

.h5p-course-presentation .h5p-presentation-wrapper {
    background: ${theme.backgroundColor};
}

.h5p-course-presentation .h5p-progressbar .h5p-progressbar-part-show {
    background: ${theme.primaryColor};
}

.h5p-course-presentation .h5p-presentation-wrapper {
    background: ${theme.backgroundColor};
}

.h5p-li > .list-item-title-bar.importance-high .order-group {
    background: ${theme.primaryColor};
}

.h5p-editor-table-list tbody td {
    background: ${theme.paperBackgroundColor} !important;
    border-top: 1px solid ${theme.dividerColor} !important;
    border-bottom: 1px solid ${theme.dividerColor} !important;
}
.h5p-metadata-button-tip {
    background: ${theme.primaryColor} !important;
    border: 1px solid ${theme.dividerColor} !important;
}
.h5p-metadata-toggler {
    border: 1px solid ${theme.dividerColor} !important;
    background: ${theme.primaryColor} !important;
    color: ${theme.primaryContrastColor} !important;
}
.h5p-metadata-wrapper {
    background-color: ${theme.backgroundColor} !important;
}

.group.importance-low > .title, .h5p-li > .list-item-title-bar.importance-low > .h5peditor-label, .h5p-li > .list-item-title-bar.importance-low > .title, .common > .h5peditor-label {
    color: ${theme.fontColor};
}

.field.wizard .h5peditor-wizard-navigation-buttons > div {
    color: ${theme.primaryContrastColor} !important;
    background: ${theme.primaryColor} !important;
    border: 1px solid ${theme.dividerColor} !important;
}

.h5peditor-widget-option {
    border: 1px solid ${theme.dividerColor};
    color: ${theme.fontColor};
    background: ${theme.paperBackgroundColor};
}

.h5p-vtab-a {
    border: 1px solid ${theme.dividerColor} !important;
    background-color: ${theme.paperBackgroundColor} !important;
    color: ${theme.fontColor} !important;
}

.important-description-show {
    background: ${theme.warningColor} !important;
    color: ${theme.warningContrastColor} !important;
}

.h5peditor-field-important-description {
    border: 1px solid ${theme.dividerColor} !important;
    background-color: ${theme.warningColor} !important;
    color: ${theme.warningContrastColor} !important;
}
.h5p-new-scene-button {
    color: ${theme.fontColor} !important;
    background: ${theme.primaryColor} !important;
    border: 1px solid ${theme.primaryColor} !important;
}

.h5p-editing-dialog {
    background: ${theme.backgroundColor} !important;
}

.h5p-editing-dialog-header .done-button {
    color: ${theme.fontColor} !important;
    background: ${theme.primaryColor} !important;
    border-color: ${theme.primaryColor} !important;
}

.h5peditor .h5p-add-dialog {
    background: ${theme.paperBackgroundColor} !important;
    border: 1px solid ${theme.dividerColor} !important;
}

.h5peditor .h5p-add-dialog .h5p-buttons {
    padding: 0.5em;
    border-top: 1px solid ${theme.dividerColor} !important;
    background: ${theme.paperBackgroundColor} !important;
}

.h5peditor .h5p-add-dialog .h5p-add-dialog-table .h5p-file-drop-upload {
    background-color: ${theme.paperBackgroundColor} !important;
    border: 1px solid ${theme.dividerColor} !important;
}

.h5p-collage-inner-wrapper, .h5p-collage-editor-layout-selector {
    background-color: ${theme.backgroundColor} !important;
}

.h5p-collage-wrapper {
    background-color: ${theme.paperBackgroundColor};
}

.h5p-collage-inner-wrapper, .h5p-collage-editor-layout-selector {
    background-color: ${theme.paperBackgroundColor} !important;
}
.h5p-collage-wrapper {
    background-color: ${theme.paperBackgroundColor} !important;
}
`;
};
