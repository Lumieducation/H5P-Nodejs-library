// Classes
import H5PEditor from './H5PEditor';
import H5PPlayer from './H5PPlayer';
import H5pError from './helpers/H5pError';
import InstalledLibrary from './InstalledLibrary';
import LibraryName from './LibraryName';
import PackageExporter from './PackageExporter';
import TranslationService from './TranslationService';

import fs from './implementation/fs';

// Interfaces
import {
    ContentId,
    IContentMetadata,
    IContentStorage,
    IEditorConfig,
    IInstalledLibrary,
    IKeyValueStorage,
    ILibraryFileUrlResolver,
    ILibraryMetadata,
    ILibraryName,
    ILibraryStorage,
    ITemporaryFile,
    ITemporaryFileStorage,
    ITranslationService,
    IUser,
    Permission
} from './types';

// Assets

import englishStrings from './translations/en.json';

export {
    // classes
    H5PEditor,
    H5pError,
    H5PPlayer,
    InstalledLibrary,
    LibraryName,
    PackageExporter,
    TranslationService,
    // interfaces
    ContentId,
    IContentMetadata,
    IContentStorage,
    IEditorConfig,
    IInstalledLibrary,
    IKeyValueStorage,
    ILibraryFileUrlResolver,
    ILibraryMetadata,
    ILibraryName,
    ILibraryStorage,
    ITemporaryFile,
    ITemporaryFileStorage,
    ITranslationService,
    IUser,
    Permission,
    // assets
    englishStrings,
    // implementations
    fs
};
