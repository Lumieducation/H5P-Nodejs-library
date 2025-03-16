---
title: Integrating the core library
group: Documents
category: Guides
---

# Using @lumieducation/h5p-server to create your own H5P server application

## Installation

Add the library to a project by executing

```bash
npm install @lumieducation/h5p-server
```

## Adding the library to your project

_Note: The example snippets below use the_ [_ES2017 async await language
features_](https://javascript.info/async-await) _to simplify dealing with
promises. You can still use the traditional .then(()=&gt; {...}) style if
you wish so._

After installation, you can import the library in a JavaScript file with

```javascript
import * as H5P from '@lumieducation/h5p-server';
```

and instantiate the editor with

```javascript
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

This object of type {@link @lumieducation/h5p-server!H5PEditor | H5PEditor } is
**a server-side component** that is long-lived and includes most of the methods
that must be called when by the routes of your server. To find out what these
routes are and how they must call {@link @lumieducation/h5p-server!H5PEditor |
H5PEditor }, you can either check out the [section on content views in the docs](#creating-content-views)
or the [Express example project](https://github.com/Lumieducation/H5P-Nodejs-library/blob/release/packages/h5p-examples/src/expressRoutes.ts).

To render a HTML page (server-side rendering) with the editor inside (= the
HTML user interface around the actual editor and the editor itself) for a
specific content ID, you call

```javascript
const html = await h5pEditor.render(contentId, user);
// send the html to the browser, which will display it
```

To use a custom renderer, change it with

```javascript
h5pEditor.setRenderer(model => /** HTML string or object **/);
```

Check out the [default editor renderer](https://github.com/Lumieducation/H5P-Nodejs-library/blob/release/packages/h5p-server/src/renderers/default.ts)
for inspiration or customization possibilities.

You can also use a custom renderer that returns a plain object with the data
required to display an H5P editor instead of HTML markup. If you return this
data to the browser as a response to an Ajax call, you can also create Single
Page Applications that don't rely on server-side rendering.

See [the documentation page on constructing a `H5PEditor` object](./h5p-editor-constructor.md)
for more details on how to instantiate the
editor in a more customized way.

You can create {@link @lumieducation/h5p-server!H5PPlayer} objects in a similar
way and use them in a similar fashion.

## Handling AJAX Requests made by the core H5P client

The H5P client (running in the browser) sends many AJAX requests to the server
(this application). While this library provides you with everything required to
process the requests in the backend, your implementation must still serve the
requests to these endpoints. There is an Express adapter that you can use
out-of-the box for this purpose. Check out the [documentation on endpoints](./ajax-endpoints.md)
for details.

## Serving static H5P core files for the client

This application doesn't include the H5P JavaScript core files for the editor
and the player. These are the files that make up the editor and player that the
end user interacts with in the browser. The core files must be obtained
separately:

1. Download the [Core
   files](https://github.com/h5p/h5p-php-library/archive/refs/tags/1.27.0.zip) and place
   them into a folder called `h5p/core` in your project.

2. Download the [Editor
   files](https://github.com/h5p/h5p-editor-php-library/archive/refs/tags/moodle-1.27.0.zip)
   and place them into a folder called `h5p/editor` in your project.

You must add a route to your implementation that serves the static files found
under `h5p/core` and `h5p/editor` to the endpoint configured in {@link
@lumieducation/h5p-server!IH5PConfig.editorLibraryUrl |
config.editorLibraryUrl}. The out-of-the-box Express adapter already includes a
route for this.

## Creating content views

While the AJAX communication between the actual H5P editor client (running in
the browser) and the server (this application) can be fully handled by the
Express adapter, you must still create custom views for these purposes:

- View that is shown when creating new content
- View that is shown when editing existing content
- View for deleting content
- View that lists existing content
- View that plays content

The reason why you have to do this on your own is that this library is unaware
of other data that your system might attach to a piece of content (e.g. access
rights, tags). If you want any custom UI elements around the editor and player
(which is highly likely), you must put this into the views. Check out the
example for how to write custom views.

## Writing custom interface implementations

Several aspects of your H5P server can be customized by creating your own
implementation of interfaces and passing them to the {@link @lumieducation/h5p-server!H5PEditor.constructor | constructor of H5PEditor}.
That way you can use a database of your choice, cache data in Redis or store
user data in an object storage system.

The interfaces that can be implemented are:

- storage
    - {@link @lumieducation/h5p-server!IContentStorage | IContentStorage}
    - {@link @lumieducation/h5p-server!ILibraryStorage | ILibraryStorage}
    - {@link @lumieducation/h5p-server!ITemporaryFileStorage | ITemporaryFileStorage }
    - {@link @lumieducation/h5p-server!IContentUserDataStorage | IContentUserDataStorage }
    - {@link @lumieducation/h5p-server!IKeyValueStorage | IKeyValueStorage}
- other interfaces
    - {@link @lumieducation/h5p-server!IH5PConfig | IH5PConfig}
    - {@link @lumieducation/h5p-server!IUser | IUser}
    - {@link @lumieducation/h5p-server!IFileMalwareScanner | IFileMalwareScanner}
    - {@link @lumieducation/h5p-server!IFileSanitizer | IFileSanitizer }
    - {@link @lumieducation/h5p-server!ILibraryFileUrlResolver | ILibraryFileUrlResolver }
    - {@link @lumieducation/h5p-server!IPermissionSystem | IPermissionSystem }
    - {@link @lumieducation/h5p-server!ITranslationFunction | ITranslationFunction }
    - {@link @lumieducation/h5p-server!IUrlGenerator | IUrlGenerator }

There are already default implementations that you can use:

- The {@link @lumieducation/h5p-server!fsImplementations | file system
  implementations} store all data in the local file system and are only for
  demonstration purposes and not suitable to be used in a multi-user environment
  and not optimized for speed. You might be able to use them in a cluster setup
  by using a network storage.
- There are implementations of the storage classes for MongoDB and S3 in the
  {@link "@lumieducation/h5p-mongos3"} package.

## Calling maintenance functions regularly

The implementation needs to call several function regularly (comparable to a
cronjob):

- Call {@link @lumieducation/h5p-server!TemporaryFileManager.cleanUp |
  H5PEditor.temporaryFileManager} every 5 minutes. This checks which temporary
  files have expired and deletes them if necessary. It is important to do this,
  as temporary files are **not** automatically deleted when a piece of content
  is saved.
- Call {@link @lumieducation/h5p-server!ContentTypeCache.updateIfNecessary |
  H5PEditor.contentTypeCache} every 12 hours. This will download information
  about the available content types from the H5P Hub. If you don't do this,
  users won't be shown new content types or updates to existing content types
  when they become available.

## Handling errors

If something goes wrong and a call to the library can't continue execution, it
will normally throw either a {@link @lumieducation/h5p-server!H5pError} or an
{@link @lumieducation/h5p-server!AggregateH5pError} (a collection of several
errors). Both errors types represent errors that can be sent to the user to be
displayed in the client (in the user's language). They don't include the English
error message but an error id that you must translate yourself. Error ids and
their English translations can be found in
`/packages/h5p-server/assets/translations`. The translation strings follow the
format used by [i18next](https://i18next.com), but in theory you can use any
localization library.

Calls to the library might also throw regular `Error` objects. In this case the
error is not caused by the business logic, but by some more basic functionality
(file system, other library) or it might be an error that is addressed at the
developer (i.e. because function parameters aren't correctly used).

The Express adapter already catches errors, localizes them and returns proper
HTTP status codes. Check out the implementation there for a guide how to deal
with errors.

## Localization

This library supports localization. See the [respective documentation page](../advanced/localization.md) for more details.

## Customization

An application using {@link "@lumieducation/h5p-server"} can customize the way
H5P behaves in several ways. See [the documentation page on customization](../advanced/customization.md) for more details.

## Compliance and privacy

To conform with local law, you probably have to compile a privacy declaration
for your application. You can check out the [documentation page on privacy](../advanced/privacy.md) to find out what this library does with your
users' personal data.
