import { ContentId, IH5PConfig, ILibraryName,IUrlGenerator } from './types';

/**
 * This class generates URLs for files based on the URLs set in the configuration.
 */
export default class UrlGenerator implements IUrlGenerator {
    constructor(private config: IH5PConfig) {}

    public coreFile = (file: string) => {
        return `${this.getBaseUrl()}${this.config.coreUrl}/${file}`;
    };

    public downloadPackage = (contentId: ContentId) => {
        return `${this.getBaseUrl()}${this.config.downloadUrl}/${contentId}`;
    };

    public editorLibraryFile = (file: string): string => {
        return `${this.getBaseUrl()}${this.config.editorLibraryUrl}/${file}`;
    };

    public editorLibraryFiles = (): string => {
        return `${this.getBaseUrl()}${this.config.editorLibraryUrl}/`;
    };

    public libraryFile = (library: ILibraryName, file: string) => {
        return `${this.getBaseUrl()}${this.config.librariesUrl}/${library.machineName}-${library.majorVersion}.${library.minorVersion}/${file}`;
    };

    public parameters = () => {
        return `${this.getBaseUrl()}${this.config.paramsUrl}`;
    };

    public play = () => {
        return `${this.getBaseUrl()}${this.config.playUrl}`;
    };

    public temporaryFiles = (): string => {
        return this.getBaseUrl() + this.config.temporaryFilesUrl;
    };

    protected getBaseUrl = () : string => { return this.config.baseUrl;}
}
