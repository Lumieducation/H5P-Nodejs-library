import { WriteStream } from 'fs';
import path from 'path';
import { Readable } from 'stream';
import yazl from 'yazl';

import ContentManager from './ContentManager';
import DependencyGetter from './DependencyGetter';
import H5pError from './helpers/H5pError';
import LibraryManager from './LibraryManager';
import LibraryName from './LibraryName';
import { ContentId, IContentMetadata, IUser, Permission } from './types';

import Logger from './helpers/Logger';
const log = new Logger('PackageExporter');

/**
 * Offers functionality to create .h5p files from content that is stored in the system.
 */
export default class PackageExporter {
    /**
     * @param libraryManager
     * @param contentManager (optional) Only needed if you want to use the PackageExporter to copy content from a package (e.g. Upload option in the editor)
     */
    constructor(
        private libraryManager: LibraryManager,
        private contentManager: ContentManager = null
    ) {
        log.info(`initialize`);
    }

    /**
     * Creates a .h5p-package for the specified content file and pipes it to the stream.
     * Throws H5pErrors if something goes wrong. The contents of the stream should be disregarded then.
     * @param contentId The contentId for which the package should be created.
     * @param outputStream The stream that the package is written to (e.g. the response stream fo Express)
     */
    public async createPackage(
        contentId: ContentId,
        outputStream: WriteStream,
        user: IUser
    ): Promise<void> {
        log.info(`creating package for ${contentId}`);
        await this.checkAccess(contentId, user);

        // create zip files
        const outputZipFile = new yazl.ZipFile();
        outputZipFile.outputStream.pipe(outputStream);

        // add json files
        const contentStream = await this.createContentFileStream(
            contentId,
            user
        );
        outputZipFile.addReadStream(contentStream, 'content/content.json');
        const { metadata, metadataStream } = await this.getMetadata(
            contentId,
            user
        );
        outputZipFile.addReadStream(metadataStream, 'h5p.json');

        // add content file (= files in content directory)
        await this.addContentFiles(contentId, user, outputZipFile);

        // add library files
        await this.addLibraryFiles(metadata, outputZipFile);

        // signal the end of zip creation
        outputZipFile.end();
    }

    /**
     * Adds the files inside the content directory to the zip file. Does not include content.json!
     */
    private async addContentFiles(
        contentId: ContentId,
        user: IUser,
        outputZipFile: yazl.ZipFile
    ): Promise<void> {
        log.info(`adding content files to ${contentId}`);
        const contentFiles = await this.contentManager.listContentFiles(
            contentId,
            user
        );

        for (const contentFile of contentFiles) {
            outputZipFile.addReadStream(
                await this.contentManager.getContentFileStream(
                    contentId,
                    contentFile,
                    user
                ),
                `content/${contentFile}`
            );
        }
    }

    /**
     * Adds the library files to the zip file that are required for the content to be playable.
     */
    private async addLibraryFiles(
        metadata: IContentMetadata,
        outputZipFile: yazl.ZipFile
    ): Promise<void> {
        log.info(`adding library files`);
        {
            const dependencyGetter = new DependencyGetter(this.libraryManager);
            const dependencies = await dependencyGetter.getDependentLibraries(
                metadata.preloadedDependencies
                    .concat(metadata.editorDependencies || [])
                    .concat(metadata.dynamicDependencies || []),
                { editor: true, preloaded: true }
            );
            for (const dependency of dependencies) {
                const files = await this.libraryManager.listFiles(dependency);
                for (const file of files) {
                    outputZipFile.addReadStream(
                        await this.libraryManager.getFileStream(
                            dependency,
                            file
                        ),
                        `${LibraryName.toUberName(dependency)}/${file}`
                    );
                }
            }
        }
    }

    /**
     * Checks if a piece of content exists and if the user has download permissions for it.
     * Throws an exception with the respective error message if this is not the case.
     */
    private async checkAccess(
        contentId: ContentId,
        user: IUser
    ): Promise<void> {
        if (!(await this.contentManager.contentExists(contentId))) {
            throw new H5pError(
                'download-content-not-found',
                { contentId },
                404
            );
        }
        if (
            !(
                await this.contentManager.getUserPermissions(contentId, user)
            ).some((p) => p === Permission.Download)
        ) {
            throw new H5pError(
                'download-content-forbidden',
                { contentId },
                403
            );
        }
    }

    /**
     * Creates a readable stream for the content.json file
     */
    private async createContentFileStream(
        contentId: ContentId,
        user: IUser
    ): Promise<Readable> {
        let contentStream: Readable;
        try {
            const content = await this.contentManager.getContentParameters(
                contentId,
                user
            );
            contentStream = new Readable();
            contentStream._read = () => {
                return;
            };
            contentStream.push(JSON.stringify(content));
            contentStream.push(null);
        } catch (error) {
            throw new H5pError('download-content-unreadable-data');
        }
        return contentStream;
    }

    /**
     * Gets the metadata for the piece of content (h5p.json) and also creates a file stream for it.
     */
    private async getMetadata(
        contentId: ContentId,
        user: IUser
    ): Promise<{ metadata: IContentMetadata; metadataStream: Readable }> {
        let metadataStream: Readable;
        let metadata: IContentMetadata;
        try {
            metadata = await this.contentManager.getContentMetadata(
                contentId,
                user
            );
            metadataStream = new Readable();
            metadataStream._read = () => {
                return;
            };
            metadataStream.push(JSON.stringify(metadata));
            metadataStream.push(null);
        } catch (error) {
            throw new H5pError('download-content-unreadable-metadata');
        }

        return { metadata, metadataStream };
    }
}
