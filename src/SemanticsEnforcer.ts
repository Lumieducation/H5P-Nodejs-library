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
                let deleteMe = false;
                if (semantics.type === 'library') {
                    // See h5p.classes.php:3994 for how the PHP implementation does things.
                    if (!params.library) {
                        log.debug(
                            `Found a library entry without a library property (${jsonPath}).`
                        );
                        // We silently delete the params in this case, as the
                        // H5P editor sometimes creates malformed library
                        // entries and this is not an error by the user.
                        deleteMe = true;
                    } else {
                        const allowedLibraries = semantics.options
                            ?.map((o) => (typeof o === 'string' ? o : o.name))
                            ?.filter((o) => o);
                        if (
                            !allowedLibraries ||
                            !allowedLibraries.includes(params.library)
                        ) {
                            log.debug(
                                `Library check: Found a library entry with a library that is not specified in the options. Allowed are: ${allowedLibraries.join(
                                    ', '
                                )}. Library is set to: ${
                                    params.library
                                } (${jsonPath}).`
                            );
                            deleteMe = true;
                        }
                    }
                    // Further checks:
                    // - Check if library version is only a different version
                    //   from the one specified in options, or if library is not
                    //   allowed in general. (delete the params entry in either
                    //   case, but report different errors)
                    // - Validate subcontent metadata (.metadata property)
                    // - Filter out params that are not valid per se (only
                    //   library, params, subContentId, metadata and the list in
                    //   'extraAttributes' is allowed). Remove all other keys in
                    //   params.
                    // - If subContentId exists: check if it is a properly
                    //   formatted string
                    //   (/^\{?[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\}?$/)
                    //   and delete the subContentId if it's not.
                }
                if (deleteMe) {
                    log.debug(
                        `Enforcing library semantics by deleting params path ${jsonPath}.`
                    );
                    delete parentParams[semantics.name];
                    return true;
                }
                return false;
            }
        );
    }
}
