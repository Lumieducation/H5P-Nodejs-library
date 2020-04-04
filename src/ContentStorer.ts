import fsExtra from 'fs-extra';
import path from 'path';
import shortid from 'shortid';

import { ContentFileScanner, IFileReference } from './ContentFileScanner';
import ContentManager from './ContentManager';
import H5pError from './helpers/H5pError';
import Logger from './helpers/Logger';
import LibraryManager from './LibraryManager';
import TemporaryFileManager from './TemporaryFileManager';
import {
    ContentId,
    ContentParameters,
    IContentMetadata,
    ILibraryName,
    IUser
} from './types';

const log = new Logger('ContentStorer');

/**
 * Contains logic to store content in permanent storage. Copies files from temporary storage and
 * deletes unused files.
 */
export default class ContentStorer {
    constructor(
        private contentManager: ContentManager,
        libraryManager: LibraryManager,
        private temporaryFileManager: TemporaryFileManager
    ) {
        this.contentFileScanner = new ContentFileScanner(libraryManager);
    }

    private contentFileScanner: ContentFileScanner;

    /**
     * Saves content in the persistence system. Also copies over files from temporary storage
     * or from other content if the content was pasted from there.
     * @param contentId the contentId (can be undefined if previously unsaved)
     * @param parameters the parameters of teh content (= content.json)
     * @param metadata = content of h5p.json
     * @param mainLibraryName the library name
     * @param user the user who wants to save the file
     */
    public async addOrUpdateContent(
        contentId: ContentId,
        parameters: any,
        metadata: IContentMetadata,
        mainLibraryName: ILibraryName,
        user: IUser
    ): Promise<ContentId> {
        const isUpdate = contentId !== undefined;

        // Get the list of files used in the old version of the content (if the content was saved before).
        // This list will later be compared against the files referenced in the new params.
        const filesInOldParams = isUpdate
            ? await this.getFilesInParams(contentId, user)
            : [];

        // We check in the new params object for file references. From this we can determine which
        // files must be copied from temporary storage into permanent storage and which files
        // were deleted in the editor by the user.
        const fileReferencesInNewParams = await this.contentFileScanner.scanForFiles(
            parameters,
            mainLibraryName
        );
        const filesToCopyFromTemporaryStorage = await this.determineFilesToCopyFromTemporaryStorage(
            fileReferencesInNewParams,
            filesInOldParams
        );

        // Store the content in persistent storage / update the content there.
        const newContentId = await this.contentManager.createOrUpdateContent(
            metadata,
            parameters,
            user,
            contentId
        );

        // All files added to the piece of content during the editor session are only stored
        // in temporary storage. We need to copy them over from there.
        await this.copyFilesFromTemporaryStorage(
            filesToCopyFromTemporaryStorage,
            user,
            newContentId,
            isUpdate // We only delete the temporary file when this is an update. If new content is stored, the temporary
            // files might still be needed, e.g. if the user accidentally presses save twice. They will be deleted through
            // the regular expiration mechanism at some point.
        );

        // We copy over files that were pasted from another piece of content. This might requires changing the paths
        // in the parameters, so we have to update them.
        // TODO: In the future we might want to avoid updating content right after it was saved.
        if (
            await this.copyFilesFromPasteSource(
                fileReferencesInNewParams,
                user,
                newContentId
            )
        ) {
            await this.contentManager.createOrUpdateContent(
                metadata,
                parameters,
                user,
                newContentId
            );
        }

        // If this is an content update, we might have to delete files from storage that
        // were deleted by the user.
        // (Files that were referenced in the old params but aren't referenced in the new params anymore
        // were deleted by the user in the editor client and must be deleted from storage.)
        if (contentId !== undefined) {
            // we compare against the old content id, as we can check that way
            // if the content was saved previously
            await this.deleteUnusedOldFiles(
                newContentId,
                filesInOldParams,
                fileReferencesInNewParams.map((f) => f.filePath)
            );
        }

        return newContentId;
    }

