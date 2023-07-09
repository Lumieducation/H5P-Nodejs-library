import { ReadStream } from 'fs';
import { Readable, Stream } from 'stream';

/**
 * The content id identifies content objects in storage. The PHP implementation of H5P
 * uses integers for this, we try to use strings. This might change in the future, if it
 * turns out that the H5P editor client doesn't work with string ids.
 */
export type ContentId = string;

/**
 * Give rights to users to perform certain actions with a piece of content.
 */
export enum ContentPermission {
    Create,
    Delete,
    Download,
    Edit,
    Embed,
    List,
    View
}

/**
 * Give rights to users to perform certain actions with a user data.
 */
export enum UserDataPermission {
    EditState,
    DeleteState,
    ViewState,
    ListStates,
    EditFinished,
    ViewFinished,
    DeleteFinished
}

/**
 * Give rights to users to perform certain actions with temporary files.
 */
export enum TemporaryFilePermission {
    Create,
    Delete,
    List,
    View
}

/**
 * Give rights to users to perform certain actions that are not associated with
 * existing objects.
 */
export enum GeneralPermission {
    /**
     * If given, the user can create content of content types that are set to
     * "restricted".
     */
    CreateRestricted,
    /**
     * If given, the user can install content types from the hub that have the
     *  "recommended" flag in the Hub.
     */
    InstallRecommended,
    /**
     * If given, the user can generally install and update libraries. This
     * includes Hub content types that aren't set to "recommended" or uploading
     * custom packages.
     */
    UpdateAndInstallLibraries
}

/**
 * A response that is sent back to an AJAX call.
 */
export interface IAjaxResponse<T = any> {
    /**
     * The actual payload. Only to be filled in if the request was successful.
     */
    data?: T;
    /**
     * Better description of the error and possibly also which action to take. Only to be filled out if success is false.
     */
    details?: string;
    /**
     * An machine readable error code that the client should be able to interpret. Only to be filled out if success is false.
     */
    errorCode?: string;
    /**
     * The HTTP status code of the request. (e.g. 200 or 404)
     */
    httpStatusCode?: number;
    /**
     * The localized error message. Only to be filled out if success is false.
     */
    message?: string;
    /**
     * True if the request was successful, false if something went wrong (errorCode and message should be filled in then).
     */
    success: boolean;
}

/**
 * Assets are files required by a library to work. These include JavaScript, CSS files and translations.
 */
export interface IAssets {
    scripts: string[];
    styles: string[];
    translations: {
        [machineName: string]: { semantics: ILanguageFileEntry[] };
    };
}

/**
 * Represents the information needed to identify an installed library. This information is also called
 * ubername when it's represented as a string like this: H5P.Example-1.0
 * Even though H5P libraries generally also have a patch version (1.0.0), the patch version is not
 * needed to identify an installed library as there can only be one installed patch version of a library
 * at a time. (However, It is possible to install the same library in different major or minor versions.
 * That's why the machine name is not enough to identify it.)
 */
export interface ILibraryName {
    /**
     * The name used to identify the library (e.g. H5P.Example)
     */
    machineName: string;
    /**
     * The major version of the library (e.g. 1)
     */
    majorVersion: number;
    /**
     * The minor version of the library (e.g. 0)
     */
    minorVersion: number;
}

export interface IFullLibraryName extends ILibraryName {
    patchVersion: number;
}

export interface ILibraryInstallResult {
    newVersion?: IFullLibraryName;
    oldVersion?: IFullLibraryName;
    type: 'new' | 'patch' | 'none';
}

/**
 * This is an author inside content metadata.
 */
export interface IContentAuthor {
    name?: string;
    role?: string;
}

/**
 * This is a change inside content metadata.
 */
export interface IContentChange {
    author?: string;
    date?: string;
    log?: string;
}

/**
 * This is the structure of the object received by the editor client when saving content.
 * It is also used when creating h5p.json files for .h5p packages.
 */
export interface IContentMetadata extends ILicenseData {
    dynamicDependencies?: ILibraryName[];
    editorDependencies?: ILibraryName[];
    embedTypes: ('iframe' | 'div')[];
    h?: string;
    language: string;
    mainLibrary: string;
    metaDescription?: string;
    metaKeywords?: string;
    /**
     * A flat list of all dependencies required for the content to be displayed.
     * Note that this list is a flat representation of the full dependency tree
     * that is created by looking up all dependencies of the main library.
     */
    preloadedDependencies: ILibraryName[];
    w?: string;
}

/**
 * The non-technical copyright and license metadata of a content object. H5P
 * calls this "metadata" in the GUI (and in their code), but to avoid confusing
 * from our use of metadata, we call it license data.
 */
export interface ILicenseData {
    defaultLanguage: string;
    a11yTitle?: string;
    license: string;
    licenseVersion?: string;
    yearFrom?: string;
    yearTo?: string;
    source?: string;
    title: string;
    authors?: IContentAuthor[];
    licenseExtras?: string;
    changes?: IContentChange[];
    authorComments?: string;
    contentType?: string;
}

export interface ISerializedContentUserData {
    /**
     * The state as a serialized JSON object.
     */
    [dataType: string]: string;
}
/**
 * The integration object is used to pass information to the H5P JavaScript
 * client running in the browser about certain settings and values of the
 * server.
 */
export interface IIntegration {
    ajax: {
        /**
         * The Ajax endpoint called when the user state has changed
         * Example: /h5p-ajax/content-user-data/:contentId/:dataType/:subContentId?token=XYZ
         * You can use these placeholders:
         * :contentId (can be null for editor)
         * :dataType (values: state or any string)
         * :subContentId (seems to obsolete, always 0)
         * The H5P client will replace them with the actual values.
         */
        contentUserData: string;
        /**
         * An Ajax endpoint called when the user has finished the content.
         * Example: /h5p-ajax/set-finished.json?token=XYZ
         * Only called when postUserStatistics is set to true.
         */
        setFinished: string;
    };
    ajaxPath: string;
    /**
     * The base URL, e.g. https://example.org
     */
    baseUrl?: string;
    /**
     * The key must be of the form "cid-XXX", where XXX is the id of the content
     */
    contents?: {
        [key: string]: {
            /**
             * Can be used to override the URL used for getting content files.
             * It must be a URL to which the actual filenames can be appended.
             * Do not end it with a slash!
             * If it is a relative URL it will be appended to the hostname that
             * is in use (this is done in the H5P client).
             * If it is an absolute URL it will be used directly.
             */
            contentUrl?: string;
            contentUserData?: ISerializedContentUserData[];
            displayOptions: {
                copy: boolean;
                copyright: boolean;
                embed: boolean;
                export: boolean;
                frame: boolean;
                icon: boolean;
            };
            /**
             * The full embed code (<iframe>...</iframe> with absolute URLs).
             * Example: <iframe src=\"https://example.org/h5p/embed/XXX\" width=\":w\" height=\":h\" frameborder=\"0\" allowfullscreen=\"allowfullscreen\"></iframe>"
             */
            embedCode?: string;
            /**
             * The download URL (absolute URL).
             */
            exportUrl?: string;
            fullScreen: '0' | '1';
            jsonContent: string;
            /**
             * The ubername with whitespace as separator.
             */
            library: string;
            mainId?: string;
            metadata?: ILicenseData;
            /**
             * The parameters.
             */
            params?: any;
            /**
             * A script html tag which can be included alongside the embed code
             * to make the iframe size to the available width. Use absolute URLs.
             * Example: <script src=\"https://example.org/h5p/library/js/h5p-resizer.js\" charset=\"UTF-8\"></script>
             */
            resizeCode?: string;
            /**
             * A complete list of scripts required to display the content.
             * Includes core scripts and content type specific scripts.
             */
            scripts?: string[];
            /**
             * A complete list of styles required to display the content.
             * Includes core scripts and content type specific styles.
             */
            styles?: string[];
            /**
             * The absolute URL to the current content. Used when generating
             * xAPI ids. (Becomes the attribute statement.object.id of the xAPI
             * statement. If it is a content with subcontents, the subContentId
             * will be appended like this: URL?subContentId=XXX)
             */
            url?: string;
        };
    };
    /**
     * The files in this list are references when creating iframes.
     */
    core?: {
        /**
         * A list of JavaScript files that make up the H5P core
         */
        scripts?: string[];
        /**
         * A list of CSS styles that make up the H5P core.
         */
        styles?: string[];
    };
    /**
     * Can be null.
     */
    crossorigin?: any;
    /**
     * Can be null.
     */
    crossoriginCacheBuster?: any;
    /**
     * We pass certain configuration values to the client with the editor
     * integration object. Note that the way to pass these values to the client
     * is NOT standardized and in the PHP implementation it is not the same in
     * the Drupal, Moodle and WordPress clients. For our NodeJS version
     * we've decided to put the values into the integration object. The page
     * created by the editor renderer has to extract these values and put
     * them into the corresponding properties of the H5PEditor object!
     * See /src/renderers/default.ts how this can be done!
     */
    editor?: ILumiEditorIntegration;
    fullscreenDisabled?: 0 | 1;
    hubIsEnabled: boolean;
    /**
     * The localization strings. The namespace can for example be 'H5P'.
     */
    l10n: {
        [namespace: string]: any;
    };
    /**
     * Can be null. The server can customize library behavior by setting the
     * library config for certain machine names, as the H5P client allows it to
     * be called by executing H5P.getLibraryConfig(machineName). This means that
     * libraries can retrieve configuration values from the server that way.
     */
    libraryConfig?: {
        [machineName: string]: any;
    };
    /**
     * The URL at which the core **JavaScript** files are stored.
     */
    libraryUrl?: string;
    /**
     * The cache buster appended to JavaScript and CSS files.
     * Example: ?q8idru
     */
    pluginCacheBuster?: string;
    /**
     * If set the URL specified in ajax.setFinished is called when the user is
     * finished with a content object.
     */
    postUserStatistics: boolean;
    reportingIsEnabled?: boolean;
    /*
     * How often the user state of content is saved (in seconds). Set to false
     * to disable saving user state. Note that the user state is only saved if
     * the user object is passed into the render method of the player. You also
     * must set ajax.contentUserData for state saving to work.
     */
    saveFreq: number | boolean;
    /**
     * Used when generating xAPI statements.
     */
    siteUrl?: string;
    /**
     * The URL at which files can be accessed. Combined with the baseUrl by the
     * client.
     * Example. /h5p
     */
    url: string;
    /**
     * Used to override the auto-generated library URL (libraries means "content
     * types" here). If this is unset, the H5P client will assume '/libraries'.
     * Note that the URL is NOT appended to the url or baseUrl property!
     */
    urlLibraries?: string;
    user: {
        /**
         * Usage unknown.
         */
        canToggleViewOthersH5PContents?: 0 | 1;
        id?: any;
        mail: string;
        name: string;
    };
    Hub?: {
        contentSearchUrl: string;
    };
}

