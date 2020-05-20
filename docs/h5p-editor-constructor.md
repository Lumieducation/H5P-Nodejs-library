# Constructing a H5PEditor object

There are two ways of creating a H5PEditor object:

-   You can use the convenience function [`H5P.fs(...)`](/src/implementation/fs/index.ts) that use basic file system implementations for all data storage services. You can use the function if you're just getting started. Later on, you'll want to construct the editor with custom implementations of the data storage services. Check out the JSDoc of the function for details how to use it.
-   You can construct it manually by calling `new H5P.H5PEditor(...)`. The constructor arguments are used to provide data storage services and settings. You can find the interfaces referenced in [`src/types.ts`](/src/types.ts).

Explanation of the arguments of the constructor:

## cache

The `cache` object is used by the `ContentTypeCache` to persist information about content types. It might be also used for other functionality in the future. It must be able to store arbitrary nested objects and must implement the interface `IKeyValueStorage`. If used in a multi-machine or multi-process setup, the cache must be a single point of truth and work across all processes.

## config

An object holding all configuration parameters as properties. It must implement the `IH5PConfig` interface. You can use the sample implementation in [`src/implementation/H5PConfig.ts`](/src/implementation/H5PConfig.ts).

## libraryStorage

The `libraryStorage` provides information about installed libraries and installs them. It must implement the `ILibraryStorage` interface.

If you store all library information as files in folders under `./h5p/libraries` you can use the sample implementation in [`src/implementation/fs/FileLibraryStorage.ts`](/src/implementation/fs/FileLibraryStorage.ts):

```js
const libraryStorage = new FileLibraryStorage(`h5p/libraries`);
```

## contentStorage

The `contentStorage` provides information about installed content and creates it. It must implement the `IContentStorage` interface. If you store all library information as files in folders under `./h5p/content` you can use the sample implementation in [`src/implementation/fs/FileContentStorage.ts`](/src/implementation/fs/FileContentStorage.ts):

```js
const contentStorage = new FileContentStorage(`h5p/content`);
```

## temporaryStorage

When the user uploads files in the H5P editor client, these files are not directly stored alongside the content, either because the content hasn't been saved before (and there is no contentId) or because this might create left-over files if these files aren't used after all. Instead the server stores these files in a temporary storage system and adds the '#tmp' tag to the files' path. When the editor client requests a file the system retrieves the file from temporary storage instead of the regular content storage.

The temporary storage must implement the interface `ITemporaryFileStorage`. Furthermore, you should regularly call `H5PEditor.temporaryFileManager.cleanUp()` to remove unneeded temporary files (every 5 min).

If you don't have a multi-machine setup you can use the sample implementation in [`src/implementation/fs/DirectoryTemporaryFileStorage.ts`](/src/implementation/fs/DirectoryTemporaryFileStorage.ts):

```js
const temporaryStorage = new DirectoryTemporaryFileStorage(
    path.resolve('h5p/temporary-storage')
);
```

The sample implementation has a basic authentication mechanism built in that makes sure that only users who have created a file can access it later.

## translationCallback (optional)

If you want to localize certain aspects of the editor, you must pass in a
function that returns translated strings for certain keys. This function in
turn can call another translation library to perform the localization. We
suggest using [i18next](https://www.npmjs.com/package/i18next) as the keys
h5p-nodejs-library uses follow the conventions of i18next. You can still choose
any translation library you like.

```ts
// Pass translationCallbackAdapter as a parameter to H5PEditor.
const translationCallbackAdapter = (key, language) => {
    return i18NextTranslationFunction(key, { lng: language });
};
```

The editor will fallback to English if you don't pass any translation callback.

Also see the [documentation page on localization](/docs/localization.md) for
more details.

## urlGenerator (optional)

if you need to overwrite the logic to create the urls per request you can pass a custom url generator.
It is possible to inherit from UrlGenerator and overwrite the getBaseUrl function if needed.

See [H5PServer](https://github.com/BoBiene/H5PServer) for an implementation sample using the urlGenerator.
