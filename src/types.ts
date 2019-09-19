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

export interface IContentStorage {
    createContent(metadata, content, user, contentId): Promise<ContentId>;
    addContentFile(
        contentId: ContentId,
        localPath: string,
        readStream: Stream,
        user?: User
    ): Promise<void>;
    deleteContent(contentId: ContentId): void;
    createContentId(): Promise<ContentId>;
    getContentFileStream(
        contentId: ContentId,
        file: string,
        user: User
    ): Stream;
}

export interface IContentJson {}
