# Updating the H5P Core

## Introduction

This library uses components of the "regular" H5P libraries to display the editor and the player. For this purpose, the JavaScript and CSS files that make up the JavasScript client (which is run in the browser) are copied over from Joubel's PHP implementation upon `npm install`.

As newer content type versions typically as require a new core version, we need to regularly update the references to the core files.

## Steps

1. Change the script in `scripts/install.sh` to download the new H5P versions from GitHub
2. Change the values of these properties of the editor configuration object (e.g. [`H5PConfig.ts`](/src/implementation/H5PConfig.ts)):
    - `coreApiVersion` (put in the version H5P now uses in the downloaded core files; typically the version of h5p-editor-php-library without patch version, e.g. 1.24)
    - `h5pVersion` (put in the version of the PHP libraries themselves (includes patch version, e.g.: 1.24.1))
3. Change the README to reflect the new versions (download links to GitHub)
4. Check if there are new JavaScript files in the core that are required to run the editor or the player. Add them to the `H5PPlayer.coreScripts()` or `H5PEditor.coreScripts()` methods in the respective files.
5. Run `npx ts-node scripts/generate-supported-language-list.ts` to update the list of languages the editor supports.
6. Run all tests (including test:integration) to check if the everything still works as expected. (for example, inserting scripts might break tests)