/**
 * The editor integration object is used to pass information to the page that
 * is created by the renderer. Note that this object is NOT standard H5P
 * behavior but specific to our NodeJS implementation.
 * The editor view created by the renderer has to copy these values into the
 * H5PEditor object! This is the responsibility of the implementation and NOT
 * done by the H5P client automatically!
 */
export interface ILumiEditorIntegration extends IEditorIntegration {
    baseUrl?: string;
    contentId?: string;
    contentRelUrl?: string;
    editorRelUrl?: string;
    relativeUrl?: string;
}

/**
 * This is the H5P standard editor integration interface.
 */
export interface IEditorIntegration {
    ajaxPath: string;
    apiVersion: { majorVersion: number; minorVersion: number };
    assets: {
        css: string[];
        js: string[];
    };
    basePath?: string;
    copyrightSemantics?: any;
    enableContentHub?: boolean;
    /**
     * This is a reference ot a generic binary file icon used in some content
     * types.
     */
    fileIcon?: {
        height: number;
        path: string;
        width: number;
    };
    /**
     * The path at which **temporary** files can be retrieved from.
     */
    filesPath: string;
    hub?: {
        contentSearchUrl: string;
    };
    language?: string;
    libraryUrl: string;
    metadataSemantics?: any;
    nodeVersionId: ContentId;
    wysiwygButtons?: string[];
}

/**
 * This describes the Path of JavaScript and CSS files in a library.json file.
 * This single property interface exists because the library.json file expects
 * this format.
 */
export interface IPath {
    path: string;
}

/**
 * This describes the creation time and the size of a file
 */
export interface IFileStats {
    birthtime: Date;
    size: number;
}

/**
 * This is the structure of "data transfer objects" that are passed back to the
 * JavaScript client. It is used to return a lot of information about library
 * metadata, required files, translations etc.
 *
 * It does not exactly follow the structure library.json: it also includes other
 * properties, which aren't present in the library.json file (they are added
 * dynamically) and some properties are missing or named differently.
 */
export interface ILibraryDetailedDataForClient {
    /**
     * URLs of CSS files required for the editor.
     */
    css: string[];
    /**
     * Exact usage unknown. Can be null.
     */
    defaultLanguage: string;
    /**
     * URLs of JavaScript files required for the editor.
     */
    javascript: string[];
    /**
     * Exact usage unknown. Can be null.
     */
    language: any;
    /**
     * The languages available for the content type (e.g. en, de, fr, etc.)
     */
    languages: string[];
    /**
     * The machine name of the library. (e.g. H5P.Example)
     */
    name: string;
    /**
     * The semantics object describing the structure of content of this type.
     */
    semantics: ISemanticsEntry[];
    /**
     * The human-readable title of the library.
     */
    title: string;
    /**
     * Used translation strings for the various libraries.
     */
    translations: any;
    /**
     * The URL of the JavaScript file that performs content upgrades.
     * Can be null.
     */
    upgradesScript: string;
    /**
     * The version of the library.
     */
    version: {
        major: number;
        minor: number;
    };
}

/**
 * This is the structure of "data transfer objects" that are passed back to the
 * Javascript client. It is used when giving a rough overview of installed libraries.
 */
export interface ILibraryOverviewForClient {
    majorVersion: number;
    metadataSettings: any;
    minorVersion: number;
    name: string;
    restricted: boolean;
    runnable: boolean | 0 | 1;
    title: string;
    tutorialUrl: string;
    /**
     * The name of the library in the format "H5P.Library-1.0"
     */
    uberName: string;
}

/**
 * This specifies the structure of user objects. It must be implemented by
 * implementations.
 */
export interface IUser {
    /**
     * E-Mail address.
     */
    email: string;
    /**
     * An internal id used to check if user objects are identical.
     */
    id: string;
    /**
     * The full name of the user.
     */
    name: string;
    /**
     * Specifies type of user. Possible values other than 'local' are unknown as of this time.
     */
    type: 'local' | string;
}

/**
 * Saves the current state of users, so that users can resume where they left
 * off.
 */
export interface IContentUserData {
    /**
     * The id of the content object to which this state belongs.
     */
    contentId?: ContentId;
    /**
     * Used by the h5p.js client
     */
    dataType: string;
    /**
     * The id provided by the h5p.js client call
     */
    subContentId: string;
    /**
     * An identifier that can be used to have multiple states for one content -
     * user tuple. The identifier is provided by the implementation and its use
     * is optional. contextId is an extension of the NodeJS library and not
     * standard H5P.
     */
    contextId?: string;
    /**
     * The actual user state as string. This is typically a serialized JSON
     * string that the content type generates when called by the H5P client. We
     * don't need to know what is in it for the server
     */
    userState: string;
    /**
     * The id of the user to which the state belongs.
     */
    userId?: string;
    /**
     * Indicates that data should be included in the H5PIntegration object when
     * content is first loaded. (This is usually on. It is set by the content
     * type.)
     */
    preload: boolean;
    /**
     * Indicates that data should be invalidated when content changes. The
     * server then deletes the state when the content is updated.
     */
    invalidate: boolean;
}

/**
 * Simple tracking data of user's activities in content. It is generated from an
 * xAPI statement generated inside the content type. It is sent by the client to
 * the server.
 */
export interface IFinishedUserData {
    /**
     * the score the user reached as an integer
     */
    score: number;
    /**
     * the maximum score of the content
     */
    maxScore: number;
    /**
     * the time the user opened the content as UNIX time
     */
    openedTimestamp: number;
    /*
     * the time the user finished the content as UNIX time
     */
    finishedTimestamp: number;
    /**
     * the time the user needed to complete the content (as integer)
     */
    completionTime: number;
    contentId: ContentId;
    userId: string;
}

/**
 * Implementations can implement the IContentUserDataStorage interface and pass
 * it to the constructor of H5PEditor or H5PPlayer if they wish to keep the user
 * state and allows users to continue where they left off. It also tracks
 * content completion.
 */
export interface IContentUserDataStorage {
    /**
     * Creates or updates the content user data.
     * @param contextId an arbitrary value that can be used to save multiple
     * states for one content - user tuple
     */
    createOrUpdateContentUserData(userData: IContentUserData): Promise<void>;

