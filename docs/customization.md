# Customization

An application using h5p-nodejs-library can customize the way H5P behaves in
several ways:

-   You can add custom JavaScript to the player by passing their URL to the
    constructor of `H5PPlayer`. See below for details.
-   You can upload addons. See the [addon documentation page](addons.md) for
    details.

## Adding custom scripts to the player

You can add custom scripts to the player by passing their URLs to the
constructor of `H5PPlayer`:

```ts
const player = new H5PPlayer(
    libraryStorage,
    contentStorage,
    config,
    integrationObjectDefaults,
    [ '/url/of/script/1.js', 'https://example.com/external/script.js' ]
    );
)
```

These scripts will then be added to the end of the list of H5P scripts that are
loaded for the player.
