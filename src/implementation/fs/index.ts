import * as H5P from '../../';
import { IContentStorage, IClientLanguageStorage } from '../../types';
import InMemoryStorage from '../InMemoryStorage';
import DirectoryTemporaryFileStorage from './DirectoryTemporaryFileStorage';
import FileContentStorage from './FileContentStorage';
import FileLibraryStorage from './FileLibraryStorage';

export default function h5pfs(
    config: H5P.IH5PConfig,
    librariesPath: string,
    temporaryStoragePath: string,
    contentPath: string,
    contentStorage?: IContentStorage,
    clientLanguageStorage?: IClientLanguageStorage
): H5P.H5PEditor {
    return new H5P.H5PEditor(
        new InMemoryStorage(),
        config,
        new FileLibraryStorage(librariesPath),
        contentStorage || new FileContentStorage(contentPath),
        new DirectoryTemporaryFileStorage(temporaryStoragePath),
        clientLanguageStorage
    );
}