    /**
     * Deletes all content userData which has the invalidate field set to true.
     * This method is called from the editor when content is changed and the
     * saved contentUserData becomes invalidated.
     * @param contentId The id of the content which to delete
     */
    deleteInvalidatedContentUserData(contentId: ContentId): Promise<void>;

    /**
     * Deletes a contentUserData object. (Useful for implementing GDPR rights
     * functionality.) Throws errors if something goes wrong.
     * @param user the user of the content user data that should be deleted
     */
    deleteAllContentUserDataByUser(user: IUser): Promise<void>;

    /**
     * Deletes all userContentData objects for a given contentId. (Used when
     * deleting content) Throws errors if something goes wrong.
     * @param contentId The content id to delete.
     */
    deleteAllContentUserDataByContentId(contentId: ContentId): Promise<void>;

    /**
     * Loads the contentUserData for given contentId, dataType and subContentId
     * @param contentId The id of the content to load user data from
     * @param dataType Used by the h5p.js client
     * @param subContentId The id provided by the h5p.js client call
     * @param user The user who owns this object
     * @param contextId an arbitrary value that can be used to save multiple
     * states for one content - user tuple
     * @returns the data
     */
    getContentUserData(
        contentId: ContentId,
        dataType: string,
        subContentId: string,
        userId: string,
        contextId?: string
    ): Promise<IContentUserData>;

    /**
     * Lists all associated contentUserData for a given contentId and user.
     * @param contentId The id of the content to load user data from
     * @param user The id of the user to load user data from
     * @param contextId an arbitrary value that can be used to save multiple
     * states for one content - user tuple
     * @returns An array of objects containing the dataType, subContentId and
    the contentUserState as string in the data field.
     */
    getContentUserDataByContentIdAndUser(
        contentId: ContentId,
        userId: string,
        contextId?: string
    ): Promise<IContentUserData[]>;

    /**
     * Retrieves all contentUserData for a given user (Useful for implementing
     * GDPR rights functionality.)
     * @param user the user for which the contentUserData should be retrieved.
     */
    getContentUserDataByUser(user: IUser): Promise<IContentUserData[]>;

    /**
     * Saves data when a user completes content or replaces the previous
     * finished data.
     */
    createOrUpdateFinishedData(finishedData: IFinishedUserData): Promise<void>;

    /**
     * Gets the finished data of all users for a specific piece of content.
     */
    getFinishedDataByContentId(
        contentId: ContentId
    ): Promise<IFinishedUserData[]>;

    /**
     * Gets all finished user data for a specific user (across all content
     * objects). (Useful for implementing GDPR rights functionality.)
     */
    getFinishedDataByUser(user: IUser): Promise<IFinishedUserData[]>;

    /**
     * Deletes all finished user data of a content object. (Called when the
     * content object is deleted)
     */
    deleteFinishedDataByContentId(contentId: ContentId): Promise<void>;

    /**
     * Deletes all finished user data for a specific user (across all content
     * objects). (Useful for implementing GDPR rights functionality.)
     */
    deleteFinishedDataByUser(user: IUser): Promise<void>;
}

/**
 * Implementations need to implement the IContentStorage interface and pass it
 * to the constructor of H5PEditor. It is used to persist content data (semantic
 * data, images, videos etc.) permanently. See the FileContentStorage sample
 * implementation in the examples directory for more details.
 */
export interface IContentStorage {
    /**
     * Creates a content object in the repository. Content files (like images)
     * are added to it later with addFile(...). Throws an error if something
     * went wrong. In this case the calling method will remove all traces of the
     * content and all changes are reverted.
     * @param metadata The content metadata of the content (= h5p.json)
     * @param content the content object (= content/content.json)
     * @param user The user who owns this object.
     * @param contentId (optional) The content id to use
     * @returns The newly assigned content id
     */
    addContent(
        metadata: IContentMetadata,
        content: any,
        user: IUser,
        contentId?: ContentId
    ): Promise<ContentId>;

    /**
     * Adds a content file to an existing content object. The content object has
     * to be created with addContent(...) first.
     * @param contentId The id of the content to add the file to
     * @param filename The filename; can be a path including subdirectories
     * (e.g. 'images/xyz.png')
     * @param readStream A readable stream that contains the data
     * @param user (optional) The user who owns this object
     */
    addFile(
        contentId: ContentId,
        filename: string,
        readStream: Stream,
        user?: IUser
    ): Promise<void>;

    /**
     * Checks if a piece of content exists in storage.
     * @param contentId the content id to check
     * @returns true if the piece of content exists
     */
    contentExists(contentId: ContentId): Promise<boolean>;

    /**
     * Deletes a content object and all its dependent files from the repository.
     * Throws errors if something goes wrong.
     * @param id The content id to delete.
     * @param user The user who wants to delete the content
     */
    deleteContent(contentId: ContentId, user?: IUser): Promise<void>;

    /**
     * Deletes a file from a content object.
     * @param contentId the content object the file is attached to
     * @param filename the file to delete; can be a path including
     * subdirectories (e.g. 'images/xyz.png')
     */
    deleteFile(
        contentId: ContentId,
        filename: string,
        user?: IUser
    ): Promise<void>;

    /**
     * Checks if a file exists.
     * @param contentId The id of the content to add the file to
     * @param filename the filename of the file to get; can be a path including
     * subdirectories (e.g. 'images/xyz.png')
     * @returns true if the file exists
     */
    fileExists(contentId: ContentId, filename: string): Promise<boolean>;

    /**
     * Returns information about a content file (e.g. image or video) inside a
     * piece of content.
     * @param id the id of the content object that the file is attached to
     * @param filename the filename of the file to get information about
     * @param user the user who wants to retrieve the content file
     * @returns
     */
    getFileStats(
        contentId: ContentId,
        file: string,
        user: IUser
    ): Promise<IFileStats>;

    /**
     * Returns a readable stream of a content file (e.g. image or video) inside
     * a piece of content
     * @param id the id of the content object that the file is attached to
     * @param filename the filename of the file to get; can be a path including
     * subdirectories (e.g. 'images/xyz.png')
     * @param user the user who wants to retrieve the content file
     * @param rangeStart (optional) the position in bytes at which the stream
     * should start
     * @param rangeEnd (optional) the position in bytes at which the stream
     * should end
     * @returns the stream (that can be used to send the file to the user)
     */
    getFileStream(
        contentId: ContentId,
        file: string,
        user: IUser,
        rangeStart?: number,
        rangeEnd?: number
    ): Promise<Readable>;

    /**
     * Returns the content metadata (=h5p.json) for a content id
     * @param contentId the content id for which to retrieve the metadata
     * @param user (optional) the user who wants to access the metadata. If
     * undefined, access must be granted.
     * @returns the metadata
     */
    getMetadata(contentId: ContentId, user?: IUser): Promise<IContentMetadata>;

    /**
     * Returns the content object (=content.json) for a content id
     * @param contentId the content id for which to retrieve the metadata
     * @param user (optional) the user who wants to access the metadata. If
     * undefined, access must be granted.
     * @returns the content object
     */
    getParameters(
        contentId: ContentId,
        user?: IUser
    ): Promise<ContentParameters>;

    /**
     * Calculates how often a library is in use.
     * @param library the library for which to calculate usage.
     * @returns asDependency: how often the library is used as subcontent in
     * content; asMainLibrary: how often the library is used as a main library
     */
    getUsage(
        library: ILibraryName
    ): Promise<{ asDependency: number; asMainLibrary: number }>;

    /**
     * Lists the content objects in the system (if no user is specified) or
     * owned by the user.
     * @param user (optional) the user who owns the content
     * @returns a list of contentIds
     */
    listContent(user?: IUser): Promise<ContentId[]>;

    /**
     * Gets the filenames of files added to the content with addFile(...) (e.g.
     * images, videos or other files)
     * @param contentId the piece of content
     * @param user the user who wants to access the piece of content
     * @returns a list of files that are used in the piece of content, e.g.
     * ['images/image1.png', 'videos/video2.mp4', 'file.xyz']
     */
    listFiles(contentId: ContentId, user: IUser): Promise<string[]>;

    /**
     * Removes invalid characters from filenames and enforces other filename
     * rules required by the storage implementation (e.g. filename length
     * restrictions). Note: file names will be appended with a 9 character long
     * unique id, so you must make sure to shorten long filenames accordingly!
     * If you do not implement this method, there will be no sanitization!
     * @param filename the filename to sanitize; this can be a relative path
     * (e.g. "images/image1.png")
     * @returns the clean filename
     */
    sanitizeFilename?(filename: string): string;
}

