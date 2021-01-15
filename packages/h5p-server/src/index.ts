// Classes
import H5PEditor from './H5PEditor';
import H5pError from './helpers/H5pError';
import H5PPlayer from './H5PPlayer';
import HtmlExporter from './HtmlExporter';
import InstalledLibrary from './InstalledLibrary';
import LibraryName from './LibraryName';
import PackageExporter from './PackageExporter';
import H5PAjaxEndpoint from './H5PAjaxEndpoint';
import ContentTypeCache from './ContentTypeCache';

import AggregateH5pError from './helpers/AggregateH5pError';
import AjaxErrorResponse from './helpers/AjaxErrorResponse';

import H5PConfig from './implementation/H5PConfig';
import fs from './implementation/fs';
import DirectoryTemporaryFileStorage from './implementation/fs/DirectoryTemporaryFileStorage';
import FileContentStorage from './implementation/fs/FileContentStorage';
import FileLibraryStorage from './implementation/fs/FileLibraryStorage';
import JsonStorage from './implementation/fs/JsonStorage';
import InMemoryStorage from './implementation/InMemoryStorage';
import CachedLibraryStorage from './implementation/cache/CachedLibraryStorage';
import CachedKeyValueStorage from './implementation/cache/CachedKeyValueStorage';

// Interfaces
import {
    ContentId,
    ContentParameters,
    IContentMetadata,
    IContentStorage,
    IEditorModel,
    IFileStats,
    IH5PConfig,
    IInstalledLibrary,
    IIntegration,
    IKeyValueStorage,
    ILibraryAdministrationOverviewItem,
    ILibraryFileUrlResolver,
    ILibraryMetadata,
    ILibraryName,
    ILibraryStorage,
    IPlayerModel,
    ITemporaryFile,
    ITemporaryFileStorage,
    ITranslationFunction,
    IUser,
    Permission
} from './types';

// Adapters
import LibraryAdministration from './LibraryAdministration';

const fsImplementations = {
    DirectoryTemporaryFileStorage,
    FileContentStorage,
    FileLibraryStorage,
    InMemoryStorage,
    JsonStorage
};

const cacheImplementations = {
    CachedKeyValueStorage,
    CachedLibraryStorage
};

export {
    // classes
    AggregateH5pError,
    AjaxErrorResponse,
    ContentTypeCache,
    H5PAjaxEndpoint,
    H5PEditor,
    H5pError,
    H5PPlayer,
    HtmlExporter,
    InstalledLibrary,
    LibraryAdministration,
    LibraryName,
    PackageExporter,
    // interfaces
    ContentId,
    ContentParameters,
    IContentMetadata,
    IContentStorage,
    IEditorModel,
    IFileStats,
    IH5PConfig,
    IInstalledLibrary,
    IIntegration,
    IKeyValueStorage,
    ILibraryAdministrationOverviewItem,
    ILibraryFileUrlResolver,
    ILibraryMetadata,
    ILibraryName,
    ILibraryStorage,
    IPlayerModel,
    ITemporaryFile,
    ITemporaryFileStorage,
    ITranslationFunction,
    IUser,
    Permission,
    // implementations
    H5PConfig,
    fs,
    fsImplementations,
    cacheImplementations
};
