# Customization

An application using h5p-nodejs-library can customize the way H5P behaves in
several ways:

-   You can add custom JavaScript or CSS files to the player and editor by
    passing their URL to the constructor of `H5PPlayer` or `H5PEditor`. Use this
    method if you want to globally customize how H5P looks or behaves to make it
    fit into your larger application. [See
    below](#adding-custom-scripts-to-the-player) for more details.
-   You can add custom JavaScript or CSS files to the player and editor by
    specifying them in the configuration. Use and documents this method if you
    want to allow administrators of an instance of your application to customize
    how H5P looks and feels in their instance.
    [See below](#adding-custom-scripts-and-styles-via-the-configuration) for
    more details.
-   You can upload addons. This makes changing how H5P looks and behaves
    particularly easy, but requires the creation of addons. See the
    [addon documentation page](addons.md) for details.

## Adding custom scripts and styles via constructor injection

You can add custom scripts and styles to the player by passing their URLs to the
constructor of `H5PPlayer` or `H5PEditor`:

```ts
const player = new H5PPlayer(
    libraryStorage,
    contentStorage,
    config,
    integrationObjectDefaults, // set to undefined if unneeded
    urlGenerator, // set to undefined if unneeded
    ['/url/of/script/1.js', 'https://example.com/external/script.js'],
    ['/url/of/style/1.js', 'https://example.com/external/style.css']
);
```

-or-

```ts
const editor = new H5PPlayer(
    cache,
    config,
    libraryStorage,
    contentStorage,
    translationCallback, // set to undefined if unneeded
    urlGenerator, // set to undefined if unneeded
    ['/url/of/script/1.js', 'https://example.com/external/script.js'],
    ['/url/of/style/1.css', 'https://example.com/external/style.css']
);
```

These scripts or styles will then be added to the end of the list of H5P scripts
that are loaded when the player or editor are loaded. Note that the URLs in the
arrays are simply appended to the list of core scripts and styles without any
changes. This means that they are not passed into URL generator!

## Adding custom scripts and styles via the configuration

You can add lists of JavaScript or CSS files to the configuration like this:

```json
{
    // ... further configuration values ...
    "customizing": {
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
    // ... further configuration values ...
}
```

These scripts or styles will then be added to the end of the list of H5P scripts
that are loaded when the player or editor are loaded. Note that the URLs in the
arrays are simply appended to the list of core scripts and styles without any
changes. This means that they are not passed into URL generator!
