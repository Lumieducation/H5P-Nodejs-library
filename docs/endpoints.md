# Handling AJAX requests

## Handling requests with the Express adapter

Your implementation must process requests to several endpoints and relay them to the H5PEditor or H5PPlayer objects. All Ajax endpoints are already implemented in the [Express adapter](../src/adapters/H5PAjaxRouter/H5PAjaxExpressRouter.ts), which you can use like this:

Import the Express adapter router like this:

```ts
import h5pAjaxExpressRouter from 'h5p-nodejs-library/build/src/adapters/H5PAjaxRouter/H5PAjaxExpressRouter';
```

or in classic JS style:

```js
const h5pAjaxExpressRouter = require('h5p-nodejs-library/build/src/adapters/H5PAjaxRouter/H5PAjaxExpressRouter');
```

**You must use submodule imports because regularly exporting the router would mean that every implementation must install the express package.**

Then add the router to your Express app like this

```js
app.use(
    // server is an object initialized with express()
    '/h5p', // the route under which all the Ajax calls will be registered
    h5pAjaxExpressRouter(
        h5pEditor, // an H5P.H5PEditor object
        path.resolve('h5p/core'), // the path to the h5p core files (of the player)
        path.resolve('h5p/editor'), // the path to the h5p core files (of the editor)
        routeOptions, // the options are optional and can be left out
        languageOverride // (optional) can be used to override the language used by i18next http middleware
    )
);
```

Note that the Express adapter does not include pages to create, editor, view, list or delete content!

You can customize which endpoints you want to use by setting the respective flags in the `options` object. By default,
the adapter will handle **all** routes and you can turn individual ones off by setting `routeXX` to false. You can also
turn off the error handling (`handleErrors: false`). Normally, the router will send back localized responses that the H5P
client can understand. If you turn error handling off, the routes will throw errors that you have to handle yourself!

**IMPORTANT:** The adapter expects the requests object of Express to be extended like this:

```ts
{
    user: IUser, // must be populated with information about the user (mostly id and access rights)
    t: (errorId: string, replacements: {[key: string]: string }) => string
}
```

The function `t` must return the string for the errorId translated into the user's or the content's language.
Replacements are added to the localized string with curly braces: {{replacement}}
It is suggested you use [i18next](https://www.i18next.com/) for localization, but you can use any library,
as long as you make sure the function t is added to the request object.

## Handling requests yourself

If you choose to do so, you can also handle requests manually. You must then follow these specifications:

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

The request data should be passed to `H5PEditor.saveOrUpdateContent`

```js
h5pEditor.saveOrUpdateContent(
    contentId, // (optional)
    body.params.params,
    body.params.metadata,
    body.library,
    user // add information about the current user
);
```

### Get Content Information

`GET /params?contentId=<string>`

Requests information about a piece of content. Respond with

```js
const content = await h5pEditor.getContent(contentId, user); // the requesting user
/** send content to browser **/
```

### Get Content Type Cache

`GET /ajax?action=content-type-cache`

Requests available content types. Respond with

```js
const hubInfo = await h5pEditor.getContentTypeCache(user);
/** send hub info to browser **/
```

### Get Library Data

`GET /ajax?action=libraries&machineName=<string>&majorVersion=<int>&minorVersion=<int>&language=<string>`

Requests data about a specific library. Respond with

```js
const libraryData = await h5pEditor.getLibraryData(
    machineName,
    majorVersion,
    minorVersion,
    language
);
/** send library to browser **/
```

### Get Library Overview

`POST /ajax?action=libraries`

requests overview information about the given libraries. Respond with

```js
const overview = await h5pEditor.getLibraryOverview(body.libraries);
/** send overview to browser **/
```

### Save Content File

`POST /ajax?action=files&contentId=<string>`

Sends a file to be saved under the given content ID.
The ID can be passed in the query string of the body of the request.

```js
const response = h5pEditor.saveContentFile(
    body.contentId === '0' ? query.contentId : body.contentId,
    JSON.parse(body.field),
    files.file,
    user
);
/** send response to browser **/
```

### Install Library

`POST /ajax?action=library-install&libraryId=<string>`

Requests for the given library to be installed. Handle with

```js
await h5pEditor.installLibraryFromHub(libraryId, user);
const contentTypeCache = await h5pEditor.getContentTypeCache(user);
const response = { success: true, data: contentTypeCache };
/** send response to browser **/
```

### Upload Package

`POST /ajax?action=library-upload&contentId=<string>`

is used to upload a `.h5p` file, and install the containing libraries and content

Handle with

```js
const result = await h5pEditor.uploadPackage(files.h5p.data, user);
const contentTypeCache = await h5pEditor.getContentTypeCache(user);
const response = {
    success: true,
    data: {
        h5p: result.metadata,
        content: result.parameters,
        contentTypes: contentTypeCache
    }
};
/** send response to browser **/
```

## Configuring the routes to endpoints

The H5P client (run in the browser by the user) can be configured to use custom AJAX request endpoints. These can be configured in the config object. The relevant settings (including defaults) are:

```js
const config = {
    ajaxUrl: '/ajax?action=',   // URL prefix for all AJAX requests
    baseUrl: '/h5p',            // a prefix added to all Ajax URLs
    contentFilesUrl: '/content',// base path for content files (e.g. images, video)
    coreUrl: '/core',           // URL of static player "core files"
    downloadUrl: '/download',   // URL to download h5p packages
    editorLibraryUrl: '/editor',// URL of static editor "core files" (not the content types!)
    librariesUrl: '/libraries', // URL at which library files (= content types) can be retrieved
    paramsUrl: '/params'        // URL at which the parameters (= content.json) of content can be retrieved
    playUrl: '/play'            // URL at which content can be displayed
    ... // further configuration values
}
```
