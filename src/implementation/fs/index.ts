import * as H5P from '../../';

import { IContentStorage } from '../..';

import DirectoryTemporaryFileStorage from './DirectoryTemporaryFileStorage';
import FileContentStorage from './FileContentStorage';
import FileLibraryStorage from './FileLibraryStorage';
import InMemoryStorage from './InMemoryStorage';

export default function h5pfs(
    editorConfig: H5P.IEditorConfig,
    librariesPath: string,
    temporaryStoragePath: string,
    contentPath: string,
    contentStorage?: IContentStorage
): H5P.H5PEditor {
    return new H5P.H5PEditor(
        new InMemoryStorage(),
        editorConfig,
        new FileLibraryStorage(librariesPath),
        contentStorage || new FileContentStorage(contentPath),
        new H5P.TranslationService(H5P.englishStrings),
        new DirectoryTemporaryFileStorage(temporaryStoragePath)
    );
}
