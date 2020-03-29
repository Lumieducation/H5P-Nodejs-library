import * as H5P from '../../';
import { IContentStorage } from '../../types';
import InMemoryStorage from '../InMemoryStorage';
import DirectoryTemporaryFileStorage from './DirectoryTemporaryFileStorage';
import FileContentStorage from './FileContentStorage';
import FileLibraryStorage from './FileLibraryStorage';

export default function h5pfs(
    config: H5P.IH5PConfig,
    librariesPath: string,
    temporaryStoragePath: string,
    contentPath: string,
    contentStorage?: IContentStorage
): H5P.H5PEditor {
    return new H5P.H5PEditor(
        new InMemoryStorage(),
        config,
        new FileLibraryStorage(librariesPath),
        contentStorage || new FileContentStorage(contentPath),
        new DirectoryTemporaryFileStorage(temporaryStoragePath)
    );
}
