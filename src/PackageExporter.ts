import { WriteStream } from 'fs';
import path from 'path';
import { Readable } from 'stream';
import yazl from 'yazl';

import ContentManager from './ContentManager';
import DependencyGetter from './DependencyGetter';
import EditorConfig from './EditorConfig';
import H5pError from './helpers/H5pError';
import Library from './Library';
import LibraryManager from './LibraryManager';
import {
    ContentId,
    IH5PJson,
    ITranslationService,
    IUser,
    Permission,    
} from './types';

export default class PackageExporter {
    /**
     * @param {LibraryManager} libraryManager
     * @param {TranslationService} translationService
     * @param {EditorConfig} config
     * @param {ContentManager} contentManager (optional) Only needed if you want to use the PackageManger to copy content from a package (e.g. Upload option in the editor)
     */
    constructor(
        private libraryManager: LibraryManager,
        private translationService: ITranslationService,
        private config: EditorConfig,
        private contentManager: ContentManager = null
    ) {}

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
        if (!(await this.contentManager.contentExists(contentId))) {
            throw new H5pError(
                `Content can't be downloaded as no content with id ${contentId} exists.`
            );
        }
        if (
            !(await this.contentManager.getUserPermissions(
                contentId,
                user
            )).some(p => p === Permission.Download)
        ) {
            throw new H5pError(
                `You do not have permission to download content with id ${contentId}`
            );
        }
        let contentStream: Readable;
        try {
            const content = await this.contentManager.loadContent(
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
            throw new H5pError(
                `Content can't be downloaded as the content data is unreadable.`
            );
        }
        let metadataStream: Readable;
        let metadata: IH5PJson;
        try {
            metadata = await this.contentManager.loadH5PJson(contentId, user);
            metadataStream = new Readable();
            metadataStream._read = () => {
                return;
            };
            metadataStream.push(JSON.stringify(metadata));
            metadataStream.push(null);
        } catch (error) {
            throw new H5pError(
                `Content can't be downloaded as the content metadata is unreadable.`
            );
        }

        const contentFiles = await this.contentManager.getContentFiles(
            contentId,
            user
        );
        const zip = new yazl.ZipFile();
        zip.outputStream.pipe(outputStream);
        zip.addReadStream(metadataStream, 'h5p.json');
        zip.addReadStream(contentStream, 'content/content.json');
        for (const contentFile of contentFiles) {
            const filePath = path.join('content', contentFile);
            zip.addReadStream(
                this.contentManager.getContentFileStream(
                    contentId,
                    filePath,
                    user
                ),
                filePath
            );
        }

        const dependencyGetter = new DependencyGetter(this.libraryManager);
        const mainLibrary = metadata.preloadedDependencies.find(
            l => l.machineName === metadata.mainLibrary
        );
        if (!mainLibrary) {
            throw new H5pError(
                `The main library ${metadata.mainLibrary} is not listed in the dependencies`
            );
        }
        const dependencies = await dependencyGetter.getDependencies(
            new Library(
                mainLibrary.machineName,
                mainLibrary.majorVersion,
                mainLibrary.minorVersion
            ),
            { editor: true, preloaded: true }
        );
        for (const dependency of dependencies) {
            const files = await this.libraryManager.listFiles(dependency);
            for (const file of files) {
                zip.addReadStream(
                    this.libraryManager.getFileStream(dependency, file),
                    `${dependency.getDirName()}/${file}`
                );
            }
        }

        zip.end();
    }
}