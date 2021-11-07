import path from 'path';

import {
    H5PEditor,
    IContentStorage,
    IH5PConfig,
    IKeyValueStorage,
    ILibraryStorage,
    ITemporaryFileStorage
} from '../../src';
import H5PConfig from '../../src/implementation/H5PConfig';
import DirectoryTemporaryFileStorage from '../../src/implementation/fs/DirectoryTemporaryFileStorage';
import FileContentStorage from '../../src/implementation/fs/FileContentStorage';
import FileLibraryStorage from '../../src/implementation/fs/FileLibraryStorage';
import InMemoryStorage from '../../src/implementation/InMemoryStorage';

export function createH5PEditor(
    tempPath: string,
    configOverrides?: Partial<IH5PConfig>
): {
    config: IH5PConfig;
    contentStorage: IContentStorage;
    h5pEditor: H5PEditor;
    keyValueStorage: IKeyValueStorage;
    libraryStorage: ILibraryStorage;
    temporaryStorage: ITemporaryFileStorage;
} {
    const keyValueStorage = new InMemoryStorage();
    const config = new H5PConfig(keyValueStorage);
    if (configOverrides) {
        for (const key of Object.keys(configOverrides)) {
            config[key] = configOverrides[key];
        }
    }
    const libraryStorage = new FileLibraryStorage(
        path.join(tempPath, 'libraries')
    );
    const contentStorage = new FileContentStorage(
        path.join(tempPath, 'content')
    );
    const temporaryStorage = new DirectoryTemporaryFileStorage(
        path.join(tempPath, 'tmp')
    );

    const h5pEditor = new H5PEditor(
        keyValueStorage,
        config,
        libraryStorage,
        contentStorage,
        temporaryStorage
    );

    return {
        config,
        contentStorage,
        h5pEditor,
        keyValueStorage,
        libraryStorage,
        temporaryStorage
    };
}
