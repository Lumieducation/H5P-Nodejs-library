import { Stream, Readable } from 'stream';
import * as path from 'path';
import fsExtra from 'fs-extra';
import getAllFiles from 'get-all-files';

import { ContentMetadata } from './ContentMetadata';
import {
    ContentId,
    ContentParameters,
    IContentMetadata,
    IContentStorage,
    IUser,
    Permission
} from './types';

import Logger from './helpers/Logger';

const log = new Logger('ContentManager');

/**
 * The ContentManager takes care of saving content and dependent files. It only contains storage-agnostic functionality and
 * depends on a ContentStorage object to do the actual persistence.
 */
export default class ContentManager {
    /**
     * @param contentStorage The storage object
     */
    constructor(public contentStorage: IContentStorage) {
        log.info('initialize');
        this.contentStorage = contentStorage;
    }

    /**
     * Adds a content file to an existing content object. The content object has to be created with createContent(...) first.
     * @param contentId The id of the content to add the file to
     * @param filename The name of the content file
     * @param stream A readable stream that contains the data
     * @param user The user who owns this object
     * @returns
     */
    public async addContentFile(
        contentId: ContentId,
        filename: string,
        stream: Stream,
        user: IUser
    ): Promise<void> {
        log.info(`adding file ${filename} to content ${contentId}`);
        return this.contentStorage.addFile(contentId, filename, stream, user);
    }

    /**
     * Checks if a piece of content exists.
     * @param contentId the content to check
     * @returns true if the piece of content exists
     */
    public async contentExists(contentId: ContentId): Promise<boolean> {
        log.debug(`checking if content ${contentId} exists`);
        return this.contentStorage.contentExists(contentId);
    }

    /**
     * Checks if a file exists.
     * @param contentId The id of the content to add the file to
     * @param filename the filename of the file to get
     * @returns true if the file exists
     */
    public contentFileExists = async (
        contentId: ContentId,
        filename: string
    ): Promise<boolean> => this.contentStorage.fileExists(contentId, filename);

    /**
     * Adds content from a H5P package (in a temporary directory) to the installation.
     * It does not check whether the user has permissions to save content.
     * @deprecated The method should not be used as it anymore, as there might
     * be issues with invalid filenames!
     * @param packageDirectory The absolute path containing the package (the directory containing h5p.json)
     * @param user The user who is adding the package.
     * @param contentId (optional) The content id to use for the package
     * @returns The id of the content that was created (the one passed to the method or a new id if there was none).
     */
    public async copyContentFromDirectory(
        packageDirectory: string,
        user: IUser,
        contentId?: ContentId
    ): Promise<{ id: ContentId; metadata: IContentMetadata; parameters: any }> {
        log.info(`copying content from directory ${packageDirectory}`);
        const metadata: IContentMetadata = await fsExtra.readJSON(
            path.join(packageDirectory, 'h5p.json')
        );
        const parameters: ContentParameters = await fsExtra.readJSON(
            path.join(packageDirectory, 'content', 'content.json')
        );
        const otherContentFiles: string[] = (
            await getAllFiles.async.array(
                path.join(packageDirectory, 'content')
            )
        ).filter(
            (file: string) =>
                path.relative(packageDirectory, file) !== 'content.json'
        );

        const newContentId: ContentId = await this.contentStorage.addContent(
            metadata,
            parameters,
            user,
            contentId
        );
        try {
            await Promise.all(
                otherContentFiles.map((file: string) => {
                    const readStream: Stream = fsExtra.createReadStream(file);
                    const localPath: string = path.relative(
                        path.join(packageDirectory, 'content'),
                        file
                    );
                    log.debug(`adding ${file} to ${packageDirectory}`);
                    return this.contentStorage.addFile(
                        newContentId,
                        localPath,
                        readStream
                    );
                })
            );
        } catch (error) {
            log.error(error);
            await this.contentStorage.deleteContent(newContentId);
            throw error;
        }
        return { id: newContentId, metadata, parameters };
    }

