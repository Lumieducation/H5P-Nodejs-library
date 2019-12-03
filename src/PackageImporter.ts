import fsExtra from 'fs-extra';
import path from 'path';
import promisepipe from 'promisepipe';
import { dir } from 'tmp-promise';
import yauzlPromise from 'yauzl-promise';

import ContentManager from './ContentManager';
import ContentStorer from './ContentStorer';
import H5pError from './helpers/H5pError';
import ValidationError from './helpers/ValidationError';
import LibraryManager from './LibraryManager';
import PackageValidator from './PackageValidator';
import {
    ContentId,
    IContentMetadata,
    IEditorConfig,
    ITranslationService,
    IUser
} from './types';

import Logger from './helpers/Logger';

const log = new Logger('PackageImporter');

/**
 * Indicates what to do with content.
 */
enum ContentCopyModes {
    /**
     * "Install" means that the content should be permanently added to the system (i.e. added through ContentManager)
     */
    Install,
    /**
     * "Temporary" means that the content should not be permanently added to the system. Instead only the content files (images etc.)
     * are added to temporary storage.
     */
    Temporary,
    /**
     * "NoCopy" means that content is ignored.
     */
    NoCopy
}

/**
 * Handles the installation of libraries and saving of content from a H5P package.
 */
export default class PackageImporter {
    /**
     * @param {LibraryManager} libraryManager
     * @param {TranslationService} translationService
     * @param {EditorConfig} config
     * @param {ContentStorer} contentStorer
     */
    constructor(
        private libraryManager: LibraryManager,
        private translationService: ITranslationService,
        private config: IEditorConfig,
        private contentManager: ContentManager = null,
        private contentStorer: ContentStorer = null
    ) {
        log.info(`initialize`);
    }

    /**
     * Extracts a H5P package to the specified directory.
     * @param {string} packagePath The full path to the H5P package file on the local disk
     * @param {string} directoryPath The full path of the directory to which the package should be extracted
     * @param {boolean} includeLibraries If true, the library directories inside the package will be extracted.
     * @param {boolean} includeContent If true, the content folder inside the package will be extracted.
     * @param {boolean} includeMetadata If true, the h5p.json file inside the package will be extracted.
     * @returns {Promise<void>}
     */
    public static async extractPackage(
        packagePath: string,
        directoryPath: string,
        {
            includeLibraries = false,
            includeContent = false,
            includeMetadata = false
        }: {
            includeContent: boolean;
            includeLibraries: boolean;
            includeMetadata: boolean;
        }
    ): Promise<void> {
        log.info(`extracting package ${packagePath} to ${directoryPath}`);
        const zipFile = await yauzlPromise.open(packagePath);
        await zipFile.walkEntries(async (entry: any) => {
            const basename = path.basename(entry.fileName);
            if (
                !basename.startsWith('.') &&
                !basename.startsWith('_') &&
                ((includeContent && entry.fileName.startsWith('content/')) ||
                    (includeLibraries &&
                        entry.fileName.includes('/') &&
                        !entry.fileName.startsWith('content/')) ||
                    (includeMetadata && entry.fileName === 'h5p.json'))
            ) {
                const readStream = await entry.openReadStream();
                const writePath = path.join(directoryPath, entry.fileName);

                await fsExtra.mkdirp(path.dirname(writePath));
                const writeStream = fsExtra.createWriteStream(writePath);
                await promisepipe(readStream, writeStream);
            }
        });
    }

    /**
     * Permanently adds content from a H5P package to the system. This means that
     * content is __permanently__ added to storage and necessary libraries are installed from the package
     * if they are not already installed.
     *
     * This is __NOT__ what you want if the user is just uploading a package in the editor client!
     *
     * Throws errors if something goes wrong.
     * @param packagePath The full path to the H5P package file on the local disk.
     * @param user The user who wants to upload the package.
     * @param contentId (optional) the content id to use for the package
     * @returns the newly assigned content id, the metadata (=h5p.json) and parameters (=content.json)
     * inside the package
     */
    public async addPackageLibrariesAndContent(
        packagePath: string,
        user: IUser,
        contentId?: ContentId
    ): Promise<{
        id: ContentId;
        metadata: IContentMetadata;
        parameters: any;
    }> {
        log.info(`adding content from ${packagePath} to system`);
        const { id, metadata, parameters } = await this.processPackage(
            packagePath,
            {
                copyMode: ContentCopyModes.Install,
                installLibraries: user.canUpdateAndInstallLibraries
            },
            user,
            contentId
        );
        if (id === undefined) {
            throw new Error(
                'Something went wrong when storing the package: no content id was assigned.'
            );
        }
        return { id, metadata, parameters };
    }

