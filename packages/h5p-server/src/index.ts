// Classes
import H5PEditor from './H5PEditor';
import H5pError from './helpers/H5pError';
import H5PPlayer from './H5PPlayer';
import InstalledLibrary from './InstalledLibrary';
import LibraryName from './LibraryName';
import PackageExporter from './PackageExporter';
import H5PAjaxEndpoint from './H5PAjaxEndpoint';
import ContentTypeCache from './ContentTypeCache';

import AggregateH5pError from './helpers/AggregateH5pError';
import AjaxErrorResponse from './helpers/AjaxErrorResponse';
import AjaxSuccessResponse from './helpers/AjaxSuccessResponse';
import { streamToString } from './helpers/StreamHelpers';

import Logger from './helpers/Logger';

import H5PConfig from './implementation/H5PConfig';
import fs from './implementation/fs';
import * as utils from './implementation/utils';
import DirectoryTemporaryFileStorage from './implementation/fs/DirectoryTemporaryFileStorage';
import FileContentStorage from './implementation/fs/FileContentStorage';
import FileLibraryStorage from './implementation/fs/FileLibraryStorage';
import FileContentUserDataStorage from './implementation/fs/FileContentUserDataStorage';
import JsonStorage from './implementation/fs/JsonStorage';
import InMemoryStorage from './implementation/InMemoryStorage';
import CachedLibraryStorage from './implementation/cache/CachedLibraryStorage';
import CachedKeyValueStorage from './implementation/cache/CachedKeyValueStorage';
import { ContentFileScanner } from './ContentFileScanner';
import LibraryManager from './LibraryManager';
import ContentUserDataManager from './ContentUserDataManager';
import UrlGenerator from './UrlGenerator';
import SimpleLockProvider from './implementation/SimpleLockProvider';
import { LaissezFairePermissionSystem } from './implementation/LaissezFairePermissionSystem';

// Interfaces
import {
    ContentId,
    ContentParameters,
    ContentPermission,
    GeneralPermission,
    IAdditionalLibraryMetadata,
    IAjaxResponse,
    IContentMetadata,
    IContentStorage,
    IContentUserData,
    IContentUserDataStorage,
    IEditorModel,
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
    streamToString,
    ContentFileScanner,
    ContentTypeCache,
    ContentUserDataManager,
    H5PAjaxEndpoint,
    H5PEditor,
    H5pError,
    H5PPlayer,
    InstalledLibrary,
    LibraryAdministration,
    LibraryManager,
    LibraryName,
    Logger,
    PackageExporter,
    // interfaces
    ContentId,
    ContentParameters,
    ContentPermission,
    GeneralPermission,
    IAdditionalLibraryMetadata,
    IAjaxResponse,
    IContentMetadata,
    IContentStorage,
    IContentUserData,
    IContentUserDataStorage,
    IEditorModel,
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
    TemporaryFilePermission,
    UserDataPermission,
    // implementations
    H5PConfig,
    LaissezFairePermissionSystem,
    fs,
    utils,
    fsImplementations,
    cacheImplementations,
    UrlGenerator,
    SimpleLockProvider
};
