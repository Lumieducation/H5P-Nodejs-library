import { ReadStream } from 'fs';
import { Stream } from 'stream';
import fsExtra from 'fs-extra';
import { getAllFiles } from 'get-all-files';
import path from 'path';
import promisepipe from 'promisepipe';

import { streamToString } from '../../helpers/StreamHelpers';
import {
    ContentId,
    IContentMetadata,
    IContentStorage,
    IUser,
    Permission,
    ContentParameters,
    IFileStats,
    ILibraryName
} from '../../types';
import { checkFilename, sanitizeFilename } from './filenameUtils';
import { hasDependencyOn } from '../../helpers/DependencyChecker';
import H5pError from '../../helpers/H5pError';

/**
 * Persists content to the disk.
 */
export default class FileContentStorage implements IContentStorage {
    /**
     * Generates a unique content id that hasn't been used in the system so far.
     * @returns A unique content id
     */
    protected async createContentId(): Promise<ContentId> {
        let counter = 0;
        let id;
        let exists = false;
        do {
            id = FileContentStorage.getRandomInt(1, 2 ** 32);
            counter += 1;
            const p = path.join(this.getContentPath(), id.toString());
            exists = await fsExtra.pathExists(p);
        } while (exists && counter < 5); // try 5x and give up then
        if (exists) {
            throw new H5pError(
                'storage-file-implementations:error-generating-content-id'
            );
        }
        return id;
    }

    /**
     * Gets the base path of the content
     * @returns the base content-path
     */
    protected getContentPath(): string {
        return this.contentPath;
    }

    /**
     * @param contentPath The absolute path to the directory where the content
     * should be stored
     */
    constructor(
        protected contentPath: string,
        protected options?: {
            /**
             * These characters will be removed from files that are saved to S3.
             * There is a very strict default list that basically only leaves
             * alphanumeric filenames intact. Should you need more relaxed
             * settings you can specify them here.
             */
            invalidCharactersRegexp?: RegExp;
            /*
             * How long paths can be in the filesystem (Differs between Windows,
             * Linux and MacOS, so check out the limitation of your
             * system!)
             */
            maxPathLength?: number;
        }
    ) {
        fsExtra.ensureDirSync(contentPath);
        this.maxFileLength =
            (options?.maxPathLength ?? 255) - (contentPath.length + 1) - 23;
        // we subtract 23 for the contentId (12), unique ids appended to
        // the file (8) and path separators (3)

        if (this.maxFileLength < 20) {
            throw new Error(
                'The path of content directory is too long to add files to it. Put the directory into a different location.'
            );
        }
    }

    /**
     * Indicates how long files can be.
     */
    private maxFileLength: number;

    /**
     * Returns a random integer
     * @param min The minimum
     * @param max The maximum
     * @returns a random integer
     */
    private static getRandomInt(min: number, max: number): number {
        const finalMin = Math.ceil(min);
        const finalMax = Math.floor(max);
        return Math.floor(Math.random() * (finalMax - finalMin + 1)) + finalMin;
    }

    /**
     * Creates a content object in the repository. Add files to it later with
     * addContentFile(...). Throws an error if something went wrong. In this
     * case no traces of the content are left in storage and all changes are
     * reverted.
     * @param metadata The metadata of the content (= h5p.json)
     * @param content the content object (= content/content.json)
     * @param user The user who owns this object.
     * @param id (optional) The content id to use
     * @returns The newly assigned content id
     */
    public async addContent(
        metadata: IContentMetadata,
        content: any,
        user: IUser,
        id?: ContentId
    ): Promise<ContentId> {
        if (id === undefined || id === null) {
            id = await this.createContentId();
        }
        try {
            await fsExtra.ensureDir(
                path.join(this.getContentPath(), id.toString())
            );
            await fsExtra.writeJSON(
                path.join(this.getContentPath(), id.toString(), 'h5p.json'),
                metadata
            );
            await fsExtra.writeJSON(
                path.join(this.getContentPath(), id.toString(), 'content.json'),
                content
            );
        } catch (error) {
            await fsExtra.remove(
                path.join(this.getContentPath(), id.toString())
            );
            throw new H5pError(
                'storage-file-implementations:error-creating-content'
            );
        }
        return id;
    }

