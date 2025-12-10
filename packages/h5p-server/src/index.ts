// Classes
import ContentTypeCache from './ContentTypeCache';
import H5PAjaxEndpoint from './H5PAjaxEndpoint';
import H5PEditor from './H5PEditor';
import H5PPlayer from './H5PPlayer';
import InstalledLibrary from './InstalledLibrary';
import LibraryName from './LibraryName';
import PackageExporter from './PackageExporter';
import H5pError from './helpers/H5pError';

import AggregateH5pError from './helpers/AggregateH5pError';
import AjaxErrorResponse from './helpers/AjaxErrorResponse';
import AjaxSuccessResponse from './helpers/AjaxSuccessResponse';
import { streamToString } from './helpers/StreamHelpers';

import Logger from './helpers/Logger';

import { ContentFileScanner } from './ContentFileScanner';
import ContentStorer from './ContentStorer';
import ContentUserDataManager from './ContentUserDataManager';
import LibraryManager from './LibraryManager';
import TemporaryFileManager from './TemporaryFileManager';
import UrlGenerator from './UrlGenerator';
import H5PConfig from './implementation/H5PConfig';
import InMemoryStorage from './implementation/InMemoryStorage';
import { LaissezFairePermissionSystem } from './implementation/LaissezFairePermissionSystem';
import SimpleLockProvider from './implementation/SimpleLockProvider';
import CachedKeyValueStorage from './implementation/cache/CachedKeyValueStorage';
import CachedLibraryStorage from './implementation/cache/CachedLibraryStorage';
import fs from './implementation/fs';
import DirectoryTemporaryFileStorage from './implementation/fs/DirectoryTemporaryFileStorage';
import FileContentStorage from './implementation/fs/FileContentStorage';
import FileContentUserDataStorage from './implementation/fs/FileContentUserDataStorage';
import FileLibraryStorage from './implementation/fs/FileLibraryStorage';
import JsonStorage from './implementation/fs/JsonStorage';
import * as utils from './implementation/utils';

// Interfaces
import {
    ContentId,
    ContentParameters,
    ContentPermission,
    File,
    FileSanitizerResult,
    GeneralPermission,
    IAdditionalLibraryMetadata,
    IAjaxResponse,
    IContentMetadata,
    IContentStorage,
    IContentUserData,
    IContentUserDataStorage,
    IEditorModel,
    IFileMalwareScanner,
    IFileSanitizer,
    IFileStats,
    IFinishedUserData,
    IGetContentUserData,
    IH5PConfig,
    IInstalledLibrary,
    IIntegration,
    IKeyValueStorage,
    ILibraryAdministrationOverviewItem,
    ILibraryFileUrlResolver,
    ILibraryInstallResult,
    ILibraryMetadata,
    ILibraryName,
    ILibraryStorage,
    ILicenseData,
    ILockProvider,
    IPermissionSystem,
    IPlayerModel,
    IPostContentUserData,
    IPostUserFinishedData,
    ITemporaryFile,
    ITemporaryFileStorage,
    ITranslationFunction,
    IUrlGenerator,
    IUser,
    MalwareScanResult,
    TemporaryFilePermission,
    UserDataPermission
} from './types';

// Adapters
import LibraryAdministration from './LibraryAdministration';

const fsImplementations = {
    DirectoryTemporaryFileStorage,
    FileContentStorage,
    FileLibraryStorage,
    InMemoryStorage,
    JsonStorage,
    FileContentUserDataStorage
};

const cacheImplementations = {
    CachedKeyValueStorage,
    CachedLibraryStorage
};

export {
    // classes
    AggregateH5pError,
    AjaxErrorResponse,
    AjaxSuccessResponse,
    cacheImplementations,
    ContentFileScanner,
    // interfaces
    ContentId,
    ContentParameters,
    ContentPermission,
    ContentStorer,
    ContentTypeCache,
    ContentUserDataManager,
    File,
    FileSanitizerResult,
    fs,
    fsImplementations,
    GeneralPermission,
    H5PAjaxEndpoint,
    // implementations
    H5PConfig,
    H5PEditor,
    H5pError,
    H5PPlayer,
    IAdditionalLibraryMetadata,
    IAjaxResponse,
    IContentMetadata,
    IContentStorage,
    IContentUserData,
    IContentUserDataStorage,
    IEditorModel,
    IFileMalwareScanner,
    IFileSanitizer,
    IFileStats,
    IFinishedUserData,
    IGetContentUserData,
    IH5PConfig,
    IInstalledLibrary,
    IIntegration,
    IKeyValueStorage,
    ILibraryAdministrationOverviewItem,
    ILibraryFileUrlResolver,
    ILibraryInstallResult,
    ILibraryMetadata,
    ILibraryName,
    ILibraryStorage,
    ILicenseData,
    ILockProvider,
    InstalledLibrary,
    IPermissionSystem,
    IPlayerModel,
    IPostContentUserData,
    IPostUserFinishedData,
    ITemporaryFile,
    ITemporaryFileStorage,
    ITranslationFunction,
    IUrlGenerator,
    IUser,
    LaissezFairePermissionSystem,
    LibraryAdministration,
    LibraryManager,
    LibraryName,
    Logger,
    MalwareScanResult,
    PackageExporter,
    SimpleLockProvider,
    streamToString,
    TemporaryFileManager,
    TemporaryFilePermission,
    UrlGenerator,
    UserDataPermission,
    utils
};