/**
 * Implementations need to implement the ILibraryStorage interface and pass it
 * to H5PEditor. It is used to persist library information and files
 * permanently. Note that the library metadata and semantics are accessed
 * regularly, so caching them is a good idea. The library files will also be
 * accessed frequently, so it makes sense to keep them in memory and not access
 * a hard disk every time they are downloaded. See the FileLibraryStorage sample
 * implementation in the examples directory for more details.
 */
export interface ILibraryStorage {
    /**
     * Adds a library file to a library. The library metadata must have been
     * installed with addLibrary(...) first. Throws an error if something
     * unexpected happens. In this case the method calling addFile(...) will
     * clean up the partly installed library.
     * @param library The library that is being installed
     * @param filename Filename of the file to add, relative to the library root
     * @param stream The stream containing the file content
     * @returns true if successful
     */
    addFile(
        library: ILibraryName,
        filename: string,
        readStream: Readable
    ): Promise<boolean>;

    /**
     * Adds the metadata of the library to the repository and assigns a new id
     * to the installed library. This dea is used later when the library must be
     * referenced somewhere. Throws errors if something goes wrong.
     * @param libraryMetadata The library metadata object (= content of
     * library.json)
     * @param restricted True if the library can only be used be users allowed
     * to install restricted libraries.
     * @returns The newly created library object to use when adding library
     * files with addFile(...)
     */
    addLibrary(
        libraryData: ILibraryMetadata,
        restricted: boolean
    ): Promise<IInstalledLibrary>;

    /**
     * Removes all files of a library. Doesn't delete the library metadata.
     * (Used when updating libraries.)
     * @param library the library whose files should be deleted
     */
    clearFiles(library: ILibraryName): Promise<void>;

    /**
     * Removes the library and all its files from the repository.
     * Throws errors if something went wrong.
     * @param library The library to remove.
     */
    deleteLibrary(library: ILibraryName): Promise<void>;

    /**
     * Check if the library contains a file.
     * @param library The library to check
     * @param filename
     * @returns true if file exists in library, false otherwise
     */
    fileExists(library: ILibraryName, filename: string): Promise<boolean>;

    /**
     * Counts how often libraries are listed in the dependencies of other
     * libraries and returns a list of the number.
     *
     * Note: Implementations should not count circular dependencies that are
     * caused by editorDependencies. Example: H5P.InteractiveVideo has
     * H5PEditor.InteractiveVideo in its editor dependencies.
     * H5PEditor.Interactive video has H5P.InteractiveVideo in its preloaded
     * dependencies. In this case H5P.InteractiveVideo should get a dependency
     * count of 0 and H5PEditor.InteractiveVideo should have 1. That way it is
     * still possible to delete the library from storage.
     *
     * @returns an object with ubernames as key.
     * Example:
     * {
     *   'H5P.Example': 10
     * }
     * This means that H5P.Example is used by 10 other libraries.
     */
    getAllDependentsCount(): Promise<{ [ubername: string]: number }>;

    /**
     * Returns the number of libraries that depend on this (single) library.
     * @param library the library to check
     * @returns the number of libraries that depend on this library.
     */
    getDependentsCount(library: ILibraryName): Promise<number>;

    getFileAsJson(library: ILibraryName, file: string): Promise<any>;

    getFileAsString(library: ILibraryName, file: string): Promise<string>;

    /**
     * Returns a information about a library file.
     * Throws an exception if the file does not exist.
     * @param library library
     * @param filename the relative path inside the library
     * @returns the file stats
     */
    getFileStats(library: ILibraryName, file: string): Promise<IFileStats>;

    /**
     * Returns a readable stream of a library file's contents.
     * Throws an exception if the file does not exist.
     * @param library library
     * @param filename the relative path inside the library
     * @returns a readable stream of the file's contents
     */
    getFileStream(library: ILibraryName, file: string): Promise<Readable>;

    /**
     * Returns all installed libraries or the installed libraries that have the
     * machine name.
     * @param machineName (optional) only return libraries that have this
     * machine name
     * @returns the libraries installed
     */
    getInstalledLibraryNames(machineName?: string): Promise<ILibraryName[]>;

    /**
     * Gets a list of installed language files for the library.
     * @param library The library to get the languages for
     * @returns The list of JSON files in the language folder (without the
     * extension .json)
     */
    getLanguages(library: ILibraryName): Promise<string[]>;

    /**
     * Gets the information about an installed library
     * @param library the library
     * @returns the metadata and information about the locally installed library
     */
    getLibrary(library: ILibraryName): Promise<IInstalledLibrary>;

    /**
     * Checks if a library is installed.
     * @param library the library to check
     * @returns true if the library is installed
     */
    isInstalled(library: ILibraryName): Promise<boolean>;

    /**
     * Returns a list of library addons that are installed in the system.
     * Addons are libraries that have the property 'addTo' in their metadata.
     * ILibraryStorage implementation CAN but NEED NOT implement the method.
     * If it is not implemented, addons won't be available in the system.
     */
    listAddons?(): Promise<ILibraryMetadata[]>;

    /**
     * Gets a list of all library files that exist for this library.
     * @param library
     * @returns all files that exist for the library
     */
    listFiles(library: ILibraryName): Promise<string[]>;

    /**
     * Updates the additional metadata properties that is added to the
     * stored libraries. This metadata can be used to customize behavior like
     * restricting libraries to specific users.
     *
     * Implementations should avoid updating the metadata if the additional
     * metadata if nothing has changed.
     * @param library the library for which the metadata should be updated
     * @param additionalMetadata the metadata to update
     * @returns true if the additionalMetadata object contained real changes
     * and if they were successfully saved; false if there were not changes.
     * Throws an error if saving was not possible.
     */
    updateAdditionalMetadata(
        library: ILibraryName,
        additionalMetadata: Partial<IAdditionalLibraryMetadata>
    ): Promise<boolean>;

    /**
     * Updates the library metadata. This is necessary when updating to a new
     * patch version. After this clearFiles(...) is called by the LibraryManager
     * to remove all old files. The next step is to add the patched files with
     * addFile(...).
     * @param libraryMetadata the new library metadata
     * @returns The updated library object
     */
    updateLibrary(
        libraryMetadata: ILibraryMetadata
    ): Promise<IInstalledLibrary>;
}

/**
 * Manages permissions of users.
 */
export interface IPermissionSystem<TUser extends IUser = IUser> {
    /**
     * Checks if a user has a certain permission on a content object
     * @param actingUser the user who is currently active
     * @param permission the permission to check
     * @param contentId the content for which to check; if the permission if
     * `ContentPermission.List` or `ContentPermission.Create` the id will be
     * undefined
     * @returns true if the user is allowed to do it
     */
    checkForContent(
        actingUser: TUser,
        permission: ContentPermission,
        contentId: ContentId | undefined
    ): Promise<boolean>;

    /**
     * Checks if a user has a certain permission on a user data object.
     * @param actingUser the user who is currently active
     * @param permission the permission to check
     * @param contentId the content id to which the user data belongs
     * @param affectedUserId (optional) if the acting user tries to access user
     * data that is not their own, the affected user will be specified here
     * @returns true if the user is allowed to do it
     */
    checkForUserData(
        actingUser: TUser,
        permission: UserDataPermission,
        contentId: ContentId,
        affectedUserId?: string
    ): Promise<boolean>;

    /**
     * Checks if a user has a certain permission on a temporary file
     * @param actingUser the currently active user
     * @param permission the permission to check
     * @param filename the file the user is trying to access; can be undefined
     * if the the check is for TemporaryFilePermission.Create
     * @returns true if the user is allowed to do it
     */
    checkForTemporaryFile(
        actingUser: TUser,
        permission: TemporaryFilePermission,
        filename: string | undefined
    ): Promise<boolean>;

    /**
     * Checks if a user has a certain permission that is not associated with any
     * object, but part of their general role.
     * @param actingUser the currently active user
     * @param permission the permission to check
     * @return true if the user is allowed to do it
     */
    checkForGeneralAction(
        actingUser: TUser,
        permission: GeneralPermission
    ): Promise<boolean>;
}

/**
 * This is the actual "content itself", meaning the object contained in
 * content.json. It is created by the JavaScript editor client and played out by
 * the JavaScript player. Its structure can vary depending on the semantics
 * associated with the main library of the content.
 */
export type ContentParameters = any;

/**
 * This is an entry in the semantics of a library. The semantics define who content parameters
 * must look like.
 *
 * Note: Attributes can only be used by specific semantic types. See https://h5p.org/semantics
 * for a full reference.
 */
