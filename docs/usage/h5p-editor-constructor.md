---
title: Constructing H5PEditor
group: Documents
category: Guides
---

# Constructing a H5PEditor object

There are two ways of creating a H5PEditor object:

- You can use the convenience function {@link @lumieducation/h5p-server!fs}
  that uses basic file system implementations for all data storage services.
  You can use the function if you're just getting started. Later on, you'll
  want to construct the editor with custom implementations of the data storage
  services. Check out the JSDoc of the function for details how to use it.
- You can construct it manually by calling {@link
  @lumieducation/h5p-server!H5PEditor.constructor | new H5P.H5PEditor(...)}. The
  constructor arguments are used to provide data storage services and settings.
  You can find the interfaces referenced in the API documentation of the {@link
  "@lumieducation/h5p-server"} module.

Explanation of the arguments of the constructor:

## cache

The `cache` object is used by {@link @lumieducation/h5p-server!ContentTypeCache}
to persist information about content types. It might be also used for other
functionality in the future. It must be able to store arbitrary nested objects
and must implement the interface {@link
@lumieducation/h5p-server!IKeyValueStorage}. If used in a multi-machine or
multi-process setup, the cache must be a single point of truth and work across
all processes.

## config

An object holding all configuration parameters as properties. It must implement
the {@link @lumieducation/h5p-server!IH5PConfig} interface. You can use the
sample implementation in {@link @lumieducation/h5p-server!H5PConfig}.

## libraryStorage

The `libraryStorage` provides information about installed libraries and installs
them. It must implement the {@link @lumieducation/h5p-server!ILibraryStorage}
interface.

If you store all library information as files in folders under `./h5p/libraries`
you can use the sample implementation in {@link
@lumieducation/h5p-server!fsImplementations.FileLibraryStorage}:

```javascript
const libraryStorage = new FileLibraryStorage(`h5p/libraries`);
```

## contentStorage

The `contentStorage` provides information about installed content and creates
it. It must implement the {@link @lumieducation/h5p-server!IContentStorage}
interface. If you store all library information as files in folders under
`./h5p/content` you can use the sample implementation in {@link
@lumieducation/h5p-server!fsImplementations.FileContentStorage}:

```javascript
const contentStorage = new FileContentStorage(`h5p/content`);
```

## temporaryStorage

When the user uploads files in the H5P editor client, these files are not
directly stored alongside the content, either because the content hasn't been
saved before (and there is no contentId) or because this might create
left-over files if these files aren't used after all. Instead the server stores
these files in a temporary storage system and adds the '#tmp' tag to the files'
path. When the editor client requests a file the system retrieves the file from
temporary storage instead of the regular content storage.

The temporary storage must implement the interface {@link
@lumieducation/h5p-server!ITemporaryFileStorage}. Furthermore, you should
regularly call {@link
@lumieducation/h5p-server!TemporaryFileManager.cleanUp} to remove
unneeded temporary files (every 5 min).

If you don't have a multi-machine setup you can use the sample implementation in
{@link
@lumieducation/h5p-server!fsImplementations.DirectoryTemporaryFileStorage}:

```javascript
const temporaryStorage = new DirectoryTemporaryFileStorage(
    path.resolve('h5p/temporary-storage')
);
```

The sample implementation has a basic authentication mechanism built in that
makes sure that only users who have created a file can access it later.

## translationCallback (optional)

If you want to localize certain aspects of the editor, you must pass in a
function of type {@link @lumieducation/h5p-server!ITranslationFunction} that
returns translated strings for certain keys. This function in turn can call
another translation library to perform the localization. We suggest using
[i18next](https://www.npmjs.com/package/i18next) as the keys
@lumieducation/h5p-server uses follow the conventions of i18next. You can still
choose any translation library you like.

```typescript
// Pass translationCallbackAdapter as a parameter to H5PEditor.
const translationCallbackAdapter = (key, language) => {
    return i18NextTranslationFunction(key, { lng: language });
};
```

The editor will fallback to English if you don't pass any translation callback.

Also see the [documentation page on localization](../advanced/localization.md) for more
details.

## urlGenerator (optional)

if you need to overwrite the logic to create the urls per request you can pass a
custom url generator of type {@link @lumieducation/h5p-server!IUrlGenerator}. It
is possible to inherit from the default {@link
@lumieducation/h5p-server!UrlGenerator} and overwrite the {@link
@lumieducation/h5p-server!UrlGenerator.baseUrl | baseUrl} function if needed.The
url generator can also be used to add CSRF tokens to POST URLs.

## options (optional)

Allows you to customize styles and scripts of the client. Also allows passing in
a lock implementation (needed for multi-process or clustered setups).

## options.permissionSystem (optional)

By passing in an implementation of {@link
@lumieducation/h5p-server!IPermissionSystem} you get fine-grained control over
who can do what in your system. The library calls the methods of {@link
@lumieducation/h5p-server!IPermissionSystem} whenever a user performs an action
that requires authorization.

If you leave options.permissionSystem `undefined`, the library will allow
everything to everyone!

## contentUserDataStorage (optional)

The `contentUserDataStorage` handles saving and loading user states, so users
can continue where they left off when they reload the page or come back later.
It must implement the {@link @lumieducation/h5p-server!IContentUserDataStorage}
interface.
