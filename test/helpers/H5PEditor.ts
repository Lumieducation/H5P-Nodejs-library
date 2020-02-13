import path from 'path';

import {
    H5PEditor,
    IContentStorage,
    IEditorConfig,
    IKeyValueStorage,
    ILibraryStorage,
    ITemporaryFileStorage,
    ITranslationService,
    TranslationService
} from '../../src';
import EditorConfig from '../../src/implementation/EditorConfig';
import DirectoryTemporaryFileStorage from '../../src/implementation/fs/DirectoryTemporaryFileStorage';
import FileContentStorage from '../../src/implementation/fs/FileContentStorage';
import FileLibraryStorage from '../../src/implementation/fs/FileLibraryStorage';
import InMemoryStorage from '../../src/implementation/InMemoryStorage';

export function createH5PEditor(
    tempPath: string
): {
    config: IEditorConfig;
    contentStorage: IContentStorage;
    h5pEditor: H5PEditor;
    keyValueStorage: IKeyValueStorage;
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
    const temporaryStorage = new DirectoryTemporaryFileStorage(
        path.join(tempPath, 'tmp')
    );

    const h5pEditor = new H5PEditor(
        keyValueStorage,
        config,
        libraryStorage,
        contentStorage,
        translationService,
        temporaryStorage
    );

    return {
        config,
        contentStorage,
        h5pEditor,
        keyValueStorage,
        libraryStorage,
        temporaryStorage,
        translationService
    };
}