export interface ISemanticsEntry {
    /**
     * A common field is set for all instances of the library at once.
     * In the editor, all common fields are displayed in a group at the bottom.
     * Use this for localization / translations.
     */
    common?: boolean;
    /**
     * (for number) the number of allowed decimals
     */
    decimals?: number;
    /**
     * The default value of the field.
     */
    default?: string;
    /**
     * An explanation text below the widget shown in the editor
     */
    description?: string;
    /**
     * (for text with html widget) what the html widget inserts when pressing enter
     */
    enterMode?: 'p' | 'div';
    /**
     * (for list) The name for a single entity in a list.
     */
    entity?: string;
    /**
     * (for group) Group is expanded by default
     */
    expanded?: boolean;
    /**
     * Further attributes allowed in the params.
     */
    extraAttributes?: string[];
    /**
     * (in lists only) defines a single field type in the list
     */
    field?: ISemanticsEntry;
    /**
     * (in groups only) a list of field definitions
     */
    fields?: ISemanticsEntry[];
    /**
     * The font choices the user has in the HTML editor widget. If set to true,
     * the editor will display the default choices and the style will be allowed
     * by the sanitization filter. All other styles will be removed.
     *
     * You an also specify lists of allowed CSS values with a label. These are
     * currently ignored in the server-side CSS style filter, though.
     */
    font?: {
        background?:
            | boolean
            | { css: string; default?: boolean; label: string }[];
        color?: boolean | { css: string; default?: boolean; label: string }[];
        family?: boolean | { css: string; default?: boolean; label: string }[];
        height?: boolean | { css: string; default?: boolean; label: string }[];
        size?: boolean | { css: string; default?: boolean; label: string }[];
        spacing?: boolean | { css: string; default?: boolean; label: string }[];
    };
    /**
     * More important fields have a more prominent style in the editor.
     */
    importance?: 'low' | 'medium' | 'high';
    /**
     * A help text that can be collapsed.
     */
    important?: {
        description: string;
        example: string;
    };
    /**
     * (for group) unknown
     */
    isSubContent?: boolean;
    /**
     * The text displayed in the editor for the entry. (localizable)
     */
    label?: string;
    /**
     * (for number) the maximum number allowed
     * (for list) the maximum number of elements
     */
    max?: number | string;
    /**
     * (for text) the maximum number of characters of the text
     */
    maxLength?: number;
    /**
     * (for number) the minimum number allowed
     * (for list) the minimum number of elements
     */
    min?: number | string;
    /**
     * The internal name (e.g. for referencing it in code)
     */
    name: string;
    /**
     * Optional fields don't have to be filled in.
     */
    optional?: boolean;
    /**
     * (for select) the options to choose from
     * (for library) a list of library ubernames (whitespaces instead
     * of hyphens as separators)
     */
    options?: any[];
    /**
     * The text displayed in a text box if the user has entered nothing so far.
     */
    placeholder?: string;
    /**
     * (for text) the regexp pattern the text must match
     */
    regexp?: {
        modifiers: string;
        pattern: string;
    };
    /**
     * (for number) the allowed steps
     */
    steps?: number;
    /**
     * (for library) an id identifying subcontent, set by the editor; Must be
     * formatted like this:
     * /^\{?[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\}?$/
     */
    subContentId?: string;
    /**
     * (for text) list of allowed html tags.
     */
    tags?: string[];
    /**
     * The object type of this entry.
     */
    type:
        | 'file'
        | 'text'
        | 'number'
        | 'boolean'
        | 'group'
        | 'list'
        | 'select'
        | 'library'
        | 'image'
        | 'video'
        | 'audio';
    /**
     * Name of the widget to use in the editor.
     */
    widget?: string;
}

/**
 * This is metadata of a library that is not part of the H5P specification. The
 * data can be used to customize behaviour of h5p-nodejs-library.
 */
export interface IAdditionalLibraryMetadata {
    /**
     * If set to true, the library can only be used be users who have this special
     * privilege.
     */
    restricted: boolean;
}

/**
 * Objects of this interface represent installed libraries that have an id.
 */
export interface IInstalledLibrary
    extends ILibraryMetadata,
        IAdditionalLibraryMetadata {
    /**
     * Compares libraries by giving precedence to title, then major version, then minor version
     * @param otherLibrary
     */
    compare(otherLibrary: IInstalledLibrary): number;

    /**
     * Compares libraries by giving precedence to major version, then minor version, then if present patch version.
     * @param otherLibrary
     * @returns a negative value: if this library is older than the other library
     * a positive value: if this library is newer than the other library
     * zero: if both libraries are the same (or if it can't be determined, because the patch version is missing in the other library)
     */
    compareVersions(
        otherLibrary: ILibraryName & { patchVersion?: number }
    ): number;
}

/**
 * This interface represents the structure of library.json files.
 */
export interface ILibraryMetadata extends IFullLibraryName {
    /**
     * Addons can be added to other content types by
     */
    addTo?: {
        content?: {
            types?: {
                text?: {
                    /**
                     * If any string property in the parameters matches the regex,
                     * the addon will be activated for the content.
                     */
                    regex?: string;
                };
            }[];
        };
        /**
         * Contains cases in which the library should be added to the editor.
         *
         * This is an extension to the H5P library metadata structure made by
         * h5p-nodejs-library. That way addons can specify to which editors
         * they should be added in general. The PHP implementation hard-codes
         * this list into the server, which we want to avoid here.
         */
        editor?: {
            /**
             * A list of machine names in which the addon should be added.
             */
            machineNames: string[];
        };
        /**
         * Contains cases in which the library should be added to the player.
         *
         * This is an extension to the H5P library metadata structure made by
         * h5p-nodejs-library. That way addons can specify to which editors
         * they should be added in general. The PHP implementation hard-codes
         * this list into the server, which we want to avoid here.
         */
        player?: {
            /**
             * A list of machine names in which the addon should be added.
             */
            machineNames: string[];
        };
    };
    author?: string;
    /**
     * The core API required to run the library.
     */
    coreApi?: { majorVersion: number; minorVersion: number };
    description?: string;
    dropLibraryCss?: { machineName: string }[];
    dynamicDependencies?: ILibraryName[];
    editorDependencies?: ILibraryName[];
    embedTypes?: ('iframe' | 'div')[];
    fullscreen?: 0 | 1;
    h?: number;
    license?: string;
    metadataSettings?: {
        disable: 0 | 1;
        disableExtraTitleField: 0 | 1;
    };
    preloadedCss?: IPath[];
    preloadedDependencies?: ILibraryName[];
    preloadedJs?: IPath[];
    runnable: boolean | 0 | 1;
    title: string;
    w?: number;
    requiredExtensions?: {
        sharedState: number;
    };
    state?: {
        snapshotSchema: boolean;
        opSchema: boolean;
        snapshotLogicChecks: boolean;
        opLogicChecks: boolean;
    };
}

/**
 * Persists any arbitrarily nested objects to some kind storage.
 * Used to store settings and temporary data that needs to be retrieved later.
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

/**
 * This is the data sent to the H5P Hub when the local installation (site) registers itself there.
 */
export interface IRegistrationData {
    /**
     * The core API version that the site supports (e.g. 1.24). Unknown if the hub only reports back content
     * types that work for this core version.
     */
    core_api_version: string;
    /**
     * Purpose unknown.
     */
    disabled: 0 | 1;
    /**
     * The version of the H5P PHP library. As we only imitate the PHP library, this doesn't really apply here.
     * Probably used for statistical purposes. It makes sense to use the version of the core client JS files here.
     */
    h5p_version: string;
    /**
     * An integer that identifies the site. You can for example use a crc32 hash of the local installation path.
     * The purpose of the id is unknown.
     */
    local_id: string;
    /**
     * The name of the H5P implementation.
     */
    platform_name: string;
    /**
     * The version of the H5P implementation.
     */
    platform_version: string;
    /**
     * Tells the H5P Hub in what network the installation operates. Probably used for statistical
     * purposes.
     */
    type: 'local' | 'network' | 'internet';
    /**
     * The unique id that is used to re-identify this site at the Hub later.
     * Can be '' when the site is doing the registration for the first time.
     * Later it should be the value that is received back from the H5P Hub.
     */
    uuid: string;
}

/**
 * This is the usage statistics sent to the H5P Hub, when the option is enabled.
 * NOTE: Not implemented yet.
 */
