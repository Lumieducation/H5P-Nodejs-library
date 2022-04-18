import { Writable, Readable } from 'stream';
import yazl from 'yazl';
import upath from 'upath';

import DependencyGetter from './DependencyGetter';
import H5pError from './helpers/H5pError';
import LibraryName from './LibraryName';
import {
    IContentStorage,
    ContentId,
    IContentMetadata,
    IUser,
    Permission
} from './types';
import { ContentFileScanner } from './ContentFileScanner';
import Logger from './helpers/Logger';
import LibraryManager from './LibraryManager';
import generateFilename from './helpers/FilenameGenerator';
import { generalizedSanitizeFilename } from './implementation/utils';

const log = new Logger('PackageExporter');

/**
 * Offers functionality to create .h5p files from content that is stored in the
 * system.
 */
export default class PackageExporter {
    /**
     * @param libraryManager
     * @param contentStorage (optional) Only needed if you want to use the
     * PackageExporter to copy content from a package (e.g. Upload option in the
     * editor)
     */
    constructor(
        // we don't use content storage directly as we want the
        // alterLibrarySemantics hook to work
        private libraryManager: LibraryManager,
        // eslint-disable-next-line @typescript-eslint/default-param-last
        private contentStorage: IContentStorage = null,
        { exportMaxContentPathLength }: { exportMaxContentPathLength: number }
    ) {
        log.info(`initialize`);
        this.maxContentPathLength = exportMaxContentPathLength ?? 255;
    }

    private maxContentPathLength: number;

    /**
     * Creates a .h5p-package for the specified content file and pipes it to the
     * stream. Throws H5pErrors if something goes wrong. The contents of the
     * stream should be disregarded then.
     *
     * IMPORTANT: This method's returned promise will resolve BEFORE piping to
     * the writeable has been finished. If you outputStream is directly piped to
     * a download that's not an issue, but if you do something else with this
     * stream, you have to wait for the piping to finish by subscribing to the
     * 'finish' event of the stream!
     *
     * @param contentId The contentId for which the package should be created.
     * @param outputStream The stream that the package is written to (e.g. the
     * response stream fo Express)
     */
    public async createPackage(
        contentId: ContentId,
        outputStream: Writable,
        user: IUser
    ): Promise<void> {
        log.info(`creating package for ${contentId}`);
        await this.checkAccess(contentId, user);

        // create zip files
        const outputZipFile = new yazl.ZipFile();
        outputZipFile.outputStream.pipe(outputStream);

        // get content data
        const parameters = await this.contentStorage.getParameters(
            contentId,
            user
        );
        const { metadata, metadataStream } = await this.getMetadata(
            contentId,
            user
        );

        // check if filenames are too long and shorten them in the parameters
        // if necessary; the substitutions that took place are returned and
        // later used to change the paths inside the zip archive
        const substitutions = await this.shortenFilenames(
            parameters,
            metadata,
            this.maxContentPathLength
        );

        // add json files
        const contentStream = await this.createContentFileStream(parameters);
        outputZipFile.addReadStream(contentStream, 'content/content.json');
        outputZipFile.addReadStream(metadataStream, 'h5p.json');

        // add content file (= files in content directory)
        await this.addContentFiles(
            contentId,
            user,
            outputZipFile,
            substitutions
        );

        // add library files
        await this.addLibraryFiles(metadata, outputZipFile);

        // signal the end of zip creation
        outputZipFile.end();
    }

    /**
     * Adds the files inside the content directory to the zip file. Does not
     * include content.json!
     * @param contentId the contentId of the content
     * @param user the user who wants to export
     * @param outputZipFile the file to write to
     * @param pathSubstitutions list of unix (!) paths to files whose paths were
     * changed in the parameters; this means the paths in the zip file must
     * be changed accordingly
     */
    private async addContentFiles(
        contentId: ContentId,
        user: IUser,
        outputZipFile: yazl.ZipFile,
        pathSubstitutions: { [oldPath: string]: string }
    ): Promise<void> {
        log.info(`adding content files to ${contentId}`);
        const contentFiles = await this.contentStorage.listFiles(
            contentId,
            user
        );

        for (const contentFile of contentFiles) {
            outputZipFile.addReadStream(
                await this.contentStorage.getFileStream(
                    contentId,
                    contentFile,
                    user
                ),
                `content/${
                    pathSubstitutions[upath.toUnix(contentFile)] ?? contentFile
                }`
            );
        }
    }

