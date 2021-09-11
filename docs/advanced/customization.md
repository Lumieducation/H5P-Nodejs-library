# Customization

An application using @lumieducation/h5p-server can customize the way H5P behaves in
several ways:

* You can **add global custom JavaScript or CSS files to the player and editor
  by passing their URL to the constructor of `H5PPlayer` or `H5PEditor`.** Use
  this method if you want to globally customize how H5P looks or behaves to make
  it fit into your larger application. [See
  below](#adding-custom-scripts-and-styles-via-constructor-injection) for more
  details.

* You can **add global custom JavaScript or CSS files to the player and editor
  by specifying them in the configuration**. Use and document this method if
  you want to allow administrators of an instance of your application to
  customize how H5P looks and feels in their instance. [See
  below](#adding-custom-scripts-and-styles-via-the-configuration) for more
  details.

* You can upload addons. This makes changing how H5P looks and behaves
  particularly easy, but requires the creation of addons. See the
  [addon documentation page](addons.md) for details.

* You can **alter the scripts and styles used in a single library**. This allows
  you to change the looks and behavior of a library without forking it. [See
  below](#changing-javascript-and-css-files-of-individual-libraries)
  for more details

* You can **alter the semantics and language files of a single library**. This
  allows you to change the default editor of libraries without forking the
  library itself. [See
  below](#changing-the-semantics-of-individual-libraries) for
  more details.

To get a conceptual idea of how customizing works, you can also look at the
official H5P documentation pages on ["Authoring tool
customization"](https://h5p.org/documentation/for-developers/authoring-tool-customization)
and ["Change the color of the
editor"](https://h5p.org/change-color-of-the-editor). Of course, all the
programming guides there only apply to the PHP implementation and not this to
NodeJs version, but the basic idea is the same!

## Adding custom scripts and styles via constructor injection

You can add custom scripts and styles to the player by passing their URLs to the
options parameter of the constructor of `H5PPlayer` or `H5PEditor`:

```typescript
const player = new H5PPlayer(
    libraryStorage,
    contentStorage,
    config,
    integrationObjectDefaults, // set to undefined if unneeded
    urlGenerator, // set to undefined if unneeded
    translationFunction,
    {
        customization: {
            global: {
                scripts: [
                    '/url/of/script/1.js',
                    'https://example.com/external/script.js'
                ],
                styles: [
                    '/url/of/style/1.js',
                    'https://example.com/external/style.css'
                ]
            }
        }
    }
);
```

-or-

```typescript
const editor = new H5PEditor(
    cache,
    config,
    libraryStorage,
    contentStorage,
    translationCallback, // set to undefined if unneeded
    urlGenerator, // set to undefined if unneeded
    {
        customization: {
            global: {
                scripts: [
                    '/url/of/script/1.js',
                    'https://example.com/external/script.js'
                ],
                styles: [
                    '/url/of/style/1.js',
                    'https://example.com/external/style.css'
                ]
            }
        }
    }
);
```

These scripts or styles will then be added to the end of the list of H5P scripts
that are loaded when the player or editor are loaded. Note that the URLs in the
arrays are simply appended to the list of core scripts and styles without any
changes. This means that they are not passed into URL generator!

## Adding custom scripts and styles via the configuration

You can add lists of global JavaScript or CSS files to the configuration like
this:

```javascript
{
    // ... further configuration values ...
    "customization": {
        "global": {
            "editor": {
                "scripts": [
                    "/url/of/script/1.js",
                    "https://example.com/external/script.js"
                ],
                "styles": [
                    "/url/of/style/1.css",
                    "https://example.com/external/style.css"
                ]
            },
            "player": {
                "scripts": [
                    "/url/of/script/1.js",
                    "https://example.com/external/script.js"
                ],
                "styles": [
                    "/url/of/style/1.css",
                    "https://example.com/external/style.css"
                ]
            }
        }
    }
    // ... further configuration values ...
}
```

These scripts or styles will then be added to the end of the list of H5P scripts
that are loaded when the player or editor are loaded. Note that the URLs in the
arrays are simply appended to the list of core scripts and styles without any
changes. This means that they are not passed into URL generator!

## Changing JavaScript and CSS files of individual libraries

You can change the list of JavaScript and CSS files used by individual libraries
to modify their looks and behavior. It is possible to add or to remove files
from the lists. To do this you must pass a hook to the options object of the
`H5PEditor` or `H5PPlayer` constructor.

The hook looks like this:

```typescript
/**
 * This hook is called when the player creates the list of files that
 * are loaded when playing content with the library.
 * Note: This function should be immutable, so it shouldn't change the
 * scripts and styles parameters but create new arrays!
 * @param library the library that is currently being loaded
 * @param scripts the original list of scripts that will be loaded
 * @param styles the original list of styles that will be loaded
 * @returns the altered lists of scripts and styles
 */
const alterLibraryFilesHook = (
    library: ILibraryName,
    scripts: string[],
    styles: string[]
): { scripts: string[]; styles: string[] } => {
    // We only alter the files of a single library
    if (library.machineName === 'H5P.Example') {
        return {
            // The function should be immutable, so we re-create the arrays
            scripts: [...scripts, '/url/of/script.js'],
            styles: [...styles, '/url/of/style.css']
        };
    }
    // We return the original list for all other libraries.
    return { scripts, styles };
};
```

It is passed to `H5PPlayer` like this:

```typescript
const player = new H5PPlayer(
    libraryStorage,
    contentStorage,
    config,
    integrationObjectDefaults, // set to undefined if unneeded
    translationFunction,
    urlGenerator, // set to undefined if unneeded
    {
        customization: {
            alterLibraryFiles: alterLibraryFilesHook
        }
    }
);
```

It is passed to `H5PEditor` like this:

```typescript
const editor = new H5PEditor(
    cache,
    config,
    libraryStorage,
    contentStorage,
    translationCallback, // set to undefined if unneeded
    urlGenerator, // set to undefined if unneeded
    {
        customization: {
            alterLibraryFiles: alterLibraryFilesHook
        }
    }
);
```

## Changing the semantics of individual libraries

It is possible to change the semantic structure of individual libraries without
uploading a fork of the library. This allows you to remove or add fields in the
H5P Editor. You can also change what HTML tags are allowed in the CKEditor, for
instance. As the structure of the language files (which include all the
translations) is identical to the semantic structure of the library, you must
also make sure that the language files are changed as well.
@lumieducation/h5p-server allows you to pass two hooks in the options of the
`H5PEditor` constructor to achieve this:

```typescript
/**
 * This hook is called when the editor retrieves the semantics of a
 * library.
 * Note: This function should be immutable, so it shouldn't change the
 * semantics parameter but return a clone!
 * @param library the library that is currently being loaded
 * @param semantics the original semantic structure
 * @returns the changed semantic structure
 */
const alterLibrarySemanticsHook = (
    library: ILibraryName,
    semantics: ISemanticsEntry[]
): ISemanticsEntry[] => {
    // We only change the semantic structure of one library
    if (library.machineName === 'H5P.TrueFalse') {
        // We create a new array, as the function is supposed to be immutable.
        return [
            {
                name: 'title2',
                type: 'text',
                widget: 'html',
                label: 'Title 2',
                enterMode: 'p',
                tags: ['strong', 'em', 'sub', 'sup', 'h2', 'h3', 'pre', 'code']
            },
            ...semantics
        ];
    }
    // We return an unchanged structure for all other libraries
    return semantics;
};
/**
 * This hook is called when the editor retrieves the language file of a
 * library in a specific language.
 * Note: This function should be immutable, so it shouldn't change the
 * languageFile parameter but return a clone!
 * @param library the library that is currently being loaded
 * @param languageFile the original language file
 * @param language the language for which the entries should be changed
 * @returns the changed language file
 */
const alterLibraryLanguageFileHook = (
    library: ILibraryName,
    languageFile: ILanguageFileEntry[],
    language: string
): ILanguageFileEntry[] => {
    // We only change the language file of one library
    if (library.machineName === 'H5P.TrueFalse') {
        // We create a new array, as the function is supposed to be immutable.
        return [
            // The language file has the same structure as the semantics file
            // but only includes localizable fields.
            {
                name: 'title2',
                label: 'Title 2'
            },
            ...languageFile
        ];
    }
    // We return an unchanged language file for all other libraries
    return languageFile;
};
```

Add these hooks to the constructor of `H5PEditor` like this:

```typescript
const editor = new H5PEditor(
    cache,
    config,
    libraryStorage,
    contentStorage,
    translationCallback, // set to undefined if unneeded
    urlGenerator, // set to undefined if unneeded
    {
        customization: {
            alterLibraryLanguageFile: alterLibraryLanguageFileHook,
            alterLibrarySemantics: alterLibrarySemanticsHook
        }
    }
);
```

The changes to the semantic structure apply system-wide to all instance of the
library in the editor. It doesn't make sense to customize the player this way,
as the semantic structure and language files are only used by the editor.

Exporting (downloading) and uploading content in the same application (or an
application that uses the same hooks) works, but only the content.json file
follows the altered semantic structure. The actual library's semantic.json file
is left unchanged in the exported package. This means that if you upload an
exported package with an altered semantic structure of the content to a
different site, you might bump into validation errors or unexpected behavior.