export interface IUsageStatistics {
    /**
     * Statistical information about every installed library. The key is the library uber name
     * with a whitespace instead of a hyphen as separator between machine name and
     * major version (e.g. H5P.Example 1.0).
     */
    libraries: { [key: string]: ILibraryUsageStatistics };
    /**
     * The number of active authors
     */
    num_authors: number;
}

/**
 * Used to send statistical information about the usage of the library to the H5P Hub.
 * NOTE: This functionality is not implemented yet.
 */
export interface ILibraryUsageStatistics {
    /**
     * The number of content objects created for this library
     */
    content: number;
    /**
     * The number of 'created' events from the log. (Can probably be different from 'content'
     * as content objects can also be deleted again.)
     */
    created: number;
    /**
     * The number of 'createdUpload' events from the log
     */
    createdUpload: number;
    /**
     * The number of 'deleted' events from the log
     */
    deleted: number;
    /**
     * The number of 'loaded' events (= views?) from log.
     */
    loaded: number;
    /**
     * Used patch version
     */
    patch: number;
    /**
     * The number of 'resultViews' events from log
     */
    resultViews: number;
    /**
     * The number of 'shortcode insert' events from log (Unclear what this is)
     */
    shortcodeInserts: number;
}

/**
 * This resolver loads data about a local library.
 */
export type ILibraryLoader = (
    machineName: string,
    majorVersion: number,
    minorVersion: number
) => IInstalledLibrary;

export interface IH5PConfig {
    /**
     * URL prefix for all AJAX requests
     */
    ajaxUrl: string;
    /**
     * The prefix that is added to all URLs.
     */
    baseUrl: string;
    /**
     * Base path for content files (e.g. images). Used in the player and in the
     * editor.
     */
    contentFilesUrl: string;
    /**
     * Base path for content files (e.g. images) IN THE PLAYER. It MUST direct
     * to a URL at which the content files for THE CONTENT BEING DISPLAYED must
     * be accessible. This means it must include the contentId of the object!
     * You can insert the contentId using the placeholder {{contentId}}.
     *
     * Example: http://127.0.0.1:9000/s3bucket/{{contentId}}`
     *
     * You can use this URL to load content files from a different server, e.g.
     * S3 storage. Note that this only work for the player and not the editor.
     */
    contentFilesUrlPlayerOverride: string;

    /**
     * Time after which the content type cache is considered to be outdated in
     * milliseconds. User-configurable.
     */
    contentTypeCacheRefreshInterval: number;
    /**
     * If true, the content hub is enabled.
     */
    contentHubEnabled: boolean;
    /**
     * The URL of the Content Hub that is used to query content.
     */
    contentHubContentEndpoint: string;
    /**
     * The URL of the Content Hub at which you can retrieve metadata
     */
    contentHubMetadataEndpoint: string;
    /**
     * Time after which the content hub metadata is considered to be outdated in
     * milliseconds. User-configurable.
     */
    contentHubMetadataRefreshInterval: number;
    /**
     * URL prefix for content user data (e.g. the user state where a user left
     * off displaying H5P content)
     */
    contentUserDataUrl: string;
    /**
     * A list of file extensions allowed for content files. Contains file
     * extensions (without .) separated by whitespaces.
     */
    contentWhitelist: string;
    /**
     * This is the version of the H5P Core (JS + CSS) that is used by this
     * implementation. It is sent to the H5P Hub when registering there. Not
     * user-configurable and should not be changed by custom implementations.
     */
    coreApiVersion: {
        major: number;
        minor: number;
    };
    /**
     * Path to the H5P core files directory.
     */
    coreUrl: string;

    /**
     * Options that change the looks and behavior of H5P.
     */
    customization: {
        /**
         * Lists of JavaScript and CSS files that are added to the editor or
         * player. The URLs in the lists are directly appended to the list of
         * core scripts or styles without any modifications.
         */
        global: {
            editor?: {
                scripts?: string[];
                styles?: string[];
            };
            player?: {
                scripts?: string[];
                styles?: string[];
            };
        };
    };
    /**
     * If true, the fullscreen button will not be shown to the user.
     */
    disableFullscreen: boolean;
    /**
     * Path to the downloadable H5P packages.
     */
    downloadUrl: string;
    /**
     * You can specify which addons should be added to which library here.
     */
    editorAddons?: {
        /**
         * The property name is the machine mame to which to add addons. The
         * string array contains the machine names of addons that should be
         * added.
         */
        [machineName: string]: string[];
    };
    /**
     * Path to editor "core files"
     */
    editorLibraryUrl: string;
    /**
     * If set to true, the content types that require a Learning Record Store to
     * make sense are offered as a choice when the user creates new content.
     * User-configurable.
     */
    enableLrsContentTypes: boolean;
    /**
     * The maximum character count of paths of content files allowed when
     * exporting h5p packages. If files would be longer, paths are shortened.
     */
    exportMaxContentPathLength: number;
    /**
     * Unclear. Taken over from PHP implementation and sent to the H5P Hub when
     * registering the site. User-configurable.
     */
    fetchingDisabled: 0 | 1;
    /**
     * This is the version of the PHP implementation that the NodeJS
     * implementation imitates. Can be anything like 1.22.1 It is sent to the
     * H5P Hub when registering there. Not user-configurable and should not be
     * changed by custom implementations.
     */
    h5pVersion: string;
    /**
     * The URL called to fetch information about the content types available at
     * the H5P Hub. User-configurable.
     */
    hubContentTypesEndpoint: string;
    /**
     * The URL called to register the running instance at the H5P Hub.
     * User-configurable.
     */
    hubRegistrationEndpoint: string;
    /**
     * The URL of the library files (= content types).
     */
    librariesUrl: string;
    /**
     * (optional) You can set server-wide custom settings for some libraries by
     * setting the values here. As far as we know, this is currently only
     * supported by H5P.MathDisplay. See
     * https://h5p.org/mathematical-expressions for more information.
     */
    libraryConfig?: { [machineName: string]: any };
    /**
     * A list of file extensions allowed for library files. (File extensions
     * without . and separated by whitespaces.) (All extensions allowed for
     * content files are also automatically allowed for libraries).
     */
    libraryWhitelist: string;
    /**
     * The list of content types that are enabled when enableLrsContentTypes is
     * set to true. Not user-configurable.
     */
    lrsContentTypes: string[];
    /**
     * The maximum allowed file size of content and library files (in bytes).
     */
    maxFileSize: number;
    /**
     * The maximum allowed file size of all content and library files in an
     * uploaded h5p package (in bytes).
     */
    maxTotalSize: number;
    /**
     * The Url at which the parameters of a piece of content can be retrieved
     */
    paramsUrl: string;
    /**
     * This is the name of the H5P implementation sent to the H5P for
     * statistical reasons. Not user-configurable but should be overridden by
     * custom custom implementations.
     */
    platformName: string;
    /**
     * This is the version of the H5P implementation sent to the H5P when
     * registering the site. Not user-configurable but should be overridden by
     * custom custom implementations.
     */
    platformVersion: string;
    /**
     * You can specify which addons should be added to which library in the
     * player here.
     */
    playerAddons?: {
        /**
         * The property name is the machine mame to which to add addons. The
         * string array contains the machine names of addons that should be
         * added.
         */
        [machineName: string]: string[];
    };
    /**
     * The Url at which content can be displayed.
     */
    playUrl: string;
    /**
     * Allows settings a http(s) proxy for outgoing requests. No proxy will be
     * used if left undefined (or the one specified in the HTTPS_PROXY
     * environment variable).
     */
    proxy?: {
        /**
         * The hostname of the proxy without any protocol prefix (e.g. only
         * 10.1.2.3)
         */
        host: string;
        /**
         * The port of the proxy, e.g. 8080.
         */
        port: number;
        /**
         * The protocol to use to access the proxy. Can be left undefined if
         * http is used.
         */
        protocol?: 'http' | 'https';
    };
    /*
     * How often the user state of content is saved (in milliseconds). Set to false
     * to disable saving user state. Note that the user state is only saved if
     * the user object is passed into the render method of the player. You also
     * must set ajax.contentUserData for state saving to work.
     */
    contentUserStateSaveInterval: number | boolean;
    /**
     * If true, the instance will send usage statistics to the H5P Hub whenever
     * it looks for new content types or updates. User-configurable.
     */
    sendUsageStatistics: boolean;
    /**
     * URL prefix for the finished URL (the URL to which requests are sent when
     * the user has finished content)
     */
    setFinishedUrl: string;

