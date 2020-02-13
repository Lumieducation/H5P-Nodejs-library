import * as H5P from '../../';
import { IContentStorage } from '../../types';
import InMemoryStorage from '../InMemoryStorage';
import DirectoryTemporaryFileStorage from './DirectoryTemporaryFileStorage';
import FileContentStorage from './FileContentStorage';
import FileLibraryStorage from './FileLibraryStorage';

export default function h5pfs(
    editorConfig: H5P.IEditorConfig,
    librariesPath: string,
    temporaryStoragePath: string,
    contentPath: string,
    contentStorage?: IContentStorage,
    translationService?: H5P.ITranslationService
): H5P.H5PEditor {
    return new H5P.H5PEditor(
        new InMemoryStorage(),
        editorConfig,
        new FileLibraryStorage(librariesPath),
        contentStorage || new FileContentStorage(contentPath),
        translationService || new H5P.TranslationService(H5P.englishStrings),
        new DirectoryTemporaryFileStorage(temporaryStoragePath)
    );
}
