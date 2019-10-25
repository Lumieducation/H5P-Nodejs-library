import { ReadStream } from 'fs';
import { Stream } from 'stream';

/**
 * The content id identifies content objects in storage. The PHP implementation of H5P
 * uses integers for this, we try to use strings. This might change in the future, if it
 * turns out that the H5P editor client doesn't work with string ids.
 */
export type ContentId = string;

/**
 * Permissions give rights to users to do certain actions with a piece of content.
 */
export enum Permission {
    Delete,
    Download,
    Edit,
    Embed,
    View
}

/**
 * Assets are files required by a library to work. These include JavaScript, CSS files and translations.
 */
export interface IAssets {
    scripts: string[];
    styles: string[];
    translations: object;
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
     * The major version of the libray (e.g. 1)
     */
    majorVersion: number;
    /**
     * The minor version of the library (e.g. 0)
     */
    minorVersion: number;
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
export interface IContentMetadata {
    author?: string;
    authors?: IContentAuthor[];
    autorComments?: string;
    changes?: IContentChange[];
    contentType?: string;
    dynamicDependencies?: ILibraryName[];
    editorDependencies?: ILibraryName[];
    embedTypes?: 'iframe' | 'div';
    h?: string;
    language: string;
    license?: string;
    licenseExtras?: string;
    licenseVersion?: string;
    mainLibrary: string;
    metaDescription?: string;
    metaKeywords?: string;
    preloadedDependencies: ILibraryName[];
    source?: string;
    title: string;
    w?: string;
    yearsFrom?: string;
    yearsTo?: string;
}

/**
 * The integration object is used to pass information to the H5P JavaScript
 * client running in the browser about certain settings and values of the
 * server.
 */
export interface IIntegration {
    ajax: {
        contentUserData: string;
        setFinished: string;
    };
    ajaxPath: string;
    contents?: any;
    editor?: IEditorIntegration;
    hubIsEnabled: boolean;
    l10n: object;
    postUserStatistics: boolean;
    /**
     * Set to false to disable saving user state.
     */
    saveFreq: number | boolean;
    url: string;
    user: {
        mail: string;
        name: string;
    };
}

/**
 * The editor integration object is used to pass information to the H5P JavaScript
 * editor client about settings and constants of the server.
 */
export interface IEditorIntegration {
    ajaxPath: string;
    assets: {
        css: string[];
        js: string[];
    };
    filesPath: string;
    libraryUrl: string;
}

/**
 * This descripes the Path of JavaScript and CSS files in a library.json file.
 * This single property interface exists because the library.json file expects
 * this format.
 */
export interface IPath {
    path: string;
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
    css: string[];
    defaultLanguage: string;
    javascript: string[];
    language: any;
    languages: string[];
    name: string;
    preloadedCss?: IPath[];
    preloadedJs?: IPath[];
    semantics: any;
    translations: any;
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
    runnable: boolean;
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
     * If true, the user can create content of content types that are set to "restricted".
     */
    canCreateRestricted: boolean;
    /**
     * If true, the user can install content types from the hub that are set the "recommended"
     * by the Hub.
     */
    canInstallRecommended: boolean;
    /**
     * If true, the user can generally install and update libraries. This includes Hub
     * content types that aren't set to "recommended" or uploading custom packages.
     */
    canUpdateAndInstallLibraries: boolean;
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
 * Implementations need to implement the IContentStorage interface and pass it to the constructor of
 * H5PEditor.
 * It is used to persist content data (semantic data, images, videos etc.) permanently.
 * See the FileContentStorage sample implementation in the examples directory for more details.
 */
export interface IContentStorage {
    /**
     * Adds a content file to an existing content object. The content object has to be created with createContent(...) first.
     * @param id The id of the content to add the file to
     * @param filename The filename INSIDE the content folder
     * @param stream A readable stream that contains the data
     * @param user The user who owns this object
     */
    addContentFile(
        contentId: ContentId,
        localPath: string,
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
     * Creates a content object in the repository. Content files (like images) are added to it later
     * with addContentFile(...).
     * Throws an error if something went wrong. In this case the calling method will remove all traces of
     * the content and all changes are reverted.
     * @param metadata The content metadata of the content (= h5p.json)
     * @param content the content object (= content/content.json)
     * @param user The user who owns this object.
     * @param id (optional) The content id to use
     * @returns The newly assigned content id
     */
    createContent(
        metadata: IContentMetadata,
        content: any,
        user: IUser,
        contentId?: ContentId
    ): Promise<ContentId>;

    /**
     * Generates a unique content id that hasn't been used in the system so far.
     * @returns A unique content id
     */
    createContentId(): Promise<ContentId>;

    /**
     * Deletes a content object and all its dependent files from the repository.
     * Throws errors if something goes wrong.
     * @param id The content id to delete.
     * @param user The user who wants to delete the content
     */
    deleteContent(contentId: ContentId, user?: IUser): Promise<void>;

    /**
     * Gets the filenames of files added to the content with addContentFile(...) (e.g. images, videos or other files)
     * @param contentId the piece of content
     * @param user the user who wants to access the piece of content
     * @returns a list of files that are used in the piece of content (does not include the content directory!), e.g. ['image1.png', 'video2.mp4']
     */
    getContentFiles(contentId: ContentId, user: IUser): Promise<string[]>;

    /**
     * Returns a readable stream of a content file (e.g. image or video) inside a piece of content
     * NOTE: THIS METHOD IS NOT ASYNC!
     * @param id the id of the content object that the file is attached to
     * @param filename the filename of the file to get (you have to add the "content/" directory if needed)
     * @param user the user who wants to retrieve the content file
     * @returns the stream (that can be used to send the file to the user)
     */
    getContentFileStream(
        contentId: ContentId,
        file: string,
        user: IUser
    ): ReadStream;

    /**
     * Returns an array of permissions that the user has on the piece of content
     * @param contentId the content id to check
     * @param user the user who wants to access the piece of content
     * @returns the permissions the user has for this content (e.g. download it, delete it etc.)
     */
    getUserPermissions(
        contentId: ContentId,
        user: IUser
    ): Promise<Permission[]>;
}

/**
 * Implementations need to implement the ILibraryStorage interface and pass it to H5PEditor.
 * It is used to persist library information and files permanently.
 * Note that the library metadata and semantics are accessed regularly, so caching them is a good idea.
 * The library files will also be accessed frequently, so it makes sense to keep them in memory and not
 * access a harddisk every time they are downloaded.
 * See the FileLibraryStorage sample implementation in the examples directory for more details.
 */
export interface ILibraryStorage {
    /**
     * Adds a library file to a library. The library metadata must have been installed with installLibrary(...) first.
     * Throws an error if something unexpected happens. In this case the method calling addLibraryFile(...) will clean
     * up the partly installed library.
     * @param library The library that is being installed
     * @param filename Filename of the file to add, relative to the library root
     * @param stream The stream containing the file content
     * @returns true if successful
     */
    addLibraryFile(
        library: ILibraryName,
        fileLocalPath: string,
        readStream: Stream
    ): Promise<boolean>;

