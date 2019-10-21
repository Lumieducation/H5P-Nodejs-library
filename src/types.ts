import { ReadStream } from 'fs';
import { Stream } from 'stream';

export type ContentId = string;

/**
 * Permissions give rights to users to do certain actions with a piece of content.
 */
export enum Permission {
    Delete,
    Download,
    Edit,
    Embed,
    View
}

/**
 * Assets are files required by a library to work. These include JavaScript, CSS files and translations.
 */
export interface IAssets {
    scripts: string[];
    styles: string[];
    translations: object;
}

export interface ILibraryName {
    machineName: string;
    majorVersion: number;
    minorVersion: number;
}

/**
 * This is an author inside content metadata.
 */
export interface IContentAuthor {
    name?: string;
    role?: string;
}

/**
 * This is a change inside content metadata.
 */
export interface IContentChange {
    author?: string;
    date?: string;
    log?: string;
}

/**
 * This is the structure of the object received by the editor client when saving content.
 * It is also used when creating h5p.json files for .h5p packages.
 */
export interface IContentMetadata {
    author?: string;
    authors?: IContentAuthor[];
    autorComments?: string;
    changes?: IContentChange[];
    contentType?: string;
    dynamicDependencies?: ILibraryName[];
    editorDependencies?: ILibraryName[];
    embedTypes?: 'iframe' | 'div';
    h?: string;
    language: string;
    license?: string;
    licenseExtras?: string;
    licenseVersion?: string;
    mainLibrary: string;
    metaDescription?: string;
    metaKeywords?: string;
    preloadedDependencies: ILibraryName[];
    source?: string;
    title: string;
    w?: string;
    yearsFrom?: string;
    yearsTo?: string;
}

/**
 * The integration object is used to pass information to the H5P JavaScript
 * client running in the browser about certain settings and values of the
 * server.
 */
export interface IIntegration {
    ajax: {
        contentUserData: string;
        setFinished: string;
    };
    ajaxPath: string;
    contents?: any;
    editor?: IEditorIntegration;
    hubIsEnabled: boolean;
    l10n: object;
    postUserStatistics: boolean;
    /**
     * Set to false to disable saving user state.
     */
    saveFreq: number | boolean;
    url: string;
    user: {
        mail: string;
        name: string;
    };
}

/**
 * The editor integration object is used to pass information to the H5P JavaScript
 * editor client about settings and constants of the server.
 */
export interface IEditorIntegration {
    ajaxPath: string;
    assets: {
        css: string[];
        js: string[];
    };
    filesPath: string;
    libraryUrl: string;
}

/**
 * This descripes the Path of JavaScript and CSS files in a library.json file.
 * This single property interface exists because the library.json file expects
 * this format.
 */
export interface IPath {
    path: string;
}

/**
 * This is the structure of "data transfer objects" that are passed back to the
 * JavaScript client. It is used to return a lot of information about library
 * metadata, required files, translations etc.
 *
 * It does not exactly follow the structure library.json: it also includes other
 * properties, which aren't present in the library.json file (they are added
 * dynamically) and some properties are missing or named differently.
 */
export interface ILibraryDetailedDataForClient {
    css: string[];
    defaultLanguage: string;
    javascript: string[];
    language: any;
    languages: string[];
    name: string;
    preloadedCss?: IPath[];
    preloadedJs?: IPath[];
    semantics: any;
    translations: any;
    version: {
        major: number;
        minor: number;
    };
}

/**
 * This is the structure of "data transfer objects" that are passed back to the
 * Javascript client. It is used when giving a rough overview of installed libraries.
 */
export interface ILibraryOverviewForClient {
    majorVersion: number;
    metadataSettings: any;
    minorVersion: number;
    name: string;
    restricted: boolean;
    runnable: boolean;
    title: string;
    tutorialUrl: string;
    /**
     * The name of the library in the format "H5P.Library-1.0"
     */
    uberName: string;
}

/**
 * This specifies the structure of user objects. It must be implemented by
 * implementations.
 */
