import { ContentFileScanner } from './ContentFileScanner';
import ContentManager from './ContentManager';
import Logger from './helpers/Logger';
import LibraryManager from './LibraryManager';
import LibraryName from './LibraryName';
import TemporaryFileManager from './TemporaryFileManager';
import { ContentId, IUser } from './types';

const log = new Logger('ContentStorer');

export default class ContentStorer {
    constructor(
        private contentManager: ContentManager,
        libraryManager: LibraryManager,
        private temporaryFileManager: TemporaryFileManager
    ) {
        this.contentFileScanner = new ContentFileScanner(libraryManager);
    }

    private contentFileScanner: ContentFileScanner;

    public async saveContent(
        contentId: ContentId,
        parameters: any,
        h5pJson: any,
        mainLibraryName: string,
        user: IUser
    ): Promise<ContentId> {
        let filesInOldParams: string[] = [];
        if (contentId !== undefined) {
            const oldParams = await this.contentManager.loadContent(
                contentId,
                user
            );
            const oldMetadata = await this.contentManager.loadH5PJson(
                contentId,
                user
            );
            filesInOldParams = (await this.contentFileScanner.scanForFiles(
                oldParams,
                oldMetadata.preloadedDependencies.find(
                    dep => dep.machineName === oldMetadata.mainLibrary
                )
            )).map(fi => fi.filePath);
        }

        const fileToCopyFromTemporaryStorage: string[] = [];
        const fileReferencesInNewParams = await this.contentFileScanner.scanForFiles(
            parameters,
            LibraryName.fromUberName(mainLibraryName, { useWhitespace: true })
        );
        for (const ref of fileReferencesInNewParams) {
            if (ref.temporary) {
                // save temporary file for later copying
                fileToCopyFromTemporaryStorage.push(ref.filePath);
                // remove temporary file marker from parameters
                ref.context.params.path = ref.filePath;
            }
        }

        const newContentId = await this.contentManager.createContent(
            h5pJson,
            parameters,
            user,
            contentId
        );

        // Copy files from temporary storage
        for (const fileToCopy of fileToCopyFromTemporaryStorage) {
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
                    newContentId,
                    fileToCopy,
                    readStream,
                    user
                );
                // delete the temporary file
                await this.temporaryFileManager.deleteFile(fileToCopy, user); // TODO: reconsider if this should really be deleted
            }
        }

        // delete unused existing files
        if (contentId !== undefined) {
            for (const file of filesInOldParams) {
                if (!fileReferencesInNewParams.some(f => f.filePath === file)) {
                    log.debug(
                        `Deleting unneccessary file ${file} from ${contentId}`
                    );
                    try {
                        await this.contentManager.deleteContentFile(
                            contentId,
                            file
                        );
                    } catch (error) {
                        log.error(
                            `Could not delete unused content file: ${error}`
                        );
                    }
                }
            }
        }
        return newContentId;
    }
}
