import { ContentFileScanner } from './ContentFileScanner';
import ContentStorer from './ContentStorer';
import ContentTypeCache from './ContentTypeCache';
import ContentUserDataManager from './ContentUserDataManager';
import H5PAjaxEndpoint from './H5PAjaxEndpoint';
import H5PEditor from './H5PEditor';
import H5PPlayer from './H5PPlayer';
import InstalledLibrary from './InstalledLibrary';
import LibraryAdministration from './LibraryAdministration';
import LibraryManager from './LibraryManager';
import LibraryName from './LibraryName';
import PackageExporter from './PackageExporter';
import TemporaryFileManager from './TemporaryFileManager';
import UrlGenerator from './UrlGenerator';
import AggregateH5pError from './helpers/AggregateH5pError';
import AjaxErrorResponse from './helpers/AjaxErrorResponse';
import AjaxSuccessResponse from './helpers/AjaxSuccessResponse';
import H5pError from './helpers/H5pError';
import Logger from './helpers/Logger';
import { streamToString } from './helpers/StreamHelpers';
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
    AggregateH5pError,
    AjaxErrorResponse,
    AjaxSuccessResponse,
    cacheImplementations,
    ContentFileScanner,
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
