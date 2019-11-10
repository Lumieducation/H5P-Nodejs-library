import { ContentFileScanner, IFileReference } from './ContentFileScanner';
import ContentManager from './ContentManager';
import Logger from './helpers/Logger';
import LibraryManager from './LibraryManager';
import LibraryName from './LibraryName';
import TemporaryFileManager from './TemporaryFileManager';
import { ContentId, IUser } from './types';

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

    public async saveOrUpdateContent(
        contentId: ContentId,
        parameters: any,
        h5pJson: any,
        mainLibraryName: string,
        user: IUser
    ): Promise<ContentId> {
        // Get the list of files used in the old version of the content (if the content was saved before).
        // This list will later be compared against the files referenced in the new params.
        const filesInOldParams = contentId
            ? await this.getFilesInParams(contentId, user)
            : [];

        // We check in the new params object for file references. From this we can determine which
        // files must be copied from temporary storage into permanent storage and which files
        // were deleted in the editor by the user.
        const fileReferencesInNewParams = await this.contentFileScanner.scanForFiles(
            parameters,
            LibraryName.fromUberName(mainLibraryName, { useWhitespace: true })
        );
        const filesToCopyFromTemporaryStorage = await this.determineFilesToCopyFromTemporaryStorage(
            fileReferencesInNewParams
        );

        // Store the content in persistent storage / update the content there.
        const newContentId = await this.contentManager.createOrUpdateContent(
            h5pJson,
            parameters,
            user,
            contentId
        );

        // All files added to the piece of content during the editor session are only stored
        // in temporary storage. We need to copy them over from there.
        await this.copyFilesFromTemporaryStorage(
            filesToCopyFromTemporaryStorage,
            user,
            newContentId
        );

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
                fileReferencesInNewParams.map(f => f.filePath)
            );
        }

        return newContentId;
    }

    /**
     * Copies files from temporary storage into permanent storage
     * @param files the list of filenames to copy
     * @param user the user who is saving the content
     * @param contentId the content id of the object
     */
    private async copyFilesFromTemporaryStorage(
        files: string[],
        user: IUser,
        contentId: string
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
                // delete the temporary file
                await this.temporaryFileManager.deleteFile(fileToCopy, user);
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
            if (!newFiles.some(f => f === file)) {
                log.debug(
                    `Deleting unneccessary file ${file} from ${contentId}`
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
        fileReferencesInNewParams: IFileReference[]
    ): Promise<string[]> {
        const filesToCopyFromTemporaryStorage: string[] = [];

        for (const ref of fileReferencesInNewParams) {
            if (ref.temporary) {
                // save temporary file for later copying
                filesToCopyFromTemporaryStorage.push(ref.filePath);
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
        const oldParams = await this.contentManager.loadContent(
            contentId,
            user
        );
        const oldMetadata = await this.contentManager.loadH5PJson(
            contentId,
            user
        );
        return (await this.contentFileScanner.scanForFiles(
            oldParams,
            oldMetadata.preloadedDependencies.find(
                dep => dep.machineName === oldMetadata.mainLibrary
            )
        )).map(fi => fi.filePath);
    }
}
