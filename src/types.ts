import { Stream } from 'stream';
import Library from './Library';

export type ContentId = string;

export interface IAssets {
    scripts: string[];
    styles: string[];
    translations: object;
}

export interface IDependency {
    machineName: string;
    majorVersion: number;
    minorVersion: number;
    preloadedDependencies?: IDependency[];
}

export interface IMetadata extends IDependency {
    patchVersion: number;
}

export interface IH5PJson extends IDependency {
    title: string;
    language: string;
    mainLibrary: string;
    license: string;
}

export interface IIntegration {
    postUserStatistics: boolean;
    ajaxPath: string;
    ajax: {
        setFinished: string;
        contentUserData: string;
    };
    saveFreq: number;
    user: {
        name: string;
        mail: string;
    };
    editor?: IEditorIntegration;
    hubIsEnabled: boolean;
    l10n: object;
    url: string;
}

export interface IEditorIntegration { }

export interface ICSS {
    path: string;
}

export interface IJS {
    path: string;
}

export interface ILibraryData {
    css: string[];
    defaultLanguage: 'string';
    name: string;
    version: {
        major: number;
        minor: number;
    };
    javascript: string[];
    translations: object;
    preloadedJs: IJS[];
    preloadedCss: ICSS[];
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
    createContent(metadata: any, content: any, user: IUser, contentId?: ContentId): Promise<ContentId>;
    createContentId(): Promise<ContentId>;
    deleteContent(contentId: ContentId, user?: IUser): Promise<void>;
    getContentFileStream(
        contentId: ContentId,
        file: string,
        user: IUser
    ): Stream;
}

export interface ILibraryStorage {
    addLibraryFile(library: Library, fileLocalPath: string, readStream: Stream): Promise<boolean>;
    clearLibraryFiles(library: Library): Promise<any>;
    fileExists(library: Library, filename: string): Promise<boolean>;
    getFileStream(library: Library, file: string): Promise<Stream>;
    getId(library: Library): Promise<number>;
    getInstalled(...machineNames: string[]): Promise<Library[]>;
    getLanguageFiles(library: Library): Promise<string[]>;
    installLibrary(libraryData: ILibraryJson, restricted: boolean): Promise<Library>;
    removeLibrary(library: Library): Promise<any>;
    updateLibrary(library: Library, libraryMetadata: ILibraryJson): Promise<any>;
}

export interface IContentJson { }

export interface ISemantics { }

export interface ILibraryJson extends IDependency, Library {
    libraryId: number;
    patchVersion: number;
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
