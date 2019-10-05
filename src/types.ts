import { ReadStream } from 'fs';
import { Stream } from 'stream';
import Library from './Library';

export type ContentId = string;

export enum Permission {
    Delete,
    Download,
    Edit,
    Embed,
    View
}

export interface IAssets {
    scripts: string[];
    styles: string[];
    translations: object;
}

export interface IDependency {
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
    dynamicDependencies?: IDependency[];
    editorDependencies?: IDependency[];
    embedTypes?: 'iframe' | 'div';
    h?: string;
    language: string;
    license?: string;
    licenseExtras?: string;
    licenseVersion?: string;
    mainLibrary: string;
    metaDescription?: string;
    metaKeywords?: string;
    preloadedDependencies: IDependency[];
    source?: string;
    title: string;
    w?: string;
    yearsFrom?: string;
    yearsTo?: string;
}

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

export interface IEditorIntegration {
    ajaxPath: string;
    assets: {
        css: string[];
        js: string[];
    };
    filesPath: string;
    libraryUrl: string;
}

export interface ICSS {
    path: string;
}

export interface IJS {
    path: string;
}

export interface ILibraryData {
    css: string[];
    defaultLanguage: 'string';
    javascript: string[];
    language: any;
    languages: string[];
    name: string;
    preloadedCss?: ICSS[];
    preloadedJs?: IJS[];
    semantics: any;
    translations: object;
    version: {
        major: number;
        minor: number;
    };
}

export interface ILibraryInfo {
    majorVersion: number;
    metadataSettings: any;
    minorVersion: number;
    name: string;
    restricted: boolean;
    runnable: boolean;
    title: string;
    tutorialUrl: string;
    uberName: string;
}

export interface IUser {
    canCreateRestricted: boolean;
    canInstallRecommended: boolean;
    canUpdateAndInstallLibraries: boolean;
    id: string;
    name: string;
    type: string;
}

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

export interface ILibraryStorage {
    addLibraryFile(
        library: Library,
        fileLocalPath: string,
        readStream: Stream
    ): Promise<boolean>;
    clearLibraryFiles(library: Library): Promise<any>;
    fileExists(library: Library, filename: string): Promise<boolean>;
    getFileStream(library: Library, file: string): ReadStream;
    getId(library: Library): Promise<number>;
    getInstalled(...machineNames: string[]): Promise<Library[]>;
    getLanguageFiles(library: Library): Promise<string[]>;
    installLibrary(
        libraryData: ILibraryJson,
        restricted: boolean
    ): Promise<Library>;
    listFiles(library: Library): Promise<string[]>;
    removeLibrary(library: Library): Promise<any>;
    updateLibrary(
        library: Library,
        libraryMetadata: ILibraryJson
    ): Promise<any>;
}

export type Content = any;

export interface ISemantic {
    label: string;
    name: string;
}

export interface ILibraryJson extends Library {
    dynamicDependencies: IDependency[];
    editorDependencies: IDependency[];
    libraryId: number;
    patchVersion: number;
    preloadedCss: ICSS[];
    preloadedJs: IJS[];
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

export interface IURLConfig {
    ajaxPath?: string;
    baseUrl?: string;
    filesPath?: string;
    libraryUrl?: string;
}
export type ILibraryLoader = (
    machineName: string,
    majorVersion: number,
    minorVersion: number
) => ILibraryJson;