    /**
     * Scans through the parameters of the content and copies all referenced files into
     * temporary storage.
     * @param packageDirectory
     * @param user
     * @returns the metadata and parameters of the content
     */
    public async copyFromDirectoryToTemporary(
        packageDirectory: string,
        user: IUser
    ): Promise<{ metadata: IContentMetadata; parameters: any }> {
        const metadata: IContentMetadata = await fsExtra.readJSON(
            path.join(packageDirectory, 'h5p.json')
        );
        const parameters: ContentParameters = await fsExtra.readJSON(
            path.join(packageDirectory, 'content', 'content.json')
        );

        const fileReferencesInParams = await this.contentFileScanner.scanForFiles(
            parameters,
            metadata.preloadedDependencies.find(
                (l) => l.machineName === metadata.mainLibrary
            )
        );

        for (const reference of fileReferencesInParams) {
            const filepath = path.join(
                packageDirectory,
                'content',
                reference.filePath
            );
            if (!(await fsExtra.pathExists(filepath))) {
                continue;
            }
            const readStream = fsExtra.createReadStream(filepath);
            const newFilename = await this.temporaryFileManager.addFile(
                reference.filePath,
                readStream,
                user
            );
            reference.context.params.path = `${newFilename}#tmp`;
        }
        return { metadata, parameters };
    }

    /**
     * Looks through the file references and check if any of them originate from a copy & paste
     * operation. (Can be detected by checking if the path is relative.) If there are copy & pasted
     * files, these files will be copied over to the new contentId and the references will be updated
     * accordingly.
     * @param fileReferencesInParams The file references found in the parameters
     * @param user the user who wants to save the content
     * @param contentId the content the files will be attached to
     * @returns true if file reference were changed and the changed parameters must be saved
     */
    private async copyFilesFromPasteSource(
        fileReferencesInParams: IFileReference[],
        user: IUser,
        contentId: string
    ): Promise<boolean> {
        let changedSomething = false;
        for (const ref of fileReferencesInParams) {
            // Check for relative paths
            log.debug(`Checking if file ${ref.filePath} is a relative path.`);
            const matches = ref.filePath.match(
                /^\.\.\/(content\/)?([\w\-._]+)\/([\w\-.\/_]+)$/
            );
            if (!matches || matches.length === 0) {
                continue;
            }
            const sourceContentId = matches[2];
            const sourceFilename = matches[3];

            log.debug(
                `Copying pasted file ${sourceFilename} from ${sourceContentId}.`
            );

            // If something goes wrong we simply remove the file from the reference.
            try {
                const sourceFileStream = await this.contentManager.getContentFileStream(
                    sourceContentId,
                    sourceFilename,
                    user
                );

                // the filename might already be in use in the piece of content, so we generate a new one.
                const pastedFilename = await this.getUniqueFilename(
                    contentId,
                    sourceFilename
                );

                await this.contentManager.addContentFile(
                    contentId,
                    pastedFilename,
                    sourceFileStream,
                    user
                );

                // We have to replace the relative path with the path of the just saved file
                ref.context.params.path = pastedFilename;
                changedSomething = true;
            } catch (error) {
                // If something went wrong, we simply remove the reference to the file from the params.
                log.error(
                    `Could not copy file ${sourceFilename} from ${sourceContentId}: ${error}. Removing the reference in the pasted content.`
                );
                ref.context.params.path = '';
            }
        }
        return changedSomething;
    }

    /**
     * Copies files from temporary storage into permanent storage
     * @param files the list of filenames to copy
     * @param user the user who is saving the content
     * @param contentId the content id of the object
     * @param deleteTemporaryFiles true if temporary files should be deleted after copying
     */
    private async copyFilesFromTemporaryStorage(
        files: string[],
        user: IUser,
        contentId: string,
        deleteTemporaryFiles: boolean
    ): Promise<void> {
        for (const fileToCopy of files) {
            let readStream;
            try {
                readStream = await this.temporaryFileManager.getFileStream(
                    fileToCopy,
                    user
                );
            } catch (error) {
                // We just log this error and continue.
                log.error(
                    `Temporary file ${fileToCopy} does not exist or is not accessible to user: ${error}`
                );
            }
            try {
                if (readStream !== undefined) {
                    log.debug(
                        `Adding temporary file ${fileToCopy} to content id ${contentId}`
                    );
                    await this.contentManager.addContentFile(
                        contentId,
                        fileToCopy,
                        readStream,
                        user
                    );
                    if (deleteTemporaryFiles) {
                        await this.temporaryFileManager.deleteFile(
                            fileToCopy,
                            user
                        );
                    }
                }
            } finally {
                readStream.close();
            }
        }
    }

