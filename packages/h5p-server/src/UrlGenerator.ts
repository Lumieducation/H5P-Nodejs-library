import {
    ContentId,
    IFullLibraryName,
    IH5PConfig,
    IUrlGenerator,
    IUser
} from './types';

/**
 * This class generates URLs for files based on the URLs set in the
 * configuration.
 *
 * It includes a basic cache buster that adds a parameter with the full version
 * to core and library files (e.g. ?version=1.2.3). You can also implement other
 * means of busting caches by implementing IUrlGenerator yourself. It would for
 * example be possible to adding a generic cache buster string instead of adding
 * the version. If you decide to do this, you must be aware of the fact that the
 * JavaScript client generates URLs dynamically in two cases (at the time of
 * writing), both in h5peditor.js:contentUpgrade. This function uses
 * H5PIntegration.pluginCacheBuster, which can be customized by overriding
 * H5PEditor.cacheBusterGenerator.
 *
 * UrlGenerator requires these values to be set in config:
 * - baseUrl
 * - coreUrl
 * - downloadUrl
 * - editorLibraryUrl
 * - h5pVersion
 * - librariesUrl
 * - paramsUrl
 * - playUrl
 * - temporaryFilesUrl
 */
export default class UrlGenerator implements IUrlGenerator {
    constructor(private config: IH5PConfig) {}

    public ajaxEndpoint = (user: IUser): string => {
        return `${this.config.baseUrl}${this.config.ajaxUrl}?action=`;
    };

    public baseUrl = (): string => {
        return this.config.baseUrl;
    };
    
    public contentUserData = (user: IUser): string => {
        return `${this.config.baseUrl}/contentUserData`;
    };

    /**
     * Also adds a cache buster based on IH5PConfig.h5pVersion.
     * @param file
     */
    public coreFile = (file: string) => {
        return `${this.baseUrl()}${this.config.coreUrl}/${file}?version=${
            this.config.h5pVersion
        }`;
    };

    public coreFiles = () => {
        return `${this.baseUrl()}${this.config.coreUrl}/js`;
    };

    public downloadPackage = (contentId: ContentId) => {
        return `${this.baseUrl()}${this.config.downloadUrl}/${contentId}`;
    };

    /**
     * Also adds a cache buster based on IH5PConfig.h5pVersion.
     * @param file
     */
    public editorLibraryFile = (file: string): string => {
        return `${this.baseUrl()}${
            this.config.editorLibraryUrl
        }/${file}?version=${this.config.h5pVersion}`;
    };

    public editorLibraryFiles = (): string => {
        return `${this.baseUrl()}${this.config.editorLibraryUrl}/`;
    };

    public libraryFile = (library: IFullLibraryName, file: string) => {
        if (file.startsWith('http://') || file.startsWith('https://')) {
            return file;
        }
        return `${this.baseUrl()}${this.config.librariesUrl}/${
            library.machineName
        }-${library.majorVersion}.${library.minorVersion}/${file}?version=${
            library.majorVersion
        }.${library.minorVersion}.${library.patchVersion}`;
    };

    public parameters = () => {
        return `${this.baseUrl()}${this.config.paramsUrl}`;
    };

    public play = () => {
        return `${this.baseUrl()}${this.config.playUrl}`;
    };
    public setFinished = (user: IUser): string => {
        return `${this.config.baseUrl}/setFinished`;
    };

    public temporaryFiles = (): string => {
        return this.baseUrl() + this.config.temporaryFilesUrl;
    };
}
