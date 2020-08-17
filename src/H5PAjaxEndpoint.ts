import { Writable } from 'stream';

import {
    IUser,
    ILibraryDetailedDataForClient,
    IHubInfo,
    ContentId,
    IContentMetadata,
    ContentParameters,
    ILibraryOverviewForClient
} from './types';
import H5PEditor from './H5PEditor';
import H5pError from './helpers/H5pError';
import AjaxSuccessResponse from './helpers/AjaxSuccessResponse';

/**
 * Each method in this class corresponds to a route that is called by the H5P
 * client. Normally, the implementation must call them and send back the
 * return values as a JSON body in the HTTP response.
 *
 * If something goes wrong, the methods throw H5pErrors, which include HTTP
 * status codes. Send back these status codes in your HTTP response.
 */
export default class H5PAjaxEndpoint {
    constructor(private h5pEditor: H5PEditor) {}

    /**
     * This method must be called by the GET route at the Ajax URL, e.g.
     * GET /ajax. This route must be implemented for editor to work.
     * @param action This is the sub action that should be executed. It is part
     * of the query like this: GET /ajax?action=xyz
     * Possible values:
     *   - content-type-cache: Requests information about available content
     *     types from the server. The user parameter must be set, as the
     *     accessible content types and possible actions (update, etc.) can vary
     *     from user to user
     *   - libraries: Requests detailed data about a single library. The
     *     parameters machineName, majorVersion, minorVersion and language must
     *     be set in this case.
     *     Queries look like this:
     *     GET /ajax?action=libraries?machineName=<machine_name>&majorVersion=<major_version>&minorVersion=<minor_version>
     * @param machineName (need if action == 'libraries') The machine name of
     * the library about which information is requested, e.g. 'H5P.Example'.
     * It is part of the query, e.g. +machineName=H5P.Example
     * @param majorVersion (need if action == 'libraries') The major version of
     * the library about which information is requested, e.g. '1'.
     * @param minorVersion (need if action == 'libraries') The minor version of
     * the library about which information is requested, e.g. '0'.
     * @param language (can be set if action == 'libraries') The language in which the
     * editor is currently displayed, e.g. 'en'. Will default to English if
     * unset.
     * @param user (needed if action == 'content-type-cache') The user who is
     * displaying the H5P Content Type Hub. It is the job of the implementation
     * to inject this object.
     * @returns an object which must be sent back in the response as JSON with
     * HTTP status code 200
     * @throws H5pErrors with HTTP status codes, which you must catch and then
     * send back in the response
     */
    public getAjax = async (
        action: 'content-type-cache' | 'libraries' | string,
        machineName?: string,
        majorVersion?: number | string,
        minorVersion?: number | string,
        language?: string,
        user?: IUser
    ): Promise<IHubInfo | ILibraryDetailedDataForClient> => {
        switch (action) {
            case 'content-type-cache':
                const contentTypeCache = await this.h5pEditor.getContentTypeCache(
                    user
                );
                return contentTypeCache;
            case 'libraries':
                const library = await this.h5pEditor.getLibraryData(
                    machineName?.toString(),
                    majorVersion?.toString(),
                    minorVersion?.toString(),
                    language?.toString()
                );
                return library;
            default:
                throw new H5pError(
                    'malformed-request',
                    {
                        error:
                            "The only allowed actions at the GET Ajax endpoint are 'content-type-cache' and 'libraries'."
                    },
                    400
                );
        }
    };

    /**
     * This method must be called when the editor requests the parameters
     * (= content.json) of a piece of content, which is done with
     * GET /params/<contentId>
     * This route must be implemented for the editor to work.
     * @param contentId the content id of the piece of content; it is part of
     * the requests URL (see above)
     * @param user the user who is using the editor. It is the job of the
     * implementation to inject this object.
     * @returns an object which must be sent back in the response as JSON with
     * HTTP status code 200
     * @throws H5pErrors with HTTP status codes, which you must catch and then
     * send back in the response
     */
    public getContentParameters = async (
        contentId: ContentId,
        user: IUser
    ): Promise<{
        h5p: IContentMetadata;
        library: string;
        params: {
            metadata: IContentMetadata;
            params: ContentParameters;
        };
    }> => {
        return this.h5pEditor.getContent(contentId, user);
    };