    /**
     * If true, the H5P client is told to send data about users finished a
     * content object to the server. (This is the custom H5P setFinished report,
     * not an xAPI statement)
     */
    setFinishedEnabled: boolean;
    /**
     * Indicates on what kind of network the site is running. Can be "local",
     * "network" or "internet". TODO: This value should not be
     * user-configurable, but has to be determined by the system on startup. (If
     * possible.)
     */
    siteType: 'local' | 'network' | 'internet';
    /*
     * Temporary files will be deleted after this time. (in milliseconds)
     */
    temporaryFileLifetime: number;
    /**
     * The URL path of temporary file storage (used for image, video etc.
     * uploads of unsaved content).
     */
    temporaryFilesUrl: string;

    uuid: string;

    /**
     * Loads all changeable settings from storage. (Should be called when the
     * system initializes.)
     */
    load(): Promise<any>;
    /**
     * Saves all changeable settings to storage. (Should be called when a
     * setting was changed.)
     */
    save(): Promise<void>;

    /**
     * The number of milliseconds that code has until a single library is
     * installed. If this time is exceeded the lock will be freed and the
     * library installation has failed.
     */
    installLibraryLockMaxOccupationTime: number;

    /**
     * How long to wait until a lock is acquired when installing a single
     * library.
     */
    installLibraryLockTimeout: number;
}

/**
 * Describes as file that is stored temporarily (for uploads of unsaved content)
 */
export interface ITemporaryFile {
    /**
     * Indicates when the temporary file should be deleted.
     */
    expiresAt: Date;
    /**
     * The name by which the file can be identified; can be a path including subdirectories (e.g. 'images/xyz.png')
     */
    filename: string;
    /**
     * The user who is allowed to access the file
     */
    ownedByUserId: string;
}

/**
 * Stores files uploaded by the user in temporary storage. Note that filenames can be paths like
 * 'images/xyz.png'!
 */
export interface ITemporaryFileStorage {
    /**
     * Deletes the file from temporary storage (e.g. because it has expired)
     * @param filename the filename; can be a path including subdirectories
     * (e.g. 'images/xyz.png')
     * @param ownerId (optional) when there is no user deleting, you must specify who the
     * owner of the temporary file is; only needed when userId is null
     * @returns true if deletion was successful
     */
    deleteFile(filename: string, ownerId: string): Promise<void>;

    /**
     * Checks if a file exists in temporary storage.
     * @param filename the filename to check; can be a path including subdirectories (e.g. 'images/xyz.png')
     * @param user the user for who to check
     * @returns true if file already exists
     */
    fileExists(filename: string, user: IUser): Promise<boolean>;

    /**
     * Returns a information about a temporary file.
     * Throws an exception if the file does not exist.
     * @param filename the relative path inside the library
     * @param user the user who wants to access the file
     * @returns the file stats
     */
    getFileStats(filename: string, user: IUser): Promise<IFileStats>;

    /**
     * Returns the contents of a file.
     * Must check for access permissions and throw an H5PError if a file is not accessible.
     * @param filename the filename; can be a path including subdirectories (e.g. 'images/xyz.png')
     * @param user the user who accesses the file
     * @param rangeStart (optional) the position in bytes at which the stream should start
     * @param rangeEnd (optional) the position in bytes at which the stream should end
     * @returns the stream containing the file's content
     */
    getFileStream(
        filename: string,
        user: IUser,
        rangeStart?: number,
        rangeEnd?: number
    ): Promise<Readable>;

    /**
     * Returns a list of files in temporary storage for the specified user.
     * If the user is undefined or null, lists all files in temporary storage.
     * @param user (optional) Only list files for the user. If left out, will list all temporary files.
     * @returns a list of information about the files
     */
    listFiles(user?: IUser): Promise<ITemporaryFile[]>;

    /**
     * Removes invalid characters from filenames and enforces other filename
     * rules required by the storage implementation (e.g. filename length
     * restrictions).
     * @param filename the filename to sanitize
     * @returns the clean filename
     */
    sanitizeFilename?(filename: string): string;

    /**
     * Stores a file. Only the user who stores the file is allowed to access it later.
     * @param filename the filename by which the file will be identified later; can be a path including subdirectories (e.g. 'images/xyz.png')
     * @param dataStream the stream containing the file's data
     * @param user the user who is allowed to access the file
     * @param expirationTime when the file ought to be deleted
     * @returns an object containing information about the stored file; undefined if failed
     */
    saveFile(
        filename: string,
        dataStream: ReadStream,
        user: IUser,
        expirationTime: Date
    ): Promise<ITemporaryFile>;
}

/**
 * This function returns the (relative) URL at which a file inside a library
 * can be accessed. It is used when URLs of library files must be inserted
 * (hard-coded) into data structures. The implementation must do this file ->
 * URL resolution, as it decides where the files can be accessed.
 */
export type ILibraryFileUrlResolver = (
    library: ILibraryName,
    filename: string
) => string;

/**
 * This objects carries information about content types that the user can select
 * from the H5P Hub. The optional properties don't have to be set if a content type
 * is only installed locally.
 */
export interface IHubContentType {
    categories?: string[];
    createdAt?: number;
    description: string;
    example?: string;
    h5pMajorVersion?: number;
    h5pMinorVersion?: number;
    icon: string;
    isRecommended?: boolean;
    keywords?: string[];
    license?: any;
    machineName: string;
    majorVersion: number;
    minorVersion: number;
    owner: string;
    patchVersion: number;
    popularity?: number;
    screenshots?: any;
    summary?: string;
    title: string;
    tutorial?: string;
    updatedAt?: number;
}

/**
 * Carries information about the local installation status of a content type.
 */
export interface IHubContentTypeWithLocalInfo extends IHubContentType {
    canInstall: boolean;
    installed: boolean;
    isUpToDate: boolean;
    localMajorVersion: number;
    localMinorVersion: number;
    localPatchVersion: number;
    restricted: boolean;
}

/**
 * Information about the H5P Hub
 */
export interface IHubInfo {
    apiVersion: { major: number; minor: number };
    details: Array<{ code: string; message: string }>;
    libraries: IHubContentTypeWithLocalInfo[];
    outdated: boolean;
    recentlyUsed: any[];
    user: string;
}

export interface IPlayerModel {
    contentId: ContentParameters;
    dependencies: ILibraryName[];
    downloadPath: string;
    embedTypes: ('iframe' | 'div')[];
    integration: IIntegration;
    scripts: string[];
    styles: string[];
    translations: any;
    user: IUser;
}

export interface IEditorModel {
    integration: IIntegration;
    scripts: string[];
    styles: string[];
    urlGenerator: IUrlGenerator;
}

export interface IUrlGenerator {
    ajaxEndpoint(user: IUser): string;
    baseUrl(): string;
    /**
     * Generates a URL at which the resources of the content can be loaded.
     * Should be undefined if the default content serving mechanism is used. You
     * only have to return a URL here if you want to change the hostname of the
     * route, e.g. if the content files can be requested directly from S3 or a
     * CDN.
     * @param contentId
     * @returns the URL or undefined (Example:
     * http://127.0.0.1:9000/s3bucket/123`)
     */
    contentFilesUrl(contentId: ContentId): string | undefined;
    /**
     * Generates a URL to which the user data can be sent.
     * @param user the user who is currently accessing the h5p object
     * @param contextId allows implementation to have multiple user data objects
     * for one h5p content object
     */
    contentUserData(
        user: IUser,
        contextId?: string,
        asUserId?: string,
        options?: { readonly?: boolean }
    ): string;
    coreFile(file: string): string;
    coreFiles(): string;
    downloadPackage(contentId: ContentId): string;
    editorLibraryFile(file: string): string;
    editorLibraryFiles(): string;
    libraryFile(library: IFullLibraryName, file: string): string;
    parameters(): string;
    play(): string;
    setFinished(user: IUser): string;
    temporaryFiles(): string;
    /**
     * Generates a URL by which the content can be globally identified (or
     * accessed). The URL is used when generating ids for object in xAPI
     * statements, so it could also be a fake URL that is only used to uniquely
     * identify the content. It could also simply be the contentId. (default
     * behavior) If you store the generated xAPI statement in a neutral LRS and
     * users will see or be able to click the URL, you should customize the URL
     * by overriding this method.
     * @param contentId
     */
    uniqueContentUrl(contentId: ContentId): string;
}

/**
 * The translation function is called to retrieve translation for keys.
 * @param key the key for which a translation should be returned; Note that his
 * is not the English string, but a identifier that can also be prefixed with a
 * namespace (we follow the convention of the npm package i18next here).
 * Examples:
 *   - namespace1:key1
 *   - anothernamespace:a-somewhat-longer-key
 * @param language the language code to translate to (ISO 639-1)
 * @returns the translated string
 */
