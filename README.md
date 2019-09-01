# H5P-Editor

[![Build Status](https://travis-ci.org/Lumieducation/H5P-Editor-Nodejs-library.svg?branch=master)](https://travis-ci.org/Lumieducation/H5P-Editor-Nodejs-library)

This project is a port of the [H5P-Editor-PHP-library](https://github.com/h5p/h5p-editor-php-library) for Nodejs.

Please note that this project is in a very early and experimental stage. If you have questions or want to contribute, feel free to open issues or pull requests.

An example of how to integrate and use this library can be found in the [H5P-Demo](https://github.com/Lumieducation/H5P-Demo) project.


## Installation

You can install the library with 

```
npm install h5p-editor
```


## Usage

After installation, you can import the library with

```js
const H5PEditor = require('h5p-editor');
```

and instantiate the Editor with

```js
const h5pEditor = new H5PEditor.Editor(
        urls,
        keyValueStorage,
        config,
        new H5PEditor.FileLibraryStorage("/path/to/library/directory"),
        new H5PEditor.FileContentStorage("/path/to/content/storage/directory"),
        user,
        translationService);
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

### Constructor Arguments

The constructor arguments are used to provide data storage services and HTTP paths to the Editor.

#### urls

An object containing strings used as URL prefixes by the editor

```js
const urls = {
    baseUrl: '/h5p',            // path to core files and libraries
    ajaxPath: '/ajax?action=',  // URL prefix for all AJAX requests (see below)
    libraryUrl: '/h5p/editor/', // path to editor "core files" (see below)
    filesPath: '/h5p/content'   // base path for content files (e.g. images)
}
```

#### keyValueStore

The `keyValueStore` object is used by the `ContentTypeCache` to persist information about Content Types. It must be able to store arbitrary nested objects.

It must implement the following interface:

```js
const keyValueStore = {
    async save(key, value) {
        /** store given value under key, 
         * overwriting potential existing values **/
    }

    async load(key) {
        return /** value stored under key **/;
    }
}
```

#### config

An object holding all configuration parameters as properties. You can find the description of the parameters in [`src/config.js`](https://github.com/Lumieducation/H5P-Editor-Nodejs-library/blob/master/src/config.js).

#### libraryStorage

The `libraryStorage` provides information about installed libraries and installs them.

It must implement the following interface

```js
const libraryStorage = {
    /**
     * Returns all installed libraries or the installed libraries that have the machine names in the arguments.
     * @param  {...any} machineNames (optional) only return libraries that have these machine names
     * @returns {Promise<Library[]>} the libraries installed
     */
    async getInstalled(...machineNames) {
        return Promise.resolve([/** Library instances of installed libraries **/])
    }

    /**
     * Get id to an existing installed library.
     * If version number is not specified, the newest version will be returned.
     * @param {Library} library Note that patch version is ignored.
     * @returns {Promise<number>} The id of the specified library or undefined (if not installed).
     */
    async getId(library) {
        return Promise.resolve(/** a number or undefined **/)
    }

    /**
     * Returns a readable stream of a library file's contents. 
     * Throws an exception if the file does not exist.
     * @param {Library} library library
     * @param {string} filename the relative path inside the library
     * @returns {Stream} a readable stream of the file's contents
     */
    async getFileStream(library, filename) {
        return Promise.resolve(fs.createReadStream(/** location of library file on local disk **/))
    }

     /**
     * Gets a list of installed language files for the library.
     * @param {Library} library The library to get the languages for
     * @returns {Promise<string[]>} The list of JSON files in the language folder (without the extension .json)
     */
    async getLanguageFiles(library) {
        return Promise.resolve([/** array of translations for this library (without .json ending)**/])
    }

    /**
    * Check if the library contains a file
    * @param {Library} library The library to check
    * @param {string} filename
    * @return {Promise<boolean>} true if file exists in library, false otherwise
    */
    async fileExists(library, filename) {
        return Promise.resolve(true)
    }

    /**
     * Adds the metadata of the library to the repository.
     * Throws errors if something goes wrong.
     * @param {any} libraryMetadata The library metadata object (= content of library.json)
     * @param {boolean} restricted True if the library can only be used be users allowed to install restricted libraries.
     * @returns {Promise<Library>} The newly created library object to use when adding library files with addLibraryFile(...)
     */
    async installLibrary(libraryMetadata, { restricted = false }) {
        return Promise.resolve(new Library(/** data about the library **/))
    }

    /**
     * Removes the library and all its files from the repository.
     * Throws errors if something went wrong.
     * @param {Library} library The library to remove.
     * @returns {Promise<void>}
     */
    async removeLibrary(library) {
        return
    }

    /**
     * Adds a library file to a library. The library metadata must have been installed with installLibrary(...) first.
     * Throws an error if something unexpected happens.
     * @param {Library} library The library that is being installed
     * @param {string} filename Filename of the file to add, relative to the library root
     * @param {stream} stream The stream containing the file content
     * @returns {Promise<boolean>} true if successful
     */
    async addLibraryFile(library, filename, stream) {
        /** save data in stream into file with filePath 
         * (starting with library folder e.g. 'Foo-1.2')
         * and resolve(true) when done **/);
    }
}
```

##### Available implementation

If you store all library information as files in folders under `./h5p/libraries` you can use

```js
const libraryStorage = new H5PEditor.FileLibraryStorage(`h5p/libraries`);
```

#### contentStorage

The `contentStorage` provides information about installed content and creates it.

It must implement the following interface

```js
const contentStorage = {
    /**
     * Creates a content object in the repository. Add files to it later with addContentFile(...).
     * @param {any} metadata The metadata of the content (= h5p.json)
     * @param {any} content the content object (= content/content.json)
     * @param {User} user The user who owns this object.
     * @param {number} id (optional) The content id to use
     * @returns {Promise<number>} The newly assigned content id
     */
    async createContent(metadata, content, user, id) {
        /** Check if user has write permission and store the information received in the parameters 
         * to the database / disk **/
        return Promise.resolve(/** id of content object (typically received from database) **/)
    }

    /**
     * Adds a content file to an existing content object. The content object has to be created with createContent(...) first.
     * @param {number} id The id of the content to add the file to
     * @param {string} filename The filename INSIDE the content folder
     * @param {Stream} stream A readable stream that contains the data
     * @param {User} user The user who owns this object
     * @returns {Promise<void>}
     */
    async addContentFile(id, filename, stream, user) {
        /** Check if the user has write permission and store the file **/ 
        return Promise.resolve()
    }

    /**
     * Returns a readable stream of a content file (e.g. image or video) inside a piece of conent
     * @param {number} id the id of the content object that the file is attached to
     * @param {string} filename the filename of the file to get (you have to add the "content/" directory if needed)
     * @param {User} user the user who wants to retrieve the content file
     * @returns {Stream}
     */
    getContentFileStream(id, filename, user) {
        /** Check if the user has read permission for the content type and return a stream **/
        return fs.CreateReadStream(/** location of content file on local disk **/)
    }

    /**
     * Deletes content from the repository.
     * Throws errors if something goes wrong.
     * @param {number} id The content id to delete.
     * @param {User} user The user who wants to delete the content
     * @returns {Promise<void>}
     */
    async deleteContent(id, user) {
        /** Check if user has write permission to content and delte the content and all dependent files. **/
        return Promise.resolve()
    }

     /**
     * Generates a unique content id that hasn't been used in the system so far.
     * @returns {Promise<number>} A unique content id
     */
    async createContentId() {
        return Promise.resolve(/** unique content id goes here **/)
    }
}
```

##### Available implementation

If you store all library information as files in folders under `./h5p/content` you can use

```js
const contentStorage = new H5PEditor.FileContentStorage(`h5p/content`);
```

#### user

An object containing access control information in the following properties

```js
const user = {
    type: 'local'
    canCreateRestricted: true,
    canInstallRecommended: true,
    canUpdateAndInstallLibraries: true,
}
```

#### translationService

Used to translates literals into the local language. It must implement the following method

```js
const translationService = {
    /**
     * Gets the literal for the identifier and performs replacements of placeholders / variables.
     * @param {string} id The identifier of the literal
     * @param {[key: string]: string} replacements An object with the replacement variables in key-value format.
     * Incidences of any key in this array are replaced with the corresponding value. Based
     * on the first character of the key, the value is escaped and/or themed:
     *    - !variable inserted as is
     *    - &#064;variable escape plain text to HTML
     *    - %variable escape text to HTML and theme as a placeholder for user-submitted content
     * @returns The literal translated into the language used by the user and with replacements.
     */
    getTranslation(id, replacements = {}) {
        return /** a string **/
    }
}
```

### AJAX Requests

The following URLs assume the urls

```js
const urls = {
    baseUrl: '/h5p',
    ajaxPath: '/ajax?action=',
    libraryUrl: '/h5p/editor/',
    filesPath: '/h5p/content'
}
```

#### Save Content

`POST /?contentId=<string>`

Saves the new version of a content with given `contentId`. 

The request will be sent to the URL under which the editor is rendered.

Its body is

```js
{ 
    params: {
        params: {/** new content **/},
        metadata: {/** new metadata **/}
    },
    library: /** name of library **/
}
```

The request data should be passed to `saveH5P`

```js
h5pEditor.saveH5P(
    contentId, 
    body.params.params, 
    body.params.metadata, 
    body.library)
```

#### Get Content Information

`GET /params?contentId=<string>`

Requests information about content. Respond with

```js
h5pEditor
    .loadH5P(contentId)
    .then(content => /** send content to browser **/)
```

#### Get Content Type Cache

`GET /ajax?action=content-type-cache`

Requests available content types. Respond with

```js
h5pEditor
    .getContentTypeCache()
    .then(types => /** send types to browser **/)
```

#### Get Library Data

`GET /ajax?action=libraries&machineName=<string>&majorVersion=<int>&minorVersion=<int>&language=<string>`

Requests data about a specific library. Respond with

```js
h5pEditor
    .getLibraryData(
        machineName,
        majorVersion,
        minorVersion,
        language
    )
    .then(library => /** send library to browser **/);
```

#### Get Library Overview

`POST /ajax?action=libraries`

requests overview information about the given libraries. Respond with

```js
h5pEditor
    .getLibraryOverview(body.libraries)
    .then(libraries => /** send libraries to browser **/)
```

#### Save Content File

`POST /ajax?action=files&contentId=<string>`

Sends a file to be saved under the given content ID. 
The ID can be passed in the query string of the body of the request.

```js
h5pEditor
    .saveContentFile(
        body.contentId === '0'
            ? query.contentId
            : body.contentId,
        JSON.parse(body.field),
        files.file)
    .then(response => /** send response to browser **/);
```

#### Install Library

`POST /ajax?action=library-install&libraryId=<string>`

Requests for the given library to be installed. Handle with

```js
h5pEditor
    .installLibrary(libraryId)
    .then(() => h5pEditor.getContentTypeCache())
    .then(contentTypeCache => ({ success: true, data: contentTypeCache }))
    .then(response => /** send response to browser **/)
```

#### Upload Package

`POST /ajax?action=library-upload&contentId=<string>`

is used to upload a `.h5p` file, and install the containing libraries and content

Handle with

```js
h5pEditor.uploadPackage(query.contentId, files.h5p.data)
    .then(() => Promise.all([
        h5pEditor.loadH5P(query.contentId),
        h5pEditor.getContentTypeCache()
    ]))
    .then(([content, contentTypes]) => ({
        success: true,
        data: {
            h5p: content.h5p,
            content: content.params.params,
            contentTypes
        }
    }))
    .then(response => /** send response to browser **/)
```

### Core Files

See the [example integration for express](https://github.com/Lumieducation/H5P-Demo/blob/master/express.js) how to integrate it with express.

You have to provide the H5P core and library files. To do so

1. Download the [Core Files](https://github.com/h5p/h5p-php-library/archive/1.22.0.zip) and place its content in your project.
2. Download the [Editor Files](https://github.com/h5p/h5p-editor-php-library/archive/1.22.0.zip) and place its content in your project.
3. Add a route that serves the downloaded files. (See the [express-example](https://github.com/Lumieducation/H5P-Demo/blob/master/express.js#L62))

### Adapters

We will provide adapters for express and meteor in the future. If you would like to see another adapter, please make a issue.


## Content-Type Hub

If you want to use your own Content Type Hub, you can find the protocol you have to implement in [hub-protocol.md](https://github.com/Lumieducation/H5P-Editor-Nodejs-library/blob/master/hub-protocol.md).


## Development & Testing

### Prerequisites

Make sure you have [`git`](https://git-scm.com/), [`node`](https://nodejs.org/) >= 10.16, and [`npm`](https://www.npmjs.com/get-npm) installed.

### Installation

```
git clone https://github.com/Lumieducation/h5p-editor-nodejs-library
cd h5p-editor-nodejs-library
npm install
```

### Run Tests

After installation, your can run the tests with

```
npm test
```


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
CARO - https://blogs.uni-bremen.de/caroprojekt/
University of Bremen - https://www.uni-bremen.de/en.html
BMBF - https://www.bmbf.de/en/index.html 
