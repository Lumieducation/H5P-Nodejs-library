import { ContentId, IH5PConfig, ILibraryName } from './types';

/**
 * This class generates URLs for files based on the URLs set in the configuration.
 */
export default class UrlGenerator {
    constructor(private config: IH5PConfig) {}

    public coreFile = (file: string) => {
        return `${this.config.baseUrl}${this.config.coreUrl}/${file}`;
    };

    public downloadPackage = (contentId: ContentId) => {
        return `${this.config.baseUrl}${this.config.downloadUrl}/${contentId}`;
    };

    public editorLibraryFile = (file: string): string => {
        return `${this.config.baseUrl}${this.config.editorLibraryUrl}/${file}`;
    };

    public editorLibraryFiles = (): string => {
        return `${this.config.baseUrl}${this.config.editorLibraryUrl}/`;
    };

    public libraryFile = (library: ILibraryName, file: string) => {
        return `${this.config.baseUrl}${this.config.librariesUrl}/${library.machineName}-${library.majorVersion}.${library.minorVersion}/${file}`;
    };

    public parameters = () => {
        return `${this.config.baseUrl}${this.config.paramsUrl}`;
    };

    public play = () => {
        return `${this.config.baseUrl}${this.config.playUrl}`;
    };

    public temporaryFiles = (): string => {
        return this.config.baseUrl + this.config.temporaryFilesUrl;
    };
}