    /**
     * Adds the library files to the zip file that are required for the content
     * to be playable.
     */
    private async addLibraryFiles(
        metadata: IContentMetadata,
        outputZipFile: yazl.ZipFile
    ): Promise<void> {
        log.info(`adding library files`);
        {
            const dependencyGetter = new DependencyGetter(
                this.libraryManager.libraryStorage
            );
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
     * Checks if a piece of content exists and if the user has download
     * permissions for it. Throws an exception with the respective error message
     * if this is not the case.
     */
    private async checkAccess(
        contentId: ContentId,
        user: IUser
    ): Promise<void> {
        if (!(await this.contentStorage.contentExists(contentId))) {
            throw new H5pError(
                'download-content-not-found',
                { contentId },
                404
            );
        }
        if (
            !(
                await this.contentStorage.getUserPermissions(contentId, user)
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
    private async createContentFileStream(parameters: any): Promise<Readable> {
        let contentStream: Readable;
        try {
            contentStream = new Readable();
            // eslint-disable-next-line no-underscore-dangle
            contentStream._read = () => {};
            contentStream.push(JSON.stringify(parameters));
            contentStream.push(null);
        } catch (error) {
            throw new H5pError('download-content-unreadable-data');
        }
        return contentStream;
    }

    /**
     * Gets the metadata for the piece of content (h5p.json) and also creates a
     * file stream for it.
     */
    private async getMetadata(
        contentId: ContentId,
        user: IUser
    ): Promise<{ metadata: IContentMetadata; metadataStream: Readable }> {
        let metadataStream: Readable;
        let metadata: IContentMetadata;
        try {
            metadata = await this.contentStorage.getMetadata(contentId, user);
            metadataStream = new Readable();
            // eslint-disable-next-line no-underscore-dangle
            metadataStream._read = () => {};
            metadataStream.push(JSON.stringify(metadata));
            metadataStream.push(null);
        } catch (error) {
            throw new H5pError('download-content-unreadable-metadata');
        }

        return { metadata, metadataStream };
    }

    /**
     * Scans the parameters of the piece of content and looks for paths that are
     * longed than the specified max length. If this happens the filenames are
     * shortened in the parameters and the substitution is returned in the
     * substitution list
     * @param parameters the parameters to scan; IMPORTANT: The parameters are
     * mutated by this method!!!
     * @param metadata the metadata of the piece of content
     * @param maxFilenameLength the maximum acceptable filename length
     * @returns an object whose keys are old paths and values the new paths to
     * be used instead; IMPORTANT: All paths are unix paths using slashes as
     * directory separators!
     */
    private async shortenFilenames(
        parameters: any,
        metadata: IContentMetadata,
        maxFilenameLength: number
    ): Promise<{ [oldPath: string]: string }> {
        const substitutions: { [oldPath: string]: string } = {};

        // usedFilenames keeps track of filenames that are used in the package
        // to avoid duplicate filenames
        const usedFilenames: { [filename: string]: boolean } = {};

        const contentScanner = new ContentFileScanner(this.libraryManager);
        const files = await contentScanner.scanForFiles(
            parameters,
            metadata.preloadedDependencies.find(
                (dep) => dep.machineName === metadata.mainLibrary
            )
        );

        for (const file of files) {
            if (file.filePath.length >= maxFilenameLength) {
                const newFilename = await generateFilename(
                    file.filePath,
                    (filenameToCheck) =>
                        generalizedSanitizeFilename(
                            filenameToCheck,
                            new RegExp(''),
                            maxFilenameLength - 17 // 9 for shortid and and 8
                            // for content/ prefix of path in package
                        ),
                    async (fileToCheck) => usedFilenames[fileToCheck]
                );
                substitutions[file.filePath] = newFilename;
                file.context.params.path = newFilename;
                usedFilenames[newFilename] = true;
            } else {
                usedFilenames[file.filePath] = true;
            }
        }
        return substitutions;
    }
}
