import ContentManager from './ContentManager';
import LibraryManager from './LibraryManager';
import { ContentId, IUser } from './types';

export default class ContentParser {
    constructor(
        private contentManager: ContentManager,
        private libraryManager: LibraryManager
    ) {}

    public async parseContent(
        contentId: ContentId,
        user: IUser
    ): Promise<void> {
        throw new Error('not implemented');
    }

    private async walkRecursive(
        fieldType: string,
        params: {
            library: string;
            params: any;
        }
    ): Promise<void> {
        switch (fieldType) {
            case 'file':
            case 'image':
                break;
            case 'audio':
            case 'video':
                break;
            case 'library':
                break;
            case 'group':
                break;
            case 'list':
                break;
        }
    }
}