export interface IUser {
    /**
     * If true, the user can create content of content types that are set to "restricted".
     */
    canCreateRestricted: boolean;
    /**
     * If true, the user can install content types from the hub that are set the "recommended"
     * by the Hub.
     */
    canInstallRecommended: boolean;
    /**
     * If true, the user can generally install and update libraries. This includes Hub
     * content types that aren't set to "recommended" or uploading custom packages.
     */
    canUpdateAndInstallLibraries: boolean;
    /**
     * An internal id used to check if user objects are identical.
     */
    id: string;
    /**
     * The full name of the user.
     */
    name: string;
    /**
     * Specifies type of user. Possible values other than 'local' are unknown as of this time.
     */
    type: 'local' | string;
}

/**
 * This is the interface implementations need to implement to persist pieces of h5p content
 * somewhere.
 */
export interface IContentStorage {
    addContentFile(
        contentId: ContentId,
        localPath: string,
        readStream: Stream,
        user?: IUser
    ): Promise<void>;
    contentExists(contentId: ContentId): Promise<boolean>;
    createContent(
        metadata: IContentMetadata,
        content: any,
        user: IUser,
        contentId?: ContentId
    ): Promise<ContentId>;
    createContentId(): Promise<ContentId>;
    deleteContent(contentId: ContentId, user?: IUser): Promise<void>;
    getContentFiles(contentId: ContentId, user: IUser): Promise<string[]>;
    getContentFileStream(
        contentId: ContentId,
        file: string,
        user: IUser
    ): ReadStream;
    getUserPermissions(
        contentId: ContentId,
        user: IUser
    ): Promise<Permission[]>;
}

/**
 * This is the interface implementations need to implement to persist libraries.
 */
export interface ILibraryStorage {
    addLibraryFile(
        library: ILibraryName,
        fileLocalPath: string,
        readStream: Stream
    ): Promise<boolean>;
    clearLibraryFiles(library: ILibraryName): Promise<void>;
    fileExists(library: ILibraryName, filename: string): Promise<boolean>;
    getFileStream(library: ILibraryName, file: string): ReadStream;
    getId(library: ILibraryName): Promise<number>;
    getInstalled(...machineNames: string[]): Promise<ILibraryName[]>;
    getLanguageFiles(library: ILibraryName): Promise<string[]>;
    installLibrary(
        libraryData: ILibraryMetadata,
        restricted: boolean
    ): Promise<IInstalledLibrary>;
    listFiles(library: ILibraryName): Promise<string[]>;
    removeLibrary(library: ILibraryName): Promise<void>;
    updateLibrary(
        libraryMetadata: ILibraryMetadata
    ): Promise<IInstalledLibrary>;
}

/**
 * This is the actual "content itself", meaning the object contained in content.json. It is
 * created by the JavaScript editor client and played out by the JavaScript player. Its structure
 * can vary depending on the semantics associated with the main library of the content.
 */
export type ContentParameters = any;

/**
 * This is an entry in the semantics of a library. The semantics define who content parameters
 * must look like.
 *
 * Note: There are many more attributes to entries of semantics.json. See https://h5p.org/semantics
 * for a full reference.
 */
export interface ISemanticsEntry {
    /**
     * The text displayed in the editor for the entry. (localizable)
     */
    label: string;
    /**
     * The internal name (e.g. for referencing it in code)
     */
    name: string;
}

/**
 * Objects of this interface represent installed libraries that have an id.
 */
export interface IInstalledLibrary extends ILibraryMetadata {
    id: number;
    libraryId: number;
    /**
     * If set to true, the library can only be used be users who have this special
     * privilege.
     */
    restricted: boolean;

    compare(otherLibrary: ILibraryMetadata): number;
    compareVersions(otherLibrary: ILibraryMetadata): number;
}

/**
 * This interface represents the structure of library.json files.
 */
export interface ILibraryMetadata extends ILibraryName {
    author?: string;
    coreApi?: { majorVersion: number; minorVersion: number };
    description?: string;
    // tslint:disable-next-line: prefer-array-literal
    dropLibraryCss?: Array<{ machineName: string }>;
    dynamicDependencies?: ILibraryName[];
    editorDependencies?: ILibraryName[];
    // tslint:disable-next-line: prefer-array-literal
    embedTypes?: Array<'iframe' | 'div'>;
    fullscreen?: 0 | 1;
    h?: number;
    license?: string;
    metadataSettings?: {
        disable: 0 | 1;
        disableExtraTitleField: 0 | 1;
    };
    patchVersion: number;
    preloadedCss?: IPath[];
    preloadedDependencies?: ILibraryName[];
    preloadedJs?: IPath[];
    runnable: boolean;
    title: string;
    w?: number;
}