    /**
     * Removes old files by comparing the two lists and removing those files that
     * are not present in newFiles anymore.
     * @param contentId
     * @param oldFiles
     * @param newFiles
     */
    private async deleteUnusedOldFiles(
        contentId: string,
        oldFiles: string[],
        newFiles: string[]
    ): Promise<void> {
        for (const file of oldFiles) {
            if (!newFiles.some((f) => f === file)) {
                log.debug(
                    `Deleting unnecessary file ${file} from ${contentId}`
                );
                try {
                    await this.contentManager.deleteContentFile(
                        contentId,
                        file
                    );
                } catch (error) {
                    log.error(`Could not delete unused content file: ${error}`);
                }
            }
        }
    }

    /**
     * Returns a list of files that must be copied to permanent storage and modifies the path
     * of these files in the fileReferencesInNewParams object!
     * NOTE: Mind the side effect on fileReferencesInNewParams!
     * @param fileReferencesInNewParams
     * @returns the list of files to copy
     */
    private async determineFilesToCopyFromTemporaryStorage(
        fileReferencesInNewParams: IFileReference[],
        oldFiles: string[]
    ): Promise<string[]> {
        const filesToCopyFromTemporaryStorage: string[] = [];

        for (const ref of fileReferencesInNewParams) {
            // We mark the file to be copied over from temporary storage if the file has a temporary marker.
            if (ref.temporary) {
                // We only save temporary file for later copying, however, if the there isn't already a file
                // with the exact name. This might be the case if the user presses "save" twice.
                if (!oldFiles.some((f) => f === ref.filePath)) {
                    filesToCopyFromTemporaryStorage.push(ref.filePath);
                }
                // remove temporary file marker from parameters
                ref.context.params.path = ref.filePath;
            }
        }
        return filesToCopyFromTemporaryStorage;
    }

    /**
     * Retrieves a list of files in the parameters of a content object.
     * @param contentId
     * @param user
     * @returns the list of files
     */
    private async getFilesInParams(
        contentId: string,
        user: IUser
    ): Promise<string[]> {
        const oldParams = await this.contentManager.getContentParameters(
            contentId,
            user
        );
        const oldMetadata = await this.contentManager.getContentMetadata(
            contentId,
            user
        );
        return (
            await this.contentFileScanner.scanForFiles(
                oldParams,
                oldMetadata.preloadedDependencies.find(
                    (dep) => dep.machineName === oldMetadata.mainLibrary
                )
            )
        ).map((fi) => fi.filePath);
    }

    /**
     * Generates a unique filename. Removes short-ids that were added to filenames
     * @param contentId the content object for which the file is about to be saved
     * @param filename the filename on which to base the unique filename on
     * @returns a unique filename (within the content object)
     */
    private async getUniqueFilename(
        contentId: ContentId,
        filename: string
    ): Promise<string> {
        log.debug(`Getting unique name for ${filename}.`);
        let actualFilename = filename;
        // remove already assigned shortids
        const match = filename.match(/^(.+?)-(.+?)(\.\w+)$/);
        if (match && shortid.isValid(match[2])) {
            actualFilename = match[1] + match[3];
            log.debug(`Actual filename is ${actualFilename}.`);
        }

        // try newly generated filenames
        let attempts = 0;
        let filenameAttempt = '';
        let exists = false;
        const dirname = path.dirname(actualFilename);
        do {
            filenameAttempt = `${dirname ? `${dirname}/` : ''}${path.basename(
                actualFilename,
                path.extname(actualFilename)
            )}-${shortid()}${path.extname(actualFilename)}`;
            log.debug(`Checking if ${filenameAttempt} already exists`);
            exists = await this.contentManager.contentFileExists(
                contentId,
                filenameAttempt
            );
            attempts += 1;
        } while (attempts < 5 && exists); // only try 5 times
        if (exists) {
            log.error(`Cannot determine a unique filename for ${filename}`);
            throw new H5pError(
                'error-generating-unique-content-filename',
                { filename },
                500
            );
        }
        log.debug(`Unique filename is ${filenameAttempt}`);
        return filenameAttempt;
    }
}
