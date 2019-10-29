import ContentManager from './ContentManager';
import LibraryManager from './LibraryManager';
import TemporaryFileManager from './TemporaryFileManager';
import { ContentId, IUser } from './types';

export default class TemporaryFileSyncer {
    constructor(
        private temporaryFileManager: TemporaryFileManager,
        private contentManager: ContentManager,
        private libraryManager: LibraryManager
    ) {}

    public async copyMissingFilesFromTemporary(
        contentId: ContentId,
        user: IUser
    ): Promise<void> {}

    public async deleteRedundantFilesInContent(
        contentId: ContentId,
        user: IUser
    ): Promise<void> {}
}
