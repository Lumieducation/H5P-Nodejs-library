# Constructing a H5PEditor object

The constructor arguments are used to provide data storage services and settings. You can find the interfaces referenced here in [`src/types.ts`](src/types.ts):

### keyValueStore

The `keyValueStore` object is used by the `ContentTypeCache` to persist information about Content Types. It must be able to store arbitrary nested objects. It must implement the interface `IKeyValueStorage`.

### config

An object holding all configuration parameters as properties. It must implement the `IEditorConfig` interface. You can use the sample implementation in [`examples/implementation/EditorConfig.ts`](examples/implementation/EditorConfig.ts).

### libraryStorage

The `libraryStorage` provides information about installed libraries and installs them. It must implement the `ILibraryStorage` interface.

If you store all library information as files in folders under `./h5p/libraries` you can use the sample implementation in [`examples/implementation/FileLibraryStorage.ts`](examples/implementation/FileLibraryStorage.ts):

```js
const libraryStorage = new H5P.FileLibraryStorage(`h5p/libraries`);
```

### contentStorage

The `contentStorage` provides information about installed content and creates it. It must implement the `IContentStorage` interface. If you store all library information as files in folders under `./h5p/content` you can use the sample implementation in [`examples/implementation/FileContentStorage.ts`](examples/implementation/FileContentStorage.ts):

```js
const contentStorage = new H5P.FileContentStorage(`h5p/content`);
```

### user

An object containing access control information. It must implement the `IUser` interface. You can use the sample implementation in [`examples/implementation/User.ts`](examples/implementation/User.ts).

### translationService

Used to translates literals into the local language. It must implement the `ITranslationService` interface.