    /**
     * Removes all files of a library. Doesn't delete the library metadata. (Used when updating libraries.)
     * @param library the library whose files should be deleted
     */
    clearLibraryFiles(library: ILibraryName): Promise<void>;

    /**
     * Check if the library contains a file.
     * @param library The library to check
     * @param filename
     * @returns true if file exists in library, false otherwise
     */
    fileExists(library: ILibraryName, filename: string): Promise<boolean>;

    /**
     * Returns a readable stream of a library file's contents.
     * Throws an exception if the file does not exist.
     * NOTE: THIS METHOD IS NOT ASYNC!
     * @param library library
     * @param filename the relative path inside the library
     * @returns a readable stream of the file's contents
     */
    getFileStream(library: ILibraryName, file: string): ReadStream;

    /**
     * Returns the id of an installed library.
     * @param library The library to get the id for
     * @returns the id or undefined if the library is not installed
     */
    getId(library: ILibraryName): Promise<number>;

    /**
     * Returns all installed libraries or the installed libraries that have the machine names in the arguments.
     * @param machineNames (optional) only return libraries that have these machine names
     * @returns the libraries installed
     */
    getInstalled(...machineNames: string[]): Promise<ILibraryName[]>;

    /**
     * Gets a list of installed language files for the library.
     * @param library The library to get the languages for
     * @returns The list of JSON files in the language folder (without the extension .json)
     */
    getLanguageFiles(library: ILibraryName): Promise<string[]>;