    /**
     * Adds a content file to an existing content object. The content object has
     * to be created with createContent(...) first.
     * @param id The id of the content to add the file to
     * @param filename The filename
     * @param stream A readable stream that contains the data
     * @param user The user who owns this object
     * @returns
     */
    public async addFile(
        id: ContentId,
        filename: string,
        stream: Stream,
        user: IUser
    ): Promise<void> {
        checkFilename(filename);
        if (
            !(await fsExtra.pathExists(
                path.join(this.getContentPath(), id.toString())
            ))
        ) {
            throw new H5pError(
                'storage-file-implementations:add-file-content-not-found',
                { filename, id },
                404
            );
        }

        const fullPath = path.join(
            this.getContentPath(),
            id.toString(),
            filename
        );
        await fsExtra.ensureDir(path.dirname(fullPath));
        const writeStream = fsExtra.createWriteStream(fullPath);
        await promisepipe(stream, writeStream);
    }

    /**
     * Checks if a piece of content exists in storage.
     * @param contentId the content id to check
     * @returns true if the piece of content exists
     */
    public async contentExists(contentId: ContentId): Promise<boolean> {
        return fsExtra.pathExists(
            path.join(this.getContentPath(), contentId.toString())
        );
    }

    /**
     * Deletes a content object and all its dependent files from the repository.
     * Throws errors if something goes wrong.
     * @param id The content id to delete.
     * @param user The user who wants to delete the content
     * @returns
     */
    public async deleteContent(id: ContentId, user?: IUser): Promise<void> {
        if (
            !(await fsExtra.pathExists(
                path.join(this.getContentPath(), id.toString())
            ))
        ) {
            throw new H5pError(
                'storage-file-implementations:delete-content-not-found',
                {},
                404
            );
        }

        await fsExtra.remove(path.join(this.getContentPath(), id.toString()));
    }

    /**
     * Deletes a file from a content object.
     * @param contentId the content object the file is attached to
     * @param filename the file to delete
     */
    public async deleteFile(
        contentId: ContentId,
        filename: string
    ): Promise<void> {
        checkFilename(filename);
        const absolutePath = path.join(
            this.getContentPath(),
            contentId.toString(),
            filename
        );
        if (!(await fsExtra.pathExists(absolutePath))) {
            throw new H5pError(
                'storage-file-implementations:delete-content-file-not-found',
                { filename },
                404
            );
        }
        await fsExtra.remove(absolutePath);
    }

    /**
     * Checks if a file exists.
     * @param contentId The id of the content to add the file to
     * @param filename the filename of the file to get
     * @returns true if the file exists
     */
    public async fileExists(
        contentId: ContentId,
        filename: string
    ): Promise<boolean> {
        checkFilename(filename);
        if (contentId !== undefined) {
            return fsExtra.pathExists(
                path.join(this.getContentPath(), contentId.toString(), filename)
            );
        }
        return false;
    }

    /**
     * Returns information about a content file (e.g. image or video) inside a
     * piece of content.
     * @param id the id of the content object that the file is attached to
     * @param filename the filename of the file to get information about
     * @param user the user who wants to retrieve the content file
     * @returns
     */
    public async getFileStats(
        id: ContentId,
        filename: string,
        user: IUser
    ): Promise<IFileStats> {
        if (!(await this.fileExists(id, filename))) {
            throw new H5pError(
                'content-file-missing',
                { filename, contentId: id },
                404
            );
        }
        return fsExtra.stat(
            path.join(this.getContentPath(), id.toString(), filename)
        );
    }

    /**
     * Returns a readable stream of a content file (e.g. image or video) inside
     * a piece of content
     * @param id the id of the content object that the file is attached to
     * @param filename the filename of the file to get
     * @param user the user who wants to retrieve the content file
     * @param rangeStart (optional) the position in bytes at which the stream
     * should start
     * @param rangeEnd (optional) the position in bytes at which the stream
     * should end
     * @returns
     */
    public async getFileStream(
        id: ContentId,
        filename: string,
        user: IUser,
        rangeStart?: number,
        rangeEnd?: number
    ): Promise<ReadStream> {
        if (!(await this.fileExists(id, filename))) {
            throw new H5pError(
                'content-file-missing',
                { filename, contentId: id },
                404
            );
        }
        return fsExtra.createReadStream(
            path.join(this.getContentPath(), id.toString(), filename),
            {
                start: rangeStart,
                end: rangeEnd
            }
        );
    }