export type ITranslationFunction = (key: string, language: string) => string;

export interface ILibraryAdministrationOverviewItem {
    canBeDeleted: boolean;
    canBeUpdated: boolean;
    dependentsCount: number;
    instancesAsDependencyCount: number;
    instancesCount: number;
    isAddon: boolean;
    machineName: string;
    majorVersion: number;
    minorVersion: number;
    patchVersion: number;
    restricted: boolean;
    runnable: boolean;
    title: string;
}

/**
 * The options that can be passed to the constructor of H5PEditor
 */
export interface IH5PEditorOptions {
    /**
     * Enables customization of looks and behavior See the documentation page on
     * customization for more details.
     */
    customization?: {
        /**
         * This hook is called when the editor creates the list of files that
         * are loaded when displaying the editor for a library.
         * Note: This function should be immutable, so it shouldn't change the
         * scripts and styles parameters but create new arrays!
         * @param library the library that is currently being loaded
         * @param scripts the original list of scripts that will be loaded
         * @param styles the original list of styles that will be loaded
         * @returns the altered lists of scripts and styles
         */
        alterLibraryFiles?: (
            library: ILibraryName,
            scripts: string[],
            styles: string[]
        ) => { scripts: string[]; styles: string[] };
        /**
         * This hook is called when the editor retrieves the language file of a
         * library in a specific language. You can change the language file in
         * the hook, e.g. by adding or removing entries.
         * Note: This function should be immutable, so it shouldn't change the
         * languageFile parameter but return a clone!
         * Note: If you change the semantic structure of a library, you must
         * also change the language files by using the this hook!
         * @param library the library that is currently being loaded
         * @param languageFile the original language file
         * @param language the language for which the entries should be changed
         * @returns the changed language file
         */
        alterLibraryLanguageFile?: (
            library: ILibraryName,
            languageFile: ILanguageFileEntry[],
            language: string
        ) => ILanguageFileEntry[];
        /**
         * This hook is called when the editor retrieves the semantics of a
         * library. You can change the semantics in the hook, e.g. by adding or
         * removing entries.
         * Note: This function should be immutable, so it shouldn't change the
         * semantics parameter but return a clone!
         * Note: If you change the semantic structure of a library, you must
         * also change its language files by using the
         * `alterLibraryLanguageFile` hook!
         * @param library the library that is currently being loaded
         * @param semantics the original semantic structure
         * @returns the changed semantic structure
         */
        alterLibrarySemantics?: (
            library: ILibraryName,
            semantics: ISemanticsEntry[]
        ) => ISemanticsEntry[];
        /**
         * Lists of JavaScript and CSS files that should always be appended to
         * the list of core editor files.
         */
        global?: {
            scripts?: string[];
            styles?: string[];
        };
    };
    /**
     * If true, the system will localize the information about content types
     * displayed in the H5P Hub. It will use the translationCallback that is
     * passed to H5PEditor for this by getting translations from the namespace
     * 'hub'. It will try to localize these language strings:
     * hub:H5P_Example.description
     * hub:H5P_Example.summary
     * hub:H5P_Example.keywords.key_word1
     * hub:H5P_Example.keywords.key_word2
     * hub:H5P_Example.keywords. ...
     * Note that "H5P_Example" is a transformed version of the machineName of
     * the content type main library, in which . is replaced by _. In the key
     * words whitespaces are replaced by _.
     */
    enableHubLocalization?: boolean;
    /**
     * If true, the system will localize library titles. It will use the
     * translationCallback that is passed to H5PEditor for this by getting
     * translations from the namespace 'library-metadata'. It will try to
     * localize these language strings:
     * hub:H5P_Example.title
     * Note that "H5P_Example" is a transformed version of the machineName of
     * the content type main library, in which . is replaced by _. In the key
     * words whitespaces are replaced by _.
     */
    enableLibraryNameLocalization?: boolean;

    /**
     * A lock provider to use. By default, the library uses a single-process
     * lock. You must pass in a distributed lock implementation if the library
     * is used in a multi-process or cluster environment.
     */
    lockProvider?: ILockProvider;

    /**
     * Hooks allow you to react to things happening in the library.
     */
    hooks?: {
        contentWasDeleted?: (contentId: string, user: IUser) => Promise<void>;
        contentWasUpdated?: (
            contentId: string,
            metadata: IContentMetadata,
            parameters: any,
            user: IUser
        ) => Promise<void>;
        contentWasCreated?: (
            contentId: string,
            metadata: IContentMetadata,
            parameters: any,
            user: IUser
        ) => Promise<void>;
    };

    /**
     * Allows you to inject custom machine ids. This id is sent to the H5P.org
     * Hub server when registering to get a UUID for the local instance or when
     * refreshing the list of available content types.
     *
     * By default the server gets an ID for the local machine by calling
     * node-machine-id, so you don't have to use the override. There are cases
     * in which calling node-machine-id might not work, so you can use the
     * override.
     */
    getLocalIdOverride?: () => string;

    permissionSystem?: IPermissionSystem;
}

/**
 * The options that can be passed to the constructor of H5PPlayer
 */
export interface IH5PPlayerOptions {
    /**
     * Enables customization of looks and behavior See the documentation page on
     * customization for more details.
     */
    customization?: {
        /**
         * This hook is called when the player creates the list of files that
         * are loaded when playing content with the library.
         * Note: This function should be immutable, so it shouldn't change the
         * scripts and styles parameters but create new arrays!
         * @param library the library that is currently being loaded
         * @param scripts the original list of scripts that will be loaded
         * @param styles the original list of styles that will be loaded
         * @returns the altered lists of scripts and styles
         */
        alterLibraryFiles?: (
            library: ILibraryName,
            scripts: string[],
            styles: string[]
        ) => { scripts: string[]; styles: string[] };
        /**
         * Lists of JavaScript and CSS files that should always be appended to
         * the list of core player files.
         */
        global?: {
            scripts?: string[];
            styles?: string[];
        };
    };

    /**
     * A lock provider to use. By default, the library uses a single-process
     * lock. You must pass in a distributed lock implementation if the library
     * is used in a multi-process or cluster environment.
     */
    lockProvider?: ILockProvider;
    permissionSystem?: IPermissionSystem;
}

/**
 * The structure of entries in language files. This is basically a subset of
 * translatable ISemanticsEntry properties.
 */
export interface ILanguageFileEntry {
    /**
     * The default value of the field.
     */
    default?: string;
    /**
     * An explanation text below the widget shown in the editor
     */
    description?: string;
    /**
     * (for list) The name for a single entity in a list.
     */
    entity?: string;
    /**
     * (in lists only) defines a single field type in the list
     */
    field?: ILanguageFileEntry;
    /**
     * (in groups only) a list of field definitions
     */
    fields?: ILanguageFileEntry[];
    /**
     * A help text that can be collapsed.
     */
    important?: {
        description: string;
        example: string;
    };
    /**
     * The text displayed in the editor for the entry.
     */
    label?: string;
    /**
     * (for select) the options to choose from
     */
    options?: any[] | { label: string }[];
    /**
     * The text displayed in a text box if the user has entered nothing so far.
     */
    placeholder?: string;
}

export interface IPostUserFinishedData {
    contentId: string;
    /**
     * The date/time when the content was finished.
     */
    finished: number;
    /**
     * The maximum score attainable
     */
    maxScore: number;
    /**
     * The date/time when the content was opened.
     */
    opened: number;
    /**
     * The score received.
     */
    score: number;
}

export interface IPostContentUserData {
    /**
     * The actual data. 0 if the data should be deleted.
     */
    data: any | 0;
    /**
     * Indicates that data should be invalidated when content changes.
     */
    invalidate: 0 | 1;
    /**
     * Indicates that data should be loaded when content is loaded.
     */
    preload: 0 | 1;
}

export interface IGetContentUserData extends IAjaxResponse {
    data: any;
}

/**
 * Offers locking a mechanism to prevent race conditions.
 */
export interface ILockProvider {
    /**
     *
     * @param key the key of the resource to lock
     * @param callback the code which should run once the lock was acquired
     * @param timeout how long to wait until the lock is acquired
     * @param maxOccupationTime how long to wait until the code in callback is
     * finished
     * @throws 'timeout' or 'occupation-time-exceed' errors
     */
    acquire<T>(
        key: string,
        callback: () => Promise<T>,
        options: { timeout: number; maxOccupationTime: number }
    ): Promise<T>;
}
