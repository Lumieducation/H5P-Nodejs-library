// Classes
import H5PEditor from './H5PEditor';
import H5PPlayer from './H5PPlayer';
import H5pError from './helpers/H5pError';
import InstalledLibrary from './InstalledLibrary';
import LibraryName from './LibraryName';
import PackageExporter from './PackageExporter';

import EditorConfig from './implementation/EditorConfig';
import fs from './implementation/fs';
import DirectoryTemporaryFileStorage from './implementation/fs/DirectoryTemporaryFileStorage';
import FileContentStorage from './implementation/fs/FileContentStorage';
import FileLibraryStorage from './implementation/fs/FileLibraryStorage';
import JsonStorage from './implementation/fs/JsonStorage';
import InMemoryStorage from './implementation/InMemoryStorage';

// Interfaces
import {
    ContentId,
    ContentParameters,
    IContentMetadata,
    IContentStorage,
    IEditorConfig,
    IInstalledLibrary,
    IKeyValueStorage,
    ILibraryFileUrlResolver,
    ILibraryMetadata,
    ILibraryName,
    ILibraryStorage,
    IPlayerModel,
    ITemporaryFile,
    ITemporaryFileStorage,
    IUser,
    Permission
} from './types';

// Adapters
import express from './adapters/express';
import expressErrorHandler from './adapters/expressErrorHandler';

const adapters = {
    express,
    expressErrorHandler
};

const fsImplementations = {
    DirectoryTemporaryFileStorage,
    FileContentStorage,
    FileLibraryStorage,
    InMemoryStorage,
    JsonStorage
};

export {
    // classes
    H5PEditor,
    H5pError,
    H5PPlayer,
    InstalledLibrary,
    LibraryName,
    PackageExporter,
    // interfaces
    ContentId,
    ContentParameters,
    IContentMetadata,
    IContentStorage,
    IEditorConfig,
    IInstalledLibrary,
    IKeyValueStorage,
    ILibraryFileUrlResolver,
    ILibraryMetadata,
    ILibraryName,
    ILibraryStorage,
    IPlayerModel,
    ITemporaryFile,
    ITemporaryFileStorage,
    IUser,
    Permission,
    // implementations
    EditorConfig,
    fs,
    fsImplementations,
    // adapters
    adapters
};