    /**
     * Returns the content metadata (=h5p.json) for a content id
     * @param contentId the content id for which to retrieve the metadata
     * @param user (optional) the user who wants to access the metadata. If
     * undefined, access must be granted.
     * @returns the metadata
     */
    public async getMetadata(
        contentId: string,
        user?: IUser
    ): Promise<IContentMetadata> {
        return JSON.parse(
            await streamToString(
                await this.getFileStream(contentId, 'h5p.json', user)
            )
        );
    }

    /**
     * Returns the parameters (=content.json) for a content id
     * @param contentId the content id for which to retrieve the metadata
     * @param user (optional) the user who wants to access the metadata. If
     * undefined, access must be granted.
     * @returns the parameters
     */
    public async getParameters(
        contentId: string,
        user?: IUser
    ): Promise<ContentParameters> {
        return JSON.parse(
            await streamToString(
                await this.getFileStream(contentId, 'content.json', user)
            )
        );
    }

    /**
     * Calculates how often a library is in use.
     * @param library the library for which to calculate usage.
     * @returns asDependency: how often the library is used as subcontent in
     * content; asMainLibrary: how often the library is used as a main library
     */
    public async getUsage(
        library: ILibraryName
    ): Promise<{ asDependency: number; asMainLibrary: number }> {
        let asDependency = 0;
        let asMainLibrary = 0;

        const contentIds = await this.listContent();
        // We don't use Promise.all here as this would possibly overwhelm the
        // available memory space.
        for (const contentId of contentIds) {
            const contentMetadata = await this.getMetadata(contentId);
            const isMainLibrary =
                contentMetadata.mainLibrary === library.machineName;
            if (hasDependencyOn(contentMetadata, library)) {
                if (isMainLibrary) {
                    asMainLibrary += 1;
                } else {
                    asDependency += 1;
                }
            }
        }

        return { asDependency, asMainLibrary };
    }

    /**
     * Returns an array of permissions that the user has on the piece of content
     * @param contentId the content id to check
     * @param user the user who wants to access the piece of content
     * @returns the permissions the user has for this content (e.g. download it,
     * delete it etc.)
     */
    public async getUserPermissions(
        contentId: ContentId,
        user: IUser
    ): Promise<Permission[]> {
        return [
            Permission.Delete,
            Permission.Download,
            Permission.Edit,
            Permission.Embed,
            Permission.View
        ];
    }

    /**
     * Lists the content objects in the system (if no user is specified) or
     * owned by the user.
     * @param user (optional) the user who owns the content
     * @returns a list of contentIds
     */
    public async listContent(user?: IUser): Promise<ContentId[]> {
        const directories = await fsExtra.readdir(this.getContentPath());
        return (
            await Promise.all(
                directories.map(async (dir) => {
                    if (
                        !(await fsExtra.pathExists(
                            path.join(this.getContentPath(), dir, 'h5p.json')
                        ))
                    ) {
                        return '';
                    }
                    return dir;
                })
            )
        ).filter((content) => content !== '');
    }

    /**
     * Gets the filenames of files added to the content with addContentFile(...)
     * (e.g. images, videos or other files)
     * @param contentId the piece of content
     * @param user the user who wants to access the piece of content
     * @returns a list of files that are used in the piece of content, e.g.
     * ['image1.png', 'video2.mp4']
     */
    public async listFiles(
        contentId: ContentId,
        user: IUser
    ): Promise<string[]> {
        const contentDirectoryPath = path.join(
            this.getContentPath(),
            contentId.toString()
        );
        const contentDirectoryPathLength = contentDirectoryPath.length + 1;
        const absolutePaths = await getAllFiles(
            path.join(contentDirectoryPath)
        ).toArray();
        const contentPath = path.join(contentDirectoryPath, 'content.json');
        const h5pPath = path.join(contentDirectoryPath, 'h5p.json');
        return absolutePaths
            .filter((p) => p !== contentPath && p !== h5pPath)
            .map((p) => p.substr(contentDirectoryPathLength));
    }

    /**
     * Removes invalid characters from filenames and enforces other filename
     * rules required by the storage implementation (e.g. filename length
     * restrictions).
     * @param filename the filename to sanitize; this can be a relative path
     * (e.g. "images/image1.png")
     * @returns the clean filename
     */
    public sanitizeFilename = (filename: string): string => {
        return sanitizeFilename(
            filename,
            this.maxFileLength,
            this.options?.invalidCharactersRegexp
        );
    };
}
