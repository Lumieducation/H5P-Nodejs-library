# Handling AJAX requests

## Configuring the endpoints

The H5P client (run in the browser by the user ) can be configured to use custom AJAX request endpoints. These can be configured in the config object. The relevant settings (including defaults) are:

```js
const config = {
    baseUrl: '/h5p', // a prefix added to all URLs
    ajaxPath: '/ajax?action=', // URL prefix for all AJAX requests
    libraryUrl: '/h5p/editor/', // path to static editor "core files" (not the content types!)
    filesPath: '/h5p/content', // base path for content files (e.g. images, video)
    ... // further configuration values
}
```

## Processing requests

Your implementation must process requests to these endpoints and relay them to the H5PEditor or H5PPlayer objects:

### Save Content

`POST /?contentId=<string>`

Saves the new version of a content with given `contentId`. The contentId can also be undefined, in which case a new one is assigned and returned to the caller.

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

The request data should be passed to `H5PEditor.saveH5P`

```js
h5pEditor.saveH5P(
    contentId, // (optional)
    body.params.params,
    body.params.metadata,
    body.library
);
```

### Get Content Information

`GET /params?contentId=<string>`

Requests information about a piece of content. Respond with

```js
h5pEditor
    .loadH5P(
        contentId,
        user)       // the requesting user
    .then(content => /** send content to browser **/)
```

### Get Content Type Cache

`GET /ajax?action=content-type-cache`

Requests available content types. Respond with

```js
h5pEditor
    .getContentTypeCache(user)
    .then(types => /** send types to browser **/)
```

### Get Library Data

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

### Get Library Overview

`POST /ajax?action=libraries`

requests overview information about the given libraries. Respond with

```js
h5pEditor
    .getLibraryOverview(body.libraries)
    .then(libraries => /** send libraries to browser **/)
```

### Save Content File

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

### Install Library

`POST /ajax?action=library-install&libraryId=<string>`

Requests for the given library to be installed. Handle with

```js
h5pEditor
    .installLibrary(libraryId, user)
    .then(() => h5pEditor.getContentTypeCache(user))
    .then(contentTypeCache => ({ success: true, data: contentTypeCache }))
    .then(response => /** send response to browser **/)
```

### Upload Package

`POST /ajax?action=library-upload&contentId=<string>`

is used to upload a `.h5p` file, and install the containing libraries and content

Handle with

```js
h5pEditor.uploadPackage(files.h5p.data, query.contentId, user)
    .then(() => Promise.all([
        h5pEditor.loadH5P(query.contentId),
        h5pEditor.getContentTypeCache(user)
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
