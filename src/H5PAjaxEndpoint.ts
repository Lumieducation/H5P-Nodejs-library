import { Writable } from 'stream';

import {
    IUser,
    ILibraryDetailedDataForClient,
    IHubInfo,
    ContentId,
    IContentMetadata,
    ContentParameters
} from './types';
import H5PEditor from './H5PEditor';
import H5pError from './helpers/H5pError';

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
}
