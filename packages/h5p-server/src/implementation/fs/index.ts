import H5PEditor from '../../H5PEditor';
import {
    IContentStorage,
    IContentUserDataStorage,
    ITranslationFunction,
    IH5PEditorOptions,
    IUrlGenerator,
    IH5PConfig
} from '../../types';
import InMemoryStorage from '../InMemoryStorage';
import DirectoryTemporaryFileStorage from './DirectoryTemporaryFileStorage';
import FileContentStorage from './FileContentStorage';
import FileLibraryStorage from './FileLibraryStorage';

export default function h5pfs(
    config: IH5PConfig,
    librariesPath: string,
    temporaryStoragePath: string,
    contentPath: string,
    contentUserDataStorage?: IContentUserDataStorage,
    contentStorage?: IContentStorage,
    translationCallback?: ITranslationFunction,
    urlGenerator?: IUrlGenerator,
    options?: IH5PEditorOptions
): H5PEditor {
    return new H5PEditor(
        new InMemoryStorage(),
        config,
        new FileLibraryStorage(librariesPath),
        contentStorage || new FileContentStorage(contentPath),
        new DirectoryTemporaryFileStorage(temporaryStoragePath),
        translationCallback,
        urlGenerator,
        options,
        contentUserDataStorage
    );
}
