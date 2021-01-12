import {
    ContentId,
    IFullLibraryName,
    IH5PConfig,
    IUrlGenerator
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

    /**
     * Also adds a cache buster based on IH5PConfig.h5pVersion.
     * @param file
     */
    public coreFile = (file: string) => {
        return `${this.getBaseUrl()}${this.config.coreUrl}/${file}?version=${
            this.config.h5pVersion
        }`;
    };

    public coreFiles = () => {
        return `${this.getBaseUrl()}${this.config.coreUrl}/js`;
    };

    public downloadPackage = (contentId: ContentId) => {
        return `${this.getBaseUrl()}${this.config.downloadUrl}/${contentId}`;
    };

    /**
     * Also adds a cache buster based on IH5PConfig.h5pVersion.
     * @param file
     */
    public editorLibraryFile = (file: string): string => {
        return `${this.getBaseUrl()}${
            this.config.editorLibraryUrl
        }/${file}?version=${this.config.h5pVersion}`;
    };

    public editorLibraryFiles = (): string => {
        return `${this.getBaseUrl()}${this.config.editorLibraryUrl}/`;
    };

    public libraryFile = (library: IFullLibraryName, file: string) => {
        if (file.startsWith('http://') || file.startsWith('https://')) {
            return file;
        }
        return `${this.getBaseUrl()}${this.config.librariesUrl}/${
            library.machineName
        }-${library.majorVersion}.${library.minorVersion}/${file}?version=${
            library.majorVersion
        }.${library.minorVersion}.${library.patchVersion}`;
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

    protected getBaseUrl = (): string => {
        return this.config.baseUrl;
    };
}