    /**
     * Adds the metadata of the library to the repository and assigns a new id to the installed library.
     * This dea is used later when the library must be referenced somewhere.
     * Throws errors if something goes wrong.
     * @param libraryMetadata The library metadata object (= content of library.json)
     * @param restricted True if the library can only be used be users allowed to install restricted libraries.
     * @returns The newly created library object to use when adding library files with addLibraryFile(...)
     */
    installLibrary(
        libraryData: ILibraryMetadata,
        restricted: boolean
    ): Promise<IInstalledLibrary>;

    /**
     * Gets a list of all library files that exist for this library.
     * @param library
     * @returns all files that exist for the library
     */
    listFiles(library: ILibraryName): Promise<string[]>;

    /**
     * Removes the library and all its files from the repository.
     * Throws errors if something went wrong.
     * @param library The library to remove.
     */
    removeLibrary(library: ILibraryName): Promise<void>;

    /**
     * Updates the library metadata. This is necessary when updating to a new patch version.
     * After this clearLibraryFiles(...) is called by the LibraryManager to remove all old files.
     * The next step is to add the patched files with addLibraryFile(...).
     * @param libraryMetadata the new library metadata
     * @returns The updated library object
     */
    updateLibrary(
        libraryMetadata: ILibraryMetadata
    ): Promise<IInstalledLibrary>;
}

/**
 * This is the actual "content itself", meaning the object contained in content.json. It is
 * created by the JavaScript editor client and played out by the JavaScript player. Its structure
 * can vary depending on the semantics associated with the main library of the content.
 */
export type ContentParameters = any;

/**
 * This is an entry in the semantics of a library. The semantics define who content parameters
 * must look like.
 *
 * Note: There are many more attributes to entries of semantics.json. See https://h5p.org/semantics
 * for a full reference.
 */
export interface ISemanticsEntry {
    /**
     * The text displayed in the editor for the entry. (localizable)
     */
    label: string;
    /**
     * The internal name (e.g. for referencing it in code)
     */
    name: string;
}

/**
 * Objects of this interface represent installed libraries that have an id.
 */
export interface IInstalledLibrary extends ILibraryMetadata {
    /**
     * The id used internally to identify the library. Must be unique and assigned when the
     * library is installed. Libraries whose machine name is identical but that have different
     * major or minor version must also have different ids, while libraries that only differ in
     * patch versions can have the same id (as they can't co-exist).
     */
    id: number;
    /**
     * Unknown. Check if obsolete and to be removed.
     */
    libraryId: number;
    /**
     * If set to true, the library can only be used be users who have this special
     * privilege.
     */
    restricted: boolean;

    /**
     * Compares libraries by giving precedence to title, then major version, then minor version
     * @param otherLibrary
     */
    compare(otherLibrary: ILibraryMetadata): number;