    /**
     * Creates a content object in the repository. Add files to it later with addContentFile(...).
     * @param metadata The metadata of the content (= h5p.json)
     * @param content the content object (= content/content.json)
     * @param user The user who owns this object.
     * @param contentId (optional) The content id to use
     * @returns The newly assigned content id
     */
    public async createOrUpdateContent(
        metadata: IContentMetadata,
        content: ContentParameters,
        user: IUser,
        contentId?: ContentId
    ): Promise<ContentId> {
        log.info(`creating content for ${contentId}`);
        return this.contentStorage.addContent(
            metadata,
            content,
            user,
            contentId
        );
    }

    /**
     * Deletes a piece of content and all files dependent on it.
     * @param contentId the piece of content to delete
     * @param user the user who wants to delete it
     */
    public async deleteContent(
        contentId: ContentId,
        user: IUser
    ): Promise<void> {
        return this.contentStorage.deleteContent(contentId, user);
    }

    /**
     * Deletes a file from a content object.
     * @param contentId the content object the file is attached to
     * @param filename the file to delete
     */
    public async deleteContentFile(
        contentId: ContentId,
        filename: string
    ): Promise<void> {
        return this.contentStorage.deleteFile(contentId, filename);
    }

    /**
     * Returns a readable stream of a content file (e.g. image or video) inside a piece of content
     * @param contentId the id of the content object that the file is attached to
     * @param filename the filename of the file to get
     * @param user the user who wants to retrieve the content file
     * @param rangeStart (optional) the position in bytes at which the stream should start
     * @param rangeEnd (optional) the position in bytes at which the stream should end
     * @returns
     */
    public async getContentFileStream(
        contentId: ContentId,
        filename: string,
        user: IUser,
        rangeStart?: number,
        rangeEnd?: number
    ): Promise<Readable> {
        log.debug(`loading ${filename} for ${contentId}`);

        return this.contentStorage.getFileStream(
            contentId,
            filename,
            user,
            rangeStart,
            rangeEnd
        );
    }

    /**
     * Returns the metadata (=contents of h5p.json) of a piece of content.
     * @param contentId the content id
     * @param user The user who wants to access the content
     * @returns
     */
    public async getContentMetadata(
        contentId: ContentId,
        user: IUser
    ): Promise<IContentMetadata> {
        // We don't directly return the h5p.json file content as
        // we have to make sure it conforms to the schema.
        return new ContentMetadata(
            await this.contentStorage.getMetadata(contentId, user)
        );
    }

    /**
     * Returns the content object (=contents of content/content.json) of a piece of content.
     * @param contentId the content id
     * @param user The user who wants to access the content
     * @returns
     */
    public async getContentParameters(
        contentId: ContentId,
        user: IUser
    ): Promise<ContentParameters> {
        return this.contentStorage.getParameters(contentId, user);
    }

    /**
     * Returns an array of permissions a user has on a piece of content.
     * @param contentId the content to check
     * @param user the user who wants to access the piece of content
     * @returns an array of permissions
     */
    public async getUserPermissions(
        contentId: ContentId,
        user: IUser
    ): Promise<Permission[]> {
        log.info(`checking user permissions for ${contentId}`);
        return this.contentStorage.getUserPermissions(contentId, user);
    }

    /**
     * Lists the content objects in the system (if no user is specified) or owned by the user.
     * @param user (optional) the user who owns the content
     * @returns a list of contentIds
     */
    public listContent(user?: IUser): Promise<ContentId[]> {
        return this.contentStorage.listContent(user);
    }

    /**
     * Gets the filenames of files added to the content with addContentFile(...) (e.g. images, videos or other files)
     * @param contentId the piece of content
     * @param user the user who wants to access the piece of content
     * @returns a list of files that are used in the piece of content, e.g. ['image1.png', 'video2.mp4']
     */
    public async listContentFiles(
        contentId: ContentId,
        user: IUser
    ): Promise<string[]> {
        log.info(`loading content files for ${contentId}`);
        return this.contentStorage.listFiles(contentId, user);
    }

    public sanitizeFilename = (filename: string): string => {
        if (this.contentStorage.sanitizeFilename) {
            return this.contentStorage.sanitizeFilename(filename);
        }
        return filename;
    };
}
