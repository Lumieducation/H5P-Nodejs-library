# H5P-Nodejs-library

[![CircleCI](https://circleci.com/gh/Lumieducation/H5P-Nodejs-library/tree/master.svg?style=svg)](https://circleci.com/gh/Lumieducation/H5P-Nodejs-library/tree/master)

This project is a re-implementation of the [H5P-Editor-PHP-library](https://github.com/h5p/h5p-editor-php-library) and [H5P-PHP-library](https://github.com/h5p/h5p-php-library) for Nodejs. It is written in TypeScript but can be used in JavaScript just as well.

Please note that this project is in a very early and experimental stage. If you have questions or want to contribute, feel free to open issues or pull requests.

An example of how to integrate and use this library with [Express](https://expressjs.com/) can be found in [examples](examples/).

## Trying out the demo

Make sure you have [`git`](https://git-scm.com/), [`node`](https://nodejs.org/) >= 10.16, and [`npm`](https://www.npmjs.com/get-npm) installed.

1. Clone the repository with git
2. `npm install`
3. `npm run build`
4. `npm start`

You can then open the URL http://localhost:8080 in any browser. Not that the project is still in its early stages and things will not work as expected.
The interfaces are also not stable yet!

## Using h5p-nodejs-library to create your own H5P server application

### Architecture

To find out what this library provides for you and what you must implement on your own, check
out the [architecture overview](docs/architecture.md) first.

### Installation

Install the library by executing

```
$ npm install h5p-nodejs-library
```

### Writing your custom implementation

After installation, you can import the library in a JavaScript file with

```js
const H5P = require('h5p-nodejs-library');
```

and instantiate the editor with

```js
const h5pEditor = new H5P.Editor(
    keyValueStorage,
    config,
    new FileLibraryStorage('/path/to/library/directory'),
    new FileContentStorage('/path/to/content/storage/directory'),
    translationService,
    (library, file) =>
        `/h5p-library-route/${library.machineName}-${library.majorVersion}.${library.minorVersion}/${file}`,
    new DirectoryTemporaryFileStorage('/path/to/temporary/storage')
);
```

and render the editor for content with a specific content ID with

```js
h5pEditor
    .render(contentId)
    .then(page => /** send page to browser **/);
```

To use a custom renderer, change it with

```js
h5pEditor.useRenderer(model => /** HTML string **/);
```

See [the documentation page on constructing a `H5PEditor` object](docs/h5p-editor-constructor.md) for more details on how to instantiate the editor.

### Handling AJAX Requests

The H5P client (running in the browser) sends many AJAX requests to the server (this application). While this library provides you with everything required to process the requests in the backend, your implementation must serve the requests to these endpoints. Check out the [documentation on endpoints](docs/endpoints.md) for details.

### Serving static H5P core files for the client

This application doesn't include the H5P JavaScript core files for the editor and the player. These are the files that make up the editor and player that the end user interacts with in the browser. The core files must be obtained separately:

1. Download the [Core Files](https://github.com/h5p/h5p-php-library/archive/1.24.0.zip) and place them into a folder called `h5p/core` in your project.
2. Download the [Editor Files](https://github.com/h5p/h5p-editor-php-library/archive/1.24.0.zip) and place them into a folder called `h5p/editor` in your project.

You must add a route to your implementation that serves the static files found under `h5p/core` and `h5p/editor` to the endpoint configured in `config.libraryUrl` . (See the [express-example](examples/express.js#L79))

### Writing custom interface implementations

Several aspects of your H5P server can be customized by creating your own implementation of interfaces and passing them to the constructor of `H5PEditor`. That way you can use a database of your choice, cache data in Redis or store user data in an object storage system.

The interfaces that can be implemented are:

-   `IContentStorage`
-   `IEditorConfig`
-   `ILibraryStorage`
-   `ITemporaryFileStorage`
-   `IUser`

There are already default implementations that you can use. These are only for demonstration purposes and are not suitable to be used in a multi-user environment and not optimized for speed.

### Calling maintenance functions regularly

The implementation needs to call several function regularly (comparable to a cronjob):

-   Call `H5PEditor.temporaryFileManager.cleanUp()` every 5 minutes. This checks which temporary files have expired and deletes them if necessary. It is important to do this, as temporary files are **not** automatically deleted when a piece of content is saved.
-   Call `H5PEditor.contentTypeCache.updateIfNecessary()` every 12 hours. This will download information about the available content types from the H5P Hub. If you don't do this, users won't be shown new content types or updates to existing content types when they become available.

## Development & Testing

### Prerequisites

Make sure you have [`git`](https://git-scm.com/), [`node`](https://nodejs.org/) >= 10.16, and [`npm`](https://www.npmjs.com/get-npm) installed.

### Installation

```
git clone https://github.com/Lumieducation/h5p-nodejs-library
cd h5p-nodejs-library
npm install
```

### Building the TypeScript files

You must transpile the TypeScript files to ES5 for the project to work (the TypeScript transpiler will be installed automatically if you run `npm install`):

```
npm run build
```

### Run Tests

After installation, you can run the tests with

```
npm test
```

### Debugging

The library emits log messages with [debug](https://www.npmjs.com/package/debug). To see those messages you have to set the environment variable `DEBUG` to `h5p:*`. There are several log levels. By default you'll only see the messages sent with the level `info`. To get the verbose log, set the environment variable `LOG_LEVEL` to verbose (mind the capitalization).

Example (for Linux):

```
$ DEBUG=h5p:* LOG_LEVEL=verbose node script.js
```

### Other scripts

Check out the many other npm scripts in [package.json](package.json) for other development functionality.

## Contributing

Lumi tries to improve education wherever it is possible by providing a software that connects teachers with their students. Every help is appreciated and welcome.

Feel free to create pull requests.

h5p-nodejs-library has adopted the code of conduct defined by the Contributor Covenant. It can be read in full [here](./CODE-OF-CONDUCT.md).

### Get in touch

[Slack](https://join.slack.com/t/lumi-education/shared_invite/enQtMjY0MTM2NjIwNDU0LWU3YzVhZjdkNGFjZGE1YThjNzBiMmJjY2I2ODk2MzAzNDE3YzI0MmFkOTdmZWZhOTBmY2RjOTc3ZmZmOWMxY2U) or [c@Lumi.education](mailto:c@Lumi.education).

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/Lumieducation/Lumi/tags).

## License

This project is licensed under the GNU GENERAL PUBLIC LICENSE v3 License - see the [LICENSE](LICENSE) file for details

## Support

This work obtained financial support for development from the German BMBF-sponsored research project "CARO - Care Reflection Online" (FKN: 01PD15012).

Read more about them at the following websites:

-   CARO - https://blogs.uni-bremen.de/caroprojekt/
-   University of Bremen - https://www.uni-bremen.de/en.html
-   BMBF - https://www.bmbf.de/en/index.html

