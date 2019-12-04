import path from 'path';

import {
    H5PEditor,
    IContentStorage,
    IEditorConfig,
    IKeyValueStorage,
    ILibraryFileUrlResolver,
    ILibraryStorage,
    ITemporaryFileStorage,
    ITranslationService,
    TranslationService
} from '../../src';

import DirectoryTemporaryFileStorage from '../../examples/implementation/DirectoryTemporaryFileStorage';
import EditorConfig from '../../examples/implementation/EditorConfig';
import FileContentStorage from '../../examples/implementation/FileContentStorage';
import FileLibraryStorage from '../../examples/implementation/FileLibraryStorage';
import InMemoryStorage from '../../examples/implementation/InMemoryStorage';

export function createH5PEditor(
    tempPath: string
): {
    config: IEditorConfig;
    contentStorage: IContentStorage;
    h5pEditor: H5PEditor;
    keyValueStorage: IKeyValueStorage;
    libraryFileUrlResolver: ILibraryFileUrlResolver;
    libraryStorage: ILibraryStorage;
    temporaryStorage: ITemporaryFileStorage;
    translationService: ITranslationService;
} {
    const keyValueStorage = new InMemoryStorage();
    const config = new EditorConfig(keyValueStorage);
    const libraryStorage = new FileLibraryStorage(
        path.join(tempPath, 'libraries')
    );
    const contentStorage = new FileContentStorage(
        path.join(tempPath, 'content')
    );
    const translationService = new TranslationService({});
    const libraryFileUrlResolver = () => '';
    const temporaryStorage = new DirectoryTemporaryFileStorage(
        path.join(tempPath, 'tmp')
    );

    const h5pEditor = new H5PEditor(
        keyValueStorage,
        config,
        libraryStorage,
        contentStorage,
        translationService,
        libraryFileUrlResolver,
        temporaryStorage
    );

    return {
        config,
        contentStorage,
        h5pEditor,
        keyValueStorage,
        libraryFileUrlResolver,
        libraryStorage,
        temporaryStorage,
        translationService
    };
}