    /**
     * Compares libraries by giving precedence to major version, then minor version, then patch version.
     * @param otherLibrary
     */
    compareVersions(otherLibrary: ILibraryMetadata): number;
}

/**
 * This interface represents the structure of library.json files.
 */
export interface ILibraryMetadata extends ILibraryName {
    author?: string;
    /**
     * The core API required to run the library.
     */
    coreApi?: { majorVersion: number; minorVersion: number };
    description?: string;
    // tslint:disable-next-line: prefer-array-literal
    dropLibraryCss?: Array<{ machineName: string }>;
    dynamicDependencies?: ILibraryName[];
    editorDependencies?: ILibraryName[];
    // tslint:disable-next-line: prefer-array-literal
    embedTypes?: Array<'iframe' | 'div'>;
    fullscreen?: 0 | 1;
    h?: number;
    license?: string;
    metadataSettings?: {
        disable: 0 | 1;
        disableExtraTitleField: 0 | 1;
    };
    patchVersion: number;
    preloadedCss?: IPath[];
    preloadedDependencies?: ILibraryName[];
    preloadedJs?: IPath[];
    runnable: boolean;
    title: string;
    w?: number;
}

/**
 * Persists any complex object to some storage. Used to store settings and temporary data that
 * needs to be retrieved later.
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
     * The core API version that the site supports (e.g. 1.22). Unknown if the hub only reports back content
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
 * The translation service localizes strings and performs replacements of variables.
 */
export interface ITranslationService {
    /**
     * Gets the literal for the identifier and performs replacements of placeholders / variables.
     * @param {string} id The identifier of the literal
     * @param {[key: string]: string} replacements An object with the replacement variables in key-value format.
     * Incidences of any key in this array are replaced with the corresponding value. Based
     * on the first character of the key, the value is escaped and/or themed:
     *    - !variable inserted as is
     *    - &#064;variable escape plain text to HTML
     *    - %variable escape text to HTML and theme as a placeholder for user-submitted content
     * @returns The literal translated into the language used by the user and with replacements.
     */
    getTranslation(
        id: string,
        replacements?: { [key: string]: string }
    ): string;
}

/**
 * This resolver loads data about a local library.
 */
export type ILibraryLoader = (
    machineName: string,
    majorVersion: number,
    minorVersion: number
) => IInstalledLibrary;

export interface IEditorConfig {
    /**
     * URL prefix for all AJAX requests
     */
    ajaxPath: string;
    /**
     * The prefix that is added to all URLs.
     */
    baseUrl: string;
    /**
     * Time after which the content type cache is considered to be outdated in milliseconds.
     * User-configurable.
     */
    contentTypeCacheRefreshInterval: number;
    /**
     * A list of file extensions allowed for content files.
     * Contains file extensions (without .) separated by whitespaces.
     */
    contentWhitelist: string;
    /**
     * This is the version of the H5P Core (JS + CSS) that is used by this implementation.
     * It is sent to the H5P Hub when registering there.
     * Not user-configurable and should not be changed by custom implementations.
     */
    coreApiVersion: {
        major: number;
        minor: number;
    };
    /**
     * If set to true, the content types that require a Learning Record Store to make sense are
     * offered as a choice when the user creates new content.
     * User-configurable.
     */
    enableLrsContentTypes: boolean;
    /**
     * Unclear. Taken over from PHP implementation and sent to the H5P Hub when registering the site.
     * User-configurable.
     */
    fetchingDisabled: 0 | 1;
    /**
     * base path for content files (e.g. images)
     */
    filesPath: string;
    /**
     * This is the version of the PHP implementation that the NodeJS implementation imitates.
     * It is sent to the H5P Hub when registering there.
     * Not user-configurable and should not be changed by custom implementations.
     */
    h5pVersion: string;
    /**
     * The URL called to fetch information about the content types available at the H5P Hub.
     * User-configurable.
     */
    hubContentTypesEndpoint: string;
    /**
     * The URL called to register the running instance at the H5P Hub.
     * User-configurable.
     */
    hubRegistrationEndpoint: string;
    /**
     * Path to editor "core files"
     */
    libraryUrl: string;
    /**
     * A list of file extensions allowed for library files. (File extensions without . and
     * separated by whitespaces.)
     * (All extensions allowed for content files are also automatically allowed for libraries).
     */
    libraryWhitelist: string;
    /**
     * The list of content types that are enabled when enableLrsContentTypes is set to true.
     * Not user-configurable.
     */
    lrsContentTypes: string[];
    /**
     * The maximum allowed file size of content and library files (in bytes).
     */
    maxFileSize: number;
    /**
     * The maximum allowed file size of all content and library files in an uploaded h5p package (in bytes).
     */
    maxTotalSize: number;
    /**
     * This is the name of the H5P implementation sent to the H5P for statistical reasons.
     * Not user-configurable but should be overridden by custom custom implementations.
     */
    platformName: string;
    /**
     * This is the version of the H5P implementation sent to the H5P when registering the site.
     * Not user-configurable but should be overridden by custom custom implementations.
     */
    platformVersion: string;
    /**
     * If true, the instance will send usage statistics to the H5P Hub whenever it looks for new content types or updates.
     * User-configurable.
     */
    sendUsageStatistics: boolean;
    /**
     * Indicates on what kind of network the site is running. Can be "local", "network" or "internet".
     * TODO: This value should not be user-configurable, but has to be determined by the system on startup.
     * (If possible.)
     */
    siteType: 'local' | 'network' | 'internet';
    /**
     * Used to identify the running instance when calling the H5P Hub.
     * User-configurable, but also automatically set when the Hub is first called.
     */
    uuid: string;

    /**
     * Loads all changeable settings from storage. (Should be called when the system initializes.)
     */
    load(): Promise<any>;
    /**
     * Saves all changeable settings to storage. (Should be called when a setting was changed.)
     */
    save(): Promise<void>;
}