    /**
     * Copies files inside the package into temporary storage and installs the necessary libraries from the package
     * if they are not already installed. (This is what you want to do if the user uploads a package in the editor client.)
     * Pass the information returned about the content back to the editor client.
     * Throws errors if something goes wrong.
     * @param packagePath The full path to the H5P package file on the local disk.
     * @param user The user who wants to upload the package.
     * @returns the metadata and parameters inside the package
     */
    public async addPackageLibrariesAndTemporaryFiles(
        packagePath: string,
        user: IUser
    ): Promise<{
        metadata: IContentMetadata;
        parameters: any;
    }> {
        log.info(`adding content from ${packagePath} to system`);
        return this.processPackage(
            packagePath,
            {
                copyMode: ContentCopyModes.Temporary,
                installLibraries: user.canUpdateAndInstallLibraries
            },
            user
        );
    }

    /**
     * Installs all libraries from the package. Assumes that the user calling this has the permission to install libraries!
     * Throws errors if something goes wrong.
     * @param {string} packagePath The full path to the H5P package file on the local disk.
     * @returns {Promise<void>}
     */
    public async installLibrariesFromPackage(
        packagePath: string
    ): Promise<void> {
        log.info(`installing libraries from package ${packagePath}`);
        await this.processPackage(packagePath, {
            copyMode: ContentCopyModes.NoCopy,
            installLibraries: true
        });
    }

    /**
     * Generic method to process a H5P package. Can install libraries and copy content.
     * @param packagePath The full path to the H5P package file on the local disk
     * @param installLibraries If true, try installing libraries from package. Defaults to false.
     * @param copyMode indicates if and how content should be installed
     * @param user (optional) the user who wants to copy content (only needed when copying content)
     * @returns the newly assigned content id (undefined if not saved permanently), the metadata (=h5p.json)
     * and parameters (=content.json) inside the package
     */
    private async processPackage(
        packagePath: string,
        {
            installLibraries = false,
            copyMode = ContentCopyModes.NoCopy
        }: { copyMode: ContentCopyModes; installLibraries: boolean },
        user?: IUser,
        contentId?: ContentId
    ): Promise<{
        id?: ContentId;
        metadata: IContentMetadata;
        parameters: any;
    }> {
        log.info(`processing package ${packagePath}`);
        const packageValidator = new PackageValidator(
            this.translationService,
            this.config
        );
        // no need to check result as the validator throws an exception if there is an error
        await packageValidator.validatePackage(packagePath, false, true);
        // we don't use withDir here, to have better error handling (catch & finally block below)
        const { path: tempDirPath } = await dir();
        try {
            await PackageImporter.extractPackage(packagePath, tempDirPath, {
                includeContent:
                    copyMode === ContentCopyModes.Install ||
                    copyMode === ContentCopyModes.Temporary,
                includeLibraries: installLibraries,
                includeMetadata:
                    copyMode === ContentCopyModes.Install ||
                    copyMode === ContentCopyModes.Temporary
            });
            const dirContent = await fsExtra.readdir(tempDirPath);

            // install all libraries
            if (installLibraries) {
                await Promise.all(
                    dirContent
                        .filter(
                            (dirEntry: string) =>
                                dirEntry !== 'h5p.json' &&
                                dirEntry !== 'content'
                        )
                        .map((dirEntry: string) =>
                            this.libraryManager.installFromDirectory(
                                path.join(tempDirPath, dirEntry),
                                false
                            )
                        )
                );
            }

            // Copy content files to the repository
            if (copyMode === ContentCopyModes.Install) {
                if (!this.contentManager) {
                    throw new Error(
                        'PackageImporter was initialized without a ContentManager, but you want to copy content from a package. Pass a ContentManager object to the the constructor!'
                    );
                }
                return await this.contentManager.copyContentFromDirectory(
                    tempDirPath,
                    user,
                    contentId
                );
            }

            // Copy temporary files to the repository
            if (copyMode === ContentCopyModes.Temporary) {
                if (!this.contentStorer) {
                    throw new Error(
                        'PackageImporter was initialized without a ContentStorer, but you want to copy content from a package. Pass a ContentStorer object to the the constructor!'
                    );
                }
                return await this.contentStorer.copyFromDirectoryToTemporary(
                    tempDirPath,
                    user
                );
            }
        } catch (error) {
            // if we don't do this, finally weirdly just swallows the errors
            throw error;
        } finally {
            // clean up temporary files in any case
            await fsExtra.remove(tempDirPath);
        }

        return { id: undefined, metadata: undefined, parameters: undefined };
    }
}
