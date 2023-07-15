import { encode } from 'node:querystring';

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
 * - contentFilesUrlPlayerOverride (includes placeholder! See documentation of
 *   config for details!)
 * - contentUserDataUrl
 * - coreUrl
 * - downloadUrl
 * - editorLibraryUrl
 * - h5pVersion
 * - librariesUrl
 * - paramsUrl
 * - playUrl
 * - setFinishedUrl
 * - temporaryFilesUrl
 *
 * The UrlGenerator can also be used to inject CSRF tokens into URLs for POST
 * requests that are sent by the H5P editor core (Joubel's code) over which you
 * don't have any control. You can then check the CSRF tokens in your middleware
 * to authenticate requests.
 */
export default class UrlGenerator implements IUrlGenerator {
    /**
     * @param config the config
     * @param csrfProtection (optional) If used, you must pass in a function
     * that returns a CSRF query parameter for the user for who a URL is
     * generated; the query parameter will be appended to URLs like this:
     * "baseUrl/ajax/?name=value&action=..." You must specify which routes you
     * want to be protected. If you don't pass in a csrfProtection object, no
     * CSRF tokens will be added to URLs.
     */
    constructor(
        private config: IH5PConfig,
        private csrfProtection?: {
            protectAjax: boolean;
            protectContentUserData: boolean;
            protectSetFinished: boolean;
            queryParamGenerator: (user: IUser) => {
                name: string;
                value: string;
            };
        }
    ) {}

    public ajaxEndpoint = (user: IUser): string => {
        if (
            this.csrfProtection?.queryParamGenerator &&
            this.csrfProtection?.protectAjax
        ) {
            const qs = this.csrfProtection.queryParamGenerator(user);
            if (qs && qs.name && qs.value) {
                return `${this.config.baseUrl}${this.config.ajaxUrl}?${qs.name}=${qs.value}&action=`;
            }
        }
        return `${this.config.baseUrl}${this.config.ajaxUrl}?action=`;
    };

    public baseUrl = (): string => this.config.baseUrl;

    public contentFilesUrl(contentId: ContentId): string | undefined {
        return this.config.contentFilesUrlPlayerOverride?.replace(
            '{{contentId}}',
            contentId
        );
    }

    public contentUserData = (
        user: IUser,
        contextId?: string,
        asUserId?: string,
        options?: { readonly?: boolean }
    ): string => {
        const queries: any = {};
        if (contextId) {
            queries.contextId = contextId;
        }
        if (asUserId) {
            queries.asUserId = asUserId;
        }
        if (options?.readonly) {
            queries.ignorePost = 'yes';
        }

        if (
            this.csrfProtection?.queryParamGenerator &&
            this.csrfProtection?.protectContentUserData
        ) {
            const qs = this.csrfProtection.queryParamGenerator(user);
            if (qs.name) {
                queries[qs.name] = qs.value;
            }
            const queryString = encode(queries);
            return `${this.config.baseUrl}${
                this.config.contentUserDataUrl
            }/:contentId/:dataType/:subContentId${
                queryString ? `?${queryString}` : ''
            }`;
        }

        const queryString = encode(queries);
        return `${this.config.baseUrl}${
            this.config.contentUserDataUrl
        }/:contentId/:dataType/:subContentId${
            queryString ? `?${queryString}` : ''
        }`;
    };

    /**
     * Also adds a cache buster based on IH5PConfig.h5pVersion.
     * @param file
     */
    public coreFile = (file: string): string =>
        `${this.baseUrl()}${this.config.coreUrl}/${file}?version=${
            this.config.h5pVersion
        }`;

    public coreFiles = (): string =>
        `${this.baseUrl()}${this.config.coreUrl}/js`;

    public downloadPackage = (contentId: ContentId): string =>
        `${this.baseUrl()}${this.config.downloadUrl}/${contentId}`;

    /**
     * Also adds a cache buster based on IH5PConfig.h5pVersion.
     * @param file
     */
    public editorLibraryFile = (file: string): string =>
        `${this.baseUrl()}${this.config.editorLibraryUrl}/${file}?version=${
            this.config.h5pVersion
        }`;

    public editorLibraryFiles = (): string =>
        `${this.baseUrl()}${this.config.editorLibraryUrl}/`;

    public libraryFile = (library: IFullLibraryName, file: string): string => {
        if (
            file.startsWith('http://') ||
            file.startsWith('https://') ||
            file.startsWith('/')
        ) {
            return file;
        }
        return `${this.baseUrl()}${this.config.librariesUrl}/${
            library.machineName
        }-${library.majorVersion}.${library.minorVersion}/${file}?version=${
            library.majorVersion
        }.${library.minorVersion}.${library.patchVersion}`;
    };

    public parameters = (): string =>
        `${this.baseUrl()}${this.config.paramsUrl}`;

    public play = (): string => `${this.baseUrl()}${this.config.playUrl}`;
    public setFinished = (user: IUser): string => {
        if (
            this.csrfProtection?.queryParamGenerator &&
            this.csrfProtection?.protectSetFinished
        ) {
            const qs = this.csrfProtection.queryParamGenerator(user);
            return `${this.config.baseUrl}${this.config.setFinishedUrl}?${qs.name}=${qs.value}`;
        }
        return `${this.config.baseUrl}${this.config.setFinishedUrl}`;
    };

    public temporaryFiles = (): string =>
        this.baseUrl() + this.config.temporaryFilesUrl;

    public uniqueContentUrl(contentId: ContentId): string {
        return contentId;
    }
}
