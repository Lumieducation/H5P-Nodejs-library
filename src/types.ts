import { Stream } from 'stream';

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

export interface IEditorIntegration {}

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
}

export interface IUser {
    id: string;
    name: string;
    canInstallRecommended: boolean;
    canUpdateAndInstallLibraries: boolean;
    canCreateRestricted: boolean;
    type: string;
}

export interface IContentStorage {
    createContent(metadata, content, user, contentId): Promise<ContentId>;
    addContentFile(
        contentId: ContentId,
        localPath: string,
        readStream: Stream,
        user?: IUser
    ): Promise<void>;
    deleteContent(contentId: ContentId): void;
    createContentId(): Promise<ContentId>;
    getContentFileStream(
        contentId: ContentId,
        file: string,
        user: IUser
    ): Stream;
}

export interface IContentJson {}

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
    num_authors: number;
    libraries: any;
}

