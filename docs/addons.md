# Addons

Addons are H5P libraries that can be added to the H5P Editor or to certain H5P
content without changing the content itself or the content type. They are a
little-known feature of the H5P core and currently the only publicly known
example of an addon is the [H5P.MathDisplay addon](https://h5p.org/mathematical-expressions),
which uses MathJax to display mathematical formulas. Addons provide a simple and
reusable way of customizing behavior and looks of H5P content types. This allows
site administrators to customize H5P without programming knowledge or the need
to fork content types.

## Using addons (for site administrators)

To use an addon on your site, you must upload the addon file through the library
management site. You **cannot** upload addons in the normal way you would upload
a H5P package with content, as the .h5p files of addons don't contain any
content and won't pass validation!

Depending on the configuration of the addon and your server, the addon will now
be automatically loaded in certain situations. As the only addon currently is
H5P.MathDisplay, the procedure of getting addons to load will be explained with
it below:

**Player:** The MathDisplay addon will automatically be used in the player
whenever needed, as the server scans content for a search string specified by
the addon. You can also force the use of addons by setting the configuration
property `playerAddons` of your configuration:

```JSON
{
    // ... further configuration values ...
    "playerAddons": {
        "H5P.CoursePresentation": ["H5P.MathDisplay"]
    }
    // ... further configuration values ...
}
```

**Editor:** The MathDisplay addon will **not** be automatically enabled in the
editor. There are two ways to enable it:

1. Use a custom H5P.MathDisplay addon, that uses a h5p-nodejs-library
   extension to avoid the server-wide configuration below.
2. Set the configuration property `editorAddons` in your implementation of
   `IH5PConfig` to something like:

    ```JSON
    {
        // ... further configuration values ...
        "editorAddons": {
            "H5P.CoursePresentation": [ "H5P.MathDisplay" ],
            "H5P.InteractiveVideo": [ "H5P.MathDisplay" ],
            "H5P.DragQuestion": [ "H5P.MathDisplay" ]
        }
        // ... further configuration values ...
    }
    ```

    Now the editor will load the H5P.MathDisplay library if a user opens the
    editor of one these three content types (these are the three content types
    for which the PHP implementation also loads addons).

## Customizing addon behavior

Addons can be configured by setting the property `libraryConfig` of your
configuration implementation of `IH5PConfig`. The property is a complex object
with H5P library machine names as keys. The object is sent to the H5P client
(run in the browser) as part of the H5PIntegration object and can be accessed
in a H5P library by calling `H5P.getLibraryConfig('H5P.MachineName')`.

Example (shows how to (optionally) configure the [H5P.MathDisplay addon](https://h5p.org/mathematical-expressions)):

```JSON
"libraryConfig": {
        "H5P.MathDisplay": {
            "observers": [
                { "name": "mutationObserver", "params": { "cooldown": 500 } },
                { "name": "domChangedListener" },
                { "name": "interval", "params": { "time": 1000 } }
            ],
            "renderer": {
                "mathjax": {
                    "src": "https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.5/MathJax.js",
                    "config": {
                        "extensions": ["tex2jax.js"],
                        "jax": ["input/TeX", "output/HTML-CSS"],
                        "tex2jax": {
                            "ignoreClass": "ckeditor",
                            "processEscapes": true
                        },
                        "messageStyle": "none"
                    }
                }
            }
        }
    }

```

## Creating addons (for developers)

Addons also use the .h5p file extension but don't have the same structure as
regular h5p packages: they only contain folders with libraries and no `h5p.json`
file or content. The library folders are basically like regular H5P libraries,
as they contain a `library.json` file, but they can't contain `semantics.json`.
The metadata in `library.json` is mostly the same as the metadata of normal
libraries, but it contains the property `addTo`, which makes a library to
an addon. (Check out the comprehensive structure of library metadata in the
TypeScript interface `ILibraryMetadata` in [`/src/types.ts`](/src/types.ts).)

A library containing the property `addTo` in its metadata will be automatically
added to the player (or editor) by the server in certain circumstances:

-   Always when loading the editor, if set in the global configuration of the
    server (see above).
-   When playing content, only if the content contains a regex search string.
    The search string is set by setting this property:
    ```JSON
    {
        // ... more metadata ...
        "addTo": {
            "content": {
                "types": [
                    {
                        "text": {
                            "regex": "/your regex string/" // the regex string must start and end with a slash!
                        }
                    }
                ]
            }
        }
        // ... more metadata ...
    }
    ```
    The configuration above means that the addon is added to every player
    instance if the regex is matched in any `string` property of the content
    parameters.
-   Always when loading the editor if requested in the metadata like this:

    ```JSON
    {
        // ... more metadata ...
        "addTo": {
            "editor": [ "H5P.CoursePresentation", "H5P.InteractiveVideo" ]
        }
        // ... more metadata ...
    }
    ```

    _Note that this way of enabling addons in the editor is a custom
    h5p-nodejs-library extension of the library metadata structure and is
    **not** supported by the PHP implementation and might change in the future
    if this feature is implemented by Joubel's PHP implementation in another
    way._

-   Always when loading the play if requested in the metadata like this:

    ```JSON
    {
        // ... more metadata ...
        "addTo": {
            "player": [ "H5P.CoursePresentation", "H5P.InteractiveVideo" ]
        }
        // ... more metadata ...
    }
    ```

    _Note that this way of enabling addons in the player is a custom
    h5p-nodejs-library extension of the library metadata structure and is
    **not** supported by the PHP implementation and might change in the future
    if this feature is implemented by Joubel's PHP implementation in another
    way._

When an addon is loaded in the editor or the player, the JavaScript and CSS
files listed at `preloadedJs` and `preloadedCss` are loaded in the HTML file
after the actual library is loaded.
