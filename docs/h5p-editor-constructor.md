# Constructing a H5PEditor object

The constructor arguments are used to provide data storage services and settings. You can find the interfaces referenced here in [`src/types.ts`](/src/types.ts):

### keyValueStore

The `keyValueStore` object is used by the `ContentTypeCache` to persist information about Content Types. It must be able to store arbitrary nested objects. It must implement the interface `IKeyValueStorage`.

### config

An object holding all configuration parameters as properties. It must implement the `IEditorConfig` interface. You can use the sample implementation in [`examples/implementation/EditorConfig.ts`](/examples/implementation/EditorConfig.ts).

### libraryStorage

The `libraryStorage` provides information about installed libraries and installs them. It must implement the `ILibraryStorage` interface.

If you store all library information as files in folders under `./h5p/libraries` you can use the sample implementation in [`examples/implementation/FileLibraryStorage.ts`](/examples/implementation/FileLibraryStorage.ts):

```js
const libraryStorage = new H5P.FileLibraryStorage(`h5p/libraries`);
```

### contentStorage

The `contentStorage` provides information about installed content and creates it. It must implement the `IContentStorage` interface. If you store all library information as files in folders under `./h5p/content` you can use the sample implementation in [`examples/implementation/FileContentStorage.ts`](/examples/implementation/FileContentStorage.ts):

```js
const contentStorage = new H5P.FileContentStorage(`h5p/content`);
```

### translationService

Used to translates literals into the local language. It must implement the `ITranslationService` interface.

### libraryFileUrlResolver

The H5P editor client sometimes expects hard-coded URLs of library files in data structures. As h5p-nodejs-library doesn't know where you serve the library files, there must be a way for the library to get the URLs of library files. `libraryFileUrlResolver` which is of type `ILibraryFileUrlResolver` does just that: the library passes a library name and a filename to the function and it must return the URL at which it can be publicly accessed.

A sample resolver could be:

```JS
const libraryFileUrlResolver = (library, file) =>
            `${h5pRoute}/libraries/${library.machineName}-${library.majorVersion}.${library.minorVersion}/${file}`;
```

### temporaryStorage

When the user uploads files in the H5P editor client, these files are not directly stored alongside the content, either because the content hasn't been saved before (and there is no contentId) or because this might create left-over files if these files aren't used after all. Instead the server stores these files in a temporary storage system and adds the '#tmp' tag to the files' path. When the editor client requests a file the system retrieves the file from temporary storage instead of the regular content storage.

The temporary storage must implement the interface `ITemporaryFileStorage`. Furthermore, you should regularly call `H5PEditor.temporaryFileManager.cleanUp()` to remove unneeded temporary files (every 5 min).

If you don't have a multi-machine setup you can use the sample implementation in [`examples/implementation/DirectoryTemporaryFileStorage.ts`](/examples/implementation/DirectoryTemporaryFileStorage.ts):

```js
const temporaryStorage = new DirectoryTemporaryFileStorage(
    path.resolve('h5p/temporary-storage')
);
```

The sample implementation has a basic authentication mechanism built in that makes sure that only users who have created a file can access it later.