    /**
     * This method must be called when the user downloads a H5P package (the
     * .h5p file containing all libraries and content files). The route is
     * GET /download/<contentId>
     * @param contentId the id of the content object. It is part of the request
     * URL (see above).
     * @param user the user who wants to download the package. It is the job of
     * the implementation to inject this object.
     * @param outputWritable a Writable to which the file contents are piped.
     * @returns no return value; the result is directly piped to the Writable,
     * which is the Response object in Express, for instance. Note that you must
     * set the HTTP Header 'Content-disposition: attachment; filename=xyz.h5p'
     * in your response!
     * @throws H5pErrors with HTTP status codes, which you must catch and then
     * send back in the response
     */
    public getDownload = async (
        contentId: ContentId,
        user: IUser,
        outputWritable: Writable
    ): Promise<void> => {
        return this.h5pEditor.exportContent(contentId, outputWritable, user);
    };

    /**
     * Performs various actions. Don't be confused by the fact that many of the
     * requests dealt with here are not really POST requests, but look more like
     * GET requests. This is simply how the H5P client works and we can't
     * change it.
     * @param action This is the sub action that should be executed. It is part
     * of the query like this: POST /ajax?action=xyz
     * Possible values:
     *   - libraries:       returns basic information about a list of libraries
     *   - translations:    returns translation data about a list of libraries
     *                      in a specific language
     *   - files:           uploads a resource file (image, video, ...) into
     *                      temporary storage
     *   - filter:          cleans the parameters passed to it to avoid XSS
     *                      attacks and schema violations (currently only
     *                      implemented as a stub)
     *   - library-install: downloads an installs content types from the H5P Hub
     *   - library-upload:  uploads a h5p package from the user's computer and
     *                      installs the libraries in it; returns the parameters
     *                      and metadata in it
     * @param body the parsed JSON content of the request body
     * @param language (needed for 'translations') the language code for which
     * the translations should be retrieved, e.g. 'en'. This paramter is part
     * of the query URL, e.g. POST /ajax?action=translations&language=en
     * @param user (needed for 'files' and 'library-install') the user who is
     * performing the action. It is the job of the implementation to inject this
     * object.
     * @param filesFile (needed for 'files') the file uploaded to the server; this
     * file is part of the HTTP request and has the name 'file'.
     * @param id (needed for 'library-install') the machine name of the library
     * to  install. The id is part of the query URL, e.g. POST /ajax?action=library-install&id=H5P.Example
     * @param t (needed for 'library-install' and 'library-upload') a
     * translation function used to localize messages
     * @param filesFile (needed for 'library-upload') the file uploaded to the
     * server; this file is part of the HTTP request and has the name 'h5p'.
     * @returns an object which must be sent back in the response as JSON with
     * HTTP status code 200
     * @throws H5pErrors with HTTP status codes, which you must catch and then
     * send back in the response
     */
    public postAjax = async (
        action:
            | 'libraries'
            | 'translations'
            | 'files'
            | 'filter'
            | 'library-install'
            | 'library-upload'
            | string,
        body?:
            | { libraries: string[] }
            | { contentId: string; field: string }
            | { libraryParameters: string },
        language?: string,
        user?: IUser,
        filesFile?: {
            data: Buffer;
            mimetype: string;
            name: string;
            size: number;
        },
        id?: string,
        t?: (stringId: string, replacements: { [key: string]: any }) => string,
        libraryUploadFile?: {
            data: Buffer;
            mimetype: string;
            name: string;
            size: number;
        }
    ): Promise<
        | AjaxSuccessResponse
        | { height?: number; mime: string; path: string; width?: number }
        | ILibraryOverviewForClient[]
    > => {
        let updatedLibCount: number;
        let installedLibCount: number;

        const getLibraryResultText = (
            installed: number,
            updated: number
        ): string =>
            `${
                installed
                    ? t
                        ? t('installed-libraries', { count: installed })
                        : `Installed ${installed} libraries.`
                    : ''
            } ${
                updated
                    ? t
                        ? t('updated-libraries', { count: updated })
                        : `Updated ${updated} libraries.`
                    : ''
            }`.trim();

        switch (action) {
            case 'libraries':
                if (!('libraries' in body) || !Array.isArray(body.libraries)) {
                    throw new H5pError(
                        'malformed-request',
                        {
                            error:
                                'the body of the request must contain an array of strings'
                        },
                        400
                    );
                }
                return this.h5pEditor.getLibraryOverview(body.libraries);
            case 'translations':
                if (!('libraries' in body) || !Array.isArray(body.libraries)) {
                    throw new H5pError(
                        'malformed-request',
                        {
                            error:
                                'the body of the request must contain an array of strings'
                        },
                        400
                    );
                }
                return new AjaxSuccessResponse(
                    await this.h5pEditor.listLibraryLanguageFiles(
                        body.libraries,
                        language
                    )
                );
            case 'files':
                if (!('field' in body)) {
                    throw new H5pError(
                        'malformed-request',
                        {
                            error: "'field' property is missing in request body"
                        },
                        400
                    );
                }
                let field: any;
                try {
                    field = JSON.parse(body.field);
                } catch (e) {
                    throw new H5pError(
                        'malformed-request',
                        {
                            error:
                                "'field' property is malformed (must be in JSON)"
                        },
                        400
                    );
                }
                return this.h5pEditor.saveContentFile(
                    undefined,
                    field,
                    filesFile,
                    user
                );
            case 'filter':
                if (!('libraryParameters' in body)) {
                    throw new H5pError(
                        'malformed-request',
                        {
                            error:
                                'libraryParameters is missing in request body'
                        },
                        400
                    );
                }
                let unfiltered: {
                    library: any;
                    metadata: any;
                    params: any;
                };
                try {
                    unfiltered = JSON.parse(body.libraryParameters);
                } catch {
                    throw new H5pError(
                        'malformed-request',
                        {
                            error:
                                "'libraryParameters' property is malformed (must be in JSON)"
                        },
                        400
                    );
                }

                if (
                    !unfiltered?.library ||
                    !unfiltered?.params ||
                    !unfiltered?.metadata
                ) {
                    throw new H5pError(
                        'malformed-request',
                        { error: 'Property missing in libraryParameters' },
                        400
                    );
                }

                // TODO: properly filter params, this is just a hack to get uploading working

                return new AjaxSuccessResponse({
                    library: unfiltered.library,
                    metadata: unfiltered.metadata,
                    params: unfiltered.params
                });
            case 'library-install':
                if (!id || !user) {
                    throw new H5pError(
                        'malformed-request',
                        {
                            error:
                                'Request parameters incorrect: You need an id and a user.'
                        },
                        400
                    );
                }
                const installedLibs = await this.h5pEditor.installLibraryFromHub(
                    id,
                    user
                );
                updatedLibCount = installedLibs.filter(
                    (l) => l.type === 'patch'
                ).length;
                installedLibCount = installedLibs.filter(
                    (l) => l.type === 'new'
                ).length;

                const contentTypeCache = await this.h5pEditor.getContentTypeCache(
                    user
                );
                return new AjaxSuccessResponse(
                    contentTypeCache,
                    installedLibCount + updatedLibCount > 0
                        ? getLibraryResultText(
                              installedLibCount,
                              updatedLibCount
                          )
                        : undefined
                );

            case 'library-upload':
                const {
                    installedLibraries,
                    metadata,
                    parameters
                } = await this.h5pEditor.uploadPackage(
                    libraryUploadFile.data,
                    user
                );
                updatedLibCount = installedLibraries.filter(
                    (l) => l.type === 'patch'
                ).length;
                installedLibCount = installedLibraries.filter(
                    (l) => l.type === 'new'
                ).length;

                const contentTypes = await this.h5pEditor.getContentTypeCache(
                    user
                );
                return new AjaxSuccessResponse(
                    {
                        content: parameters,
                        contentTypes,
                        h5p: metadata
                    },
                    installedLibCount + updatedLibCount > 0
                        ? getLibraryResultText(
                              installedLibCount,
                              updatedLibCount
                          )
                        : undefined
                );
            default:
                throw new H5pError(
                    'malformed-request',
                    {
                        error:
                            'This action is not implemented in h5p-nodejs-library.'
                    },
                    500
                );
        }
    };
}
