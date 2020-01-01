import { ContentId, IEditorConfig, ILibraryName } from './types';

/**
 * This class generates URLs for files based on the URLs set in the configuration.
 */
export default class UrlGenerator {
    constructor(private config: IEditorConfig) {}

    public coreFile = (file: string) => {
        return `${this.config.baseUrl}${this.config.coreUrl}/${file}`;
    };

    public downloadPackage = (contentId: ContentId) => {
        return `${this.config.baseUrl}${this.config.downloadUrl}?contentId=${contentId}`;
    };

    public editorLibraryFile = (file: string): string => {
        return `${this.config.baseUrl}${this.config.editorLibraryUrl}/${file}`;
    };

    public libraryFile = (library: ILibraryName, file: string) => {
        return `${this.config.baseUrl}${this.config.librariesUrl}/${library.machineName}-${library.majorVersion}.${library.minorVersion}/${file}`;
    };
}
