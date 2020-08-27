# H5P-Nodejs-library

[![CircleCI](https://circleci.com/gh/Lumieducation/H5P-Nodejs-library/tree/master.svg?style=svg)](https://circleci.com/gh/Lumieducation/H5P-Nodejs-library/tree/master)
[![Coverage
Status](https://coveralls.io/repos/github/Lumieducation/H5P-Nodejs-library/badge.svg?branch=master)](https://coveralls.io/github/Lumieducation/H5P-Nodejs-library?branch=master)

This project is a re-implementation of the
[H5P-Editor-PHP-library](https://github.com/h5p/h5p-editor-php-library) and
[H5P-PHP-library](https://github.com/h5p/h5p-php-library) for Nodejs. It is
written in TypeScript but can be used in JavaScript just as well.

Please note that even if most functionality of H5P seems to work, **there are
parts which haven't been implemented yet or which might be faulty.** This is
particularly true for security concerns. For a more comprehensive list of what
works and what doesn't, check out [the corresponding documentation
page](docs/status.md). The interfaces have reached some level of stability, but
might still change in future major releases. If you have questions or want to
contribute, feel free to open issues or pull requests.

An example of how to integrate and use this library with
[Express](https://expressjs.com/) can be found in [examples](examples/).

## Trying out the demo

Make sure you have [`git`](https://git-scm.com/), [`node`](https://nodejs.org/)

> = 10.16, and [`npm`](https://www.npmjs.com/get-npm) installed. If you use
> Windows, you must use bash (comes with Git for windows) as a command shell
> (otherwise scripts won't run).

1. Clone the repository with git
2. `npm install`
3. `npm run build`
4. `npm start`

You can then open the URL http://localhost:8080 in any browser.

## Trying out the demo on Docker

Make sure you have [`git`](https://git-scm.com/) and
[`docker`](https://www.docker.com/) installed.

1. Clone the repository with git
2. `docker build -t <your-username>/h5p-nodejs-library .`
3. `docker run -p 3000:8080 -d <your-username>/h5p-nodejs-library`

You can then open the URL http://localhost:3000 in any browser.

## Using h5p-nodejs-library to create your own H5P server application

### Architecture

To find out what this library provides for you and what you must implement on
your own, check out the [architecture overview](docs/architecture.md) first.

### Installation

Install the library by executing

```sh
npm install h5p-nodejs-library
```

### Writing your custom implementation

_Note: The example snippets below use the [ES2017 async await language
features](https://javascript.info/async-await) to simplify dealing with
promises. You can still use the traditional .then(()=> {...}) style if you wish
so._

After installation, you can import the library in a JavaScript file with

```js
const H5P = require('h5p-nodejs-library');
```

and instantiate the editor with

```js
const h5pEditor = H5P.fs(
    await new H5P.H5PConfig(
        new H5P.fsImplementations.JsonStorage(
            path.resolve('examples/config.json') // the path on the local disc
            // where the configuration file is stored
        )
    ).load(),
    path.resolve('h5p/libraries'), // the path on the local disc where libraries
    // should be stored
    path.resolve('h5p/temporary-storage'), // the path on the local disc where
    // temporary files (uploads) should
    // be stored
    path.resolve('h5p/content') // the path on the local disc where content is
    // stored
);
```

and render the editor for content (= the HTML user interface around the actual
editor and the editor itself) with a specific content ID with

```js
const page = await h5pEditor.render(contentId);
// send the page to the browser
```

To use a custom renderer, change it with

```js
h5pEditor.setRenderer(model => /** HTML string **/);
```

See [the documentation page on constructing a `H5PEditor`
object](docs/h5p-editor-constructor.md) for more details on how to instantiate
the editor in a more customized way.

### Handling AJAX Requests

The H5P client (running in the browser) sends many AJAX requests to the server
(this application). While this library provides you with everything required to
process the requests in the backend, your implementation must still serve the
requests to these endpoints. There is an Express adapter that you can use
out-of-the box for this purpose. Check out the [documentation on
endpoints](docs/endpoints.md) for details.

### Serving static H5P core files for the client

This application doesn't include the H5P JavaScript core files for the editor
and the player. These are the files that make up the editor and player that the
end user interacts with in the browser. The core files must be obtained
separately:

1. Download the [Core
   Files](https://github.com/h5p/h5p-php-library/archive/1.24.0.zip) and place
   them into a folder called `h5p/core` in your project.
2. Download the [Editor
   Files](https://github.com/h5p/h5p-editor-php-library/archive/1.24.0.zip) and
   place them into a folder called `h5p/editor` in your project.

You must add a route to your implementation that serves the static files found
under `h5p/core` and `h5p/editor` to the endpoint configured in
`config.libraryUrl`. The out-of-the-box Express adapter already includes a route
for this.

### Creating content views

While the AJAX communication between the actual H5P editor client (running in
the browser) and the server (this application) can be fully handled by the
Express adapter, you must still create custom views for these purposes:

-   View that is shown when creating new content
-   View that is shown when editing existing content
-   View for deleting content
-   View that lists existing content
-   View that plays content

The reason why you have to do this on your own is that this library is unaware
of other data that your system might attach to a piece of content (e.g. access
rights, tags). If you want any custom UI elements around the editor and player
(which is highly likely), you must put this into the views. Check out the
example for how to write custom views.

### Writing custom interface implementations

Several aspects of your H5P server can be customized by creating your own
implementation of interfaces and passing them to the constructor of `H5PEditor`.
That way you can use a database of your choice, cache data in Redis or store
user data in an object storage system.

The interfaces that can be implemented are:

-   `IContentStorage`
-   `IH5PConfig`
-   `ILibraryStorage`
-   `ITemporaryFileStorage`
-   `IUser`

There are already default implementations that you can use:

-   The implementations in the `fs` folder store all data in the local file
    system and are only for demonstration purposes and not suitable to be used
    in a multi-user environment and not optimized for speed. You might be able
    to use them in a cluster setup by using a network storage.
-   There is a implementation of the content storage for MongoDB and
    S3-compatible storage systems. Check out more information [in the
    documentation page](/docs/mongo-s3-content-storage.md).
-   There is a implementation of the temporary file storage for S3-comptaible
    storage system. Check out more information [in the documentation
    page](/docs/s3-temporary-file-storage.md).

### Calling maintenance functions regularly

The implementation needs to call several function regularly (comparable to a
cronjob):

-   Call `H5PEditor.temporaryFileManager.cleanUp()` every 5 minutes. This checks
    which temporary files have expired and deletes them if necessary. It is
    important to do this, as temporary files are **not** automatically deleted
    when a piece of content is saved.
-   Call `H5PEditor.contentTypeCache.updateIfNecessary()` every 12 hours. This
    will download information about the available content types from the H5P
    Hub. If you don't do this, users won't be shown new content types or updates
    to existing content types when they become available.

### Handling errors

If something goes wrong and a call to the library can't continue execution, it
will normally throw either a `H5PError` or an `AggregateH5PError` (a collection
of several errors). Both errors types represent errors that can be sent to the
user to be displayed in the client (in the user's language). They don't include
the English error message but an error id that you must translate yourself.
Error ids and their English translations can be found in
[`assets/translations`](/assets/translations). The translation strings follow
the format used by [i18next](https://i18next.com), but in theory you can use any
localization library.

Calls to the library might also throw regular `Error` objects. In this case the
error is not caused by the business logic, but by some more basic functionality
(file system, other library) or it might be an error that is addressed at the
developer (i.e. because function parameters aren't correctly used).

The Express adapter already catches errors, localizes them and returns proper
HTTP status codes. Check out the implementation there for a guide how to deal
with errors.

### Localization

This library supports localization. See the [respective documentation
page](/docs/localization.md) for more details.

### Customization

An application using h5p-nodejs-library can customize the way H5P behaves in
several ways. See [the documentation page on
customization](/docs/customization.md) for more details.

### Compliance and privacy

To conform with local law, you probably have to compile a privacy declaration
for your application. You can check out the [documentation page on
privacy](docs/privacy.md) to find out what this library does with your users'
personal data.

## Development & Testing

### Prerequisites

Make sure you have [`git`](https://git-scm.com/), [`node`](https://nodejs.org/)

> = 10.16, and [`npm`](https://www.npmjs.com/get-npm) installed. If you use
> Windows, you must use bash (comes with Git for windows) as a command shell
> (otherwise scripts won't run).

### Installation for development purposes

```sh
git clone https://github.com/Lumieducation/h5p-nodejs-library
cd h5p-nodejs-library
npm install
```

### Building the TypeScript files

You must transpile the TypeScript files to ES5 for the project to work (the
TypeScript transpiler will be installed automatically if you run `npm install`):

```sh
npm run build
```

### Run Tests

After installation, you can run the tests with

```sh
npm test
```

You can run the e2e tests with h5p packages on your local system like this:

```sh
$ H5P_FILES=test/data/hub-content ERROR_FILE=errors.txt npm run test:server+upload
```

### Debugging

The library emits log messages with
[debug](https://www.npmjs.com/package/debug). To see those messages you have to
set the environment variable `DEBUG` to `h5p:*`. There are several log levels.
By default you'll only see the messages sent with the level `info`. To get the
verbose log, set the environment variable `LOG_LEVEL` to debug (mind the
capitalization).

Example (for Linux):

```sh
DEBUG=h5p:* LOG_LEVEL=debug node script.js
```

### Other scripts

Check out the many other npm scripts in [package.json](package.json) for other
development functionality.

## Contributing

Lumi tries to improve education wherever it is possible by providing a software
that connects teachers with their students. Every help is appreciated and
welcome.

Feel free to create pull requests.

h5p-nodejs-library has adopted the code of conduct defined by the Contributor
Covenant. It can be read in full [here](./CODE-OF-CONDUCT.md).

### Get in touch

[Slack](https://join.slack.com/t/lumi-education/shared_invite/enQtMjY0MTM2NjIwNDU0LWU3YzVhZjdkNGFjZGE1YThjNzBiMmJjY2I2ODk2MzAzNDE3YzI0MmFkOTdmZWZhOTBmY2RjOTc3ZmZmOWMxY2U)
or [c@Lumi.education](mailto:c@Lumi.education).

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available,
see the [tags on this repository](https://github.com/Lumieducation/Lumi/tags).

## License

This project is licensed under the GNU GENERAL PUBLIC LICENSE v3 License - see
the [LICENSE](LICENSE) file for details

## Support

This work obtained financial support for development from the German
BMBF-sponsored research project "CARO - Care Reflection Online" (FKN:
01PD15012).

Read more about them at the following websites:

-   CARO - https://blogs.uni-bremen.de/caroprojekt/
-   University of Bremen - https://www.uni-bremen.de/en.html
-   BMBF - https://www.bmbf.de/en/index.html