/**
 * Persists any complex object to some storage.
 */
export interface IKeyValueStorage {
    /**
     * Loads a value from the storage
     * @param key The key whose value should be returned.
     * @returns the value or undefined
     */
    load(key: string): Promise<any>;

    /**
     * Save a value to the storage.
     * @param key The key for which the value should be stored.
     * @param value The value to store.
     */
    save(key: string, value: any): Promise<any>;
}

export interface IRegistrationData {
    core_api_version: string;
    disabled: number;
    h5p_version: string;
    local_id: string;
    platform_name: string;
    platform_version: string;
    type: 'local' | 'network' | 'internet';
    uuid: string;
}

export interface IUsageStatistics {
    libraries: any;
    num_authors: number;
}

export interface ITranslationService {
    /**
     * Gets the literal for the identifier and performs replacements of placeholders / variables.
     * @param {string} id The identifier of the literal
     * @param {[key: string]: string} replacements An object with the replacement variables in key-value format.
     * Incidences of any key in this array are replaced with the corresponding value. Based
     * on the first character of the key, the value is escaped and/or themed:
     *    - !variable inserted as is
     *    - &#064;variable escape plain text to HTML
     *    - %variable escape text to HTML and theme as a placeholder for user-submitted content
     * @returns The literal translated into the language used by the user and with replacements.
     */
    getTranslation(
        id: string,
        replacements?: { [key: string]: string }
    ): string;
}

export type ILibraryLoader = (
    machineName: string,
    majorVersion: number,
    minorVersion: number
) => IInstalledLibrary;

export interface IEditorConfig {
    ajaxPath: string;
    baseUrl: string;
    contentTypeCacheRefreshInterval: number;
    contentWhitelist: string;
    coreApiVersion: {
        major: number;
        minor: number;
    };
    enableLrsContentTypes: boolean;
    fetchingDisabled: number;
    filesPath: string;
    h5pVersion: string;
    hubContentTypesEndpoint: string;
    hubRegistrationEndpoint: string;
    libraryUrl: string;
    libraryWhitelist: string;
    lrsContentTypes: string[];
    maxFileSize: number;
    maxTotalSize: number;
    platformName: string;
    platformVersion: string;
    sendUsageStatistics: boolean;
    siteType: 'local' | 'network' | 'internet';
    /**
     * Temporary files will be deleted after this time. (in milliseconds)
     */
    temporaryFileLifetime: number;
    /**
     * The URL path of temporary file storage (used for image, video etc. uploads of
     * unsaved content).
     */
    temporaryFilesPath: string;
    uuid: string;

    load(): Promise<any>;
    save(): Promise<void>;
}

/**
 * Describes as file that is stored temporarily (for uploads of unsaved content)
 */
export interface ITemporaryFile {
    /**
     * Indicates when the temporary file should be deleted.
     */
    expiresAt: Date;
    /**
     * The name by which the file can be identified
     */
    filename: string;
    /**
     * The user who is allowed to access the file
     */
    ownedBy: IUser;
}

export interface ITemporaryFileStorage {
    /**
     * Deletes the file from temporary storage (e.g. because it has expired)
     * @param file the information as received from listFiles(...)
     * @returns true if deletion was successful
     */
    deleteFile(file: ITemporaryFile): Promise<boolean>;

    /**
     * Returns the contents of a file.
     * Must check for access permissions and throw an H5PError if a file is not accessible.
     * @param filename the filename
     * @param user the user who accesses the file
     * @returns the stream containing the file's content
     */
    getFileStream(filename: string, user: IUser): ReadStream;

    /**
     * Returns a list of files in temporary storage for the specified user.
     * If the user is undefined or null, lists all files in temporary storage.
     * @param user (optional) Only list files for the user. If left out, will list all temporary files.
     * @returns a list of information about the files
     */
    listFiles(user?: IUser): Promise<ITemporaryFile[]>;

    /**
     * Stores a file. Only the user who stores the file is allowed to access it later.
     * @param filename the filename by which the file will be identified later
     * @param dataStream the stream containing the file's data
     * @param user the user who is allowed to access the file
     * @returns an object containing information about the stored file; undefined if failed
     */
    saveFile(
        filename: string,
        dataStream: ReadStream,
        user: IUser
    ): Promise<ITemporaryFile>;
}
