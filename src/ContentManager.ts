import fsExtra from 'fs-extra';
import globPromise from 'glob-promise';
import path from 'path';
import { Stream } from 'stream';

import { streamToString } from './helpers/stream-helpers';

import User from './User';

import { ContentId, IContentJson, IContentStorage, IH5PJson } from './types';

/**
 * The ContentManager takes care of saving content and dependent files. It only contains storage-agnostic functionality and
 * depends on a ContentStorage object to do the actual persistence.
 */
export default class ContentManager {
    /**
     * @param {FileContentStorage} contentStorage The storage object
     */

    private contentStorage: IContentStorage;

    constructor(contentStorage: IContentStorage) {
        this.contentStorage = contentStorage;
    }

    /**
     * Generates a unique content id that hasn't been used in the system so far.
     * @returns {Promise<number>} A unique content id
     */
    public async createContentId(): Promise<ContentId> {
        return this.contentStorage.createContentId();
    }

    /**
     * Creates a content object in the repository. Add files to it later with addContentFile(...).
     * @param {any} metadata The metadata of the content (= h5p.json)
     * @param {any} content the content object (= content/content.json)
     * @param {User} user The user who owns this object.
     * @param {number} contentId (optional) The content id to use
     * @returns {Promise<string>} The newly assigned content id
     */
    public async createContent(
        metadata: IH5PJson,
        content: IContentJson,
        user: User,
        contentId: ContentId
    ): Promise<ContentId> {
        return this.contentStorage.createContent(
            metadata,
            content,
            user,
            contentId
        );
    }

    /**
     * Adds a content file to an existing content object. The content object has to be created with createContent(...) first.
     * @param {number} contentId The id of the content to add the file to
     * @param {string} filename The filename INSIDE the content folder
     * @param {Stream} stream A readable stream that contains the data
     * @param {User} user The user who owns this object
     * @returns {Promise<void>}
     */
    public async addContentFile(
        contentId: ContentId,
        filename: string,
        stream: Stream,
        user: User
    ): Promise<void> {
        return this.contentStorage.addContentFile(
            contentId,
            filename,
            stream,
            user
        );
    }

    /**
     * Returns the metadata (=contents of h5p.json) of a piece of content.
     * @param {number} contentId the content id
     * @param {User} user The user who wants to access the content
     * @returns {Promise<any>}
     */
    public async loadH5PJson(
        contentId: ContentId,
        user: User
    ): Promise<IH5PJson> {
        return this.getFileJson(contentId, 'h5p.json', user);
    }

    /**
     * Returns the content object (=contents of content/content.json) of a piece of content.
     * @param {number} contentId the content id
     * @param {User} user The user who wants to access the content
     * @returns {Promise<any>}
     */
    public async loadContent(
        contentId: ContentId,
        user: User
    ): Promise<IContentJson> {
        return this.getFileJson(contentId, 'content/content.json', user);
    }

    /**
     * Adds content from a H5P package (in a temporary directory) to the installation.
     * It does not check whether the user has permissions to save content.
     * @param {string} packageDirectory The absolute path containing the package (the directory containing h5p.json)
     * @param {User} user The user who is adding the package.
     * @param {number} contentId (optional) The content id to use for the package
     * @returns {Promise<string>} The id of the content that was created (the one passed to the method or a new id if there was none).
     */
    private async copyContentFromDirectory(
        packageDirectory: string,
        user: User,
        contentId: ContentId
    ): Promise<ContentId> {
        const metadata: IH5PJson = await fsExtra.readJSON(
            path.join(packageDirectory, 'h5p.json')
        );
        const content: IContentJson = await fsExtra.readJSON(
            path.join(packageDirectory, 'content', 'content.json')
        );
        const otherContentFiles: string[] = (await globPromise(
            path.join(packageDirectory, 'content', '**/*.*')
        )).filter(
            (file: string) =>
                path.relative(packageDirectory, file) !== 'content.json'
        );

        const newContentId: ContentId = await this.contentStorage.createContent(
            metadata,
            content,
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
                    return this.contentStorage.addContentFile(
                        contentId,
                        localPath,
                        readStream
                    );
                })
            );
        } catch (error) {
            this.contentStorage.deleteContent(contentId);
            throw error;
        }
        return newContentId;
    }

    /**
     * Returns a readable stream of a content file (e.g. image or video) inside a piece of conent
     * @param {number} contentId the id of the content object that the file is attached to
     * @param {string} filename the filename of the file to get (you have to add the "content/" directory if needed)
     * @param {User} user the user who wants to retrieve the content file
     * @returns {Stream}
     */
    private getContentFileStream(
        contentId: ContentId,
        filename: string,
        user: User
    ): Stream {
        return this.contentStorage.getContentFileStream(
            contentId,
            filename,
            user
        );
    }

    /**
     * Returns the decoded JSON data inside a file
     * @param {number} contentId The id of the content object that the file is attached to
     * @param {string} file The filename to get (relative to main dir, you have to add "content/" if you want to access a content file)
     * @param {User} user The user who wants to acces this object
     * @returns {Promise<any>}
     */
    private async getFileJson(
        contentId: ContentId,
        file: string,
        user: User
    ): Promise<any> {
        const stream: Stream = this.contentStorage.getContentFileStream(
            contentId,
            file,
            user
        );
        const jsonString: string = await streamToString(stream);
        return JSON.parse(jsonString);
    }
}
