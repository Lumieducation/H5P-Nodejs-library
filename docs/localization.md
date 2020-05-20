# Localization

## Localizing the player

The H5P player doesn't require localization as all the language strings are part
of the H5P content package and must be set when creating a H5P package in the
editor.

## Localizing the editor

### Places at which localization must happen

To change the language of the H5P editor, the text strings must be localized in
several places:

1.  The core language strings (found in language/xxx.js) must be referenced in the
    HTML file and in the array which references the JS files in the IIntegration
    object (to make sure the language is also used in iframes).
2.  The H5P editor client (running in the browser) must be notified to use a
    certain language. It will then request the respective localized strings of
    H5P libraries it loads.
3.  Several string properties of IIntegration must be returned localized.
4.  The errors thrown by h5p-nodejs-library must be localized.

Some places of H5P cannot be localized at this time (this must be changed by
Joubel):

-   Some strings in libraries that are hard-coded
-   The H5P Hub content list and description

### Changing the language of the editor

h5p-nodejs-library supports localizing the editor as far as possible. The table
shows where this must be done:

| Place                                           | What to do                                                                                           |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 1. core language strings                        | Call `H5PEditor.render(contentId, language)` with the language code you need.                        |
| 2. notify H5P editor client                     | Call `H5PEditor.render(contentId, language)` with the language code you need.                        |
| 3. properties of IIntegration                   | Pass a valid `translationCallback` of type `ITranslationFunction` to the constructor of `H5PEditor`  |
| 4. error messages emitted by h5p-nodejs-library | Catch errors of types `H5PError` and `AggregateH5PError` and localize the message property yourself. |

The [Express example](/examples/express.ts) demonstrates how to do 1,2 and 3.
The [Express adapter for the Ajax endpoints](/src/adapters/express.ts) already
implements 4 but requires the `t(...)` function to be added to the `req` object.

The language strings used by h5p-nodejs-library all follow the conventions of
[i18next](https://www.npmjs.com/package/i18next) and it is a good library to
perform the translation for cases 3 and 4. However, you are free to use whatever
translation library you want as long as you make sure to pass a valid
`translationCallback` to `H5PEditor` (case 3) and add the required `t(...)`
function to `req` (case 4).

### Initializing the JavaScript H5P client (in the browser)

The H5P client must set the `H5PEditor.contentLanguage` property like this to
localize the libraries when the editor is initialized :

```js
H5PEditor.contentLanguage = H5PIntegration.editor.language;
```

You should include this initialization routine in your "create" and "edit"
views.

### Language detection

While you can manually change the language used in the Express adapter with the
`languageOverride` parameter, it is best to use a language detector, which makes
sure the req.t method uses the required target language. The easiest way is to
implement your own language detector in i18next as explained in their
[documentation](https://github.com/i18next/i18next-http-middleware#adding-own-detection-functionality).
Initialize i18next with this detector (which can also simply return a hard-coded
language if you want to only support one), and the Express adapter will
translate to this language.

### Contributing to the translation strings

H5P is constructed in a way that spreads out the localization effort. While the
great majority of the language strings come packaged with the content types or
are part of the H5P core (case 1 and 2 from the table), some strings must be
localized by the server implementation. The Drupal, WordPress and Moodle PHP
implementation all come with their own translation system and set of language
strings. That's why h5p-nodejs-library must also follow this path and localize
strings itself.

The language strings used by h5p-nodejs-library can be found in
[assets/translations](/assets/translations). In there, each namespace (group of
language strings) has it own directory, which in turn contains the language
files, which are named like this `en.json`, `de.json` etc.

If you want to change the text for your language or add another language, you must
do the changes in these directories. You can also add new namespaces if you
want to contribute to the development of h5p-nodejs-library and develop a module
which is self-contained (like the optional storage implementations). All general
language strings should be put into the namespace `server`.
