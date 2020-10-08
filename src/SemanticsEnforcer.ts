import { ContentScanner } from './ContentScanner';
import LibraryManager from './LibraryManager';
import Logger from './helpers/Logger';
import { ILibraryName } from './types';

const log = new Logger('SemanticsEnforcer');

export default class SemanticsEnforcer extends ContentScanner {
    constructor(libraryManager: LibraryManager) {
        super(libraryManager);
        log.info('initialize');
    }

    public async enforceSemanticStructure(
        mainParams: any,
        mainLibraryName: ILibraryName
    ): Promise<void> {
        await this.scanContent(
            mainParams,
            mainLibraryName,
            (semantics, params, jsonPath, parentParams) => {
                if (
                    semantics.name === 'media' &&
                    semantics.type === 'library' &&
                    params &&
                    params.params &&
                    Object.keys(params.params).length === 0
                ) {
                    log.debug(
                        `Deleting empty library entry: ${jsonPath}: ${semantics.name}`
                    );
                    delete params.params;
                    delete parentParams[semantics.name];
                    return true;
                }
                return false;
            }
        );
    }
}
