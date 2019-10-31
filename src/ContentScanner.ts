import ContentManager from './ContentManager';
import Logger from './helpers/Logger';
import LibraryManager from './LibraryManager';
import LibraryName from './LibraryName';
import { ContentId, ISemanticsEntry, IUser } from './types';

const log = new Logger('ContentScanner');

/**
 * @param semantics The semantic information about the current content params
 * @param params The current current params
 * @param path The current path of the object in the tree as a JSON path (example: .media.type.path)
 * @returns true if the children of this entry should not be scanned (= abort scan for this subtree)
 */
export type ScanCallback = (
    semantics: ISemanticsEntry,
    params: any,
    path: string
) => boolean;

/**
 * Scans the content parameters of a piece of content and calls a callback for each
 * element in the semantic tree.This includes all nested pieces of content.
 */
export class ContentScanner {
    constructor(
        private contentManager: ContentManager,
        private libraryManager: LibraryManager
    ) {
        log.info('initialize');
    }

    /**
     * Scans the specified content and executes the callback for every element in the tree.
     * This includes nested content!
     * @param contentId the piece of content
     * @param user the user who executes the action
     * @param callback a function that is executed for every element in the semantic structure
     */
    public async scanContent(
        contentId: ContentId,
        user: IUser,
        callback: ScanCallback
    ): Promise<void> {
        log.info(`scanning content for contentId ${contentId}`);

        // load metadata for content
        const contentMetadata = await this.contentManager.loadH5PJson(
            contentId,
            user
        );

        // get main library ubername
        const libraryName = contentMetadata.preloadedDependencies.find(
            ln => ln.machineName === contentMetadata.mainLibrary
        );
        log.debug(
            `main library is ${libraryName.machineName}-${libraryName.majorVersion}.${libraryName.minorVersion}`
        );

        // load semantics && params
        const mainSemantics = await this.libraryManager.loadSemantics(
            libraryName
        );
        const params = await this.contentManager.loadContent(contentId, user);

        await this.walkSemanticsRecursive(mainSemantics, params, '', callback);
    }

    /**
     * Walks through an element in the semantic tree of a library.
     * @param elementSemantics the semantic information for the current element
     * @param elementParams the paramters for the current element (as in content.json)
     * @param parentPath the JSON path of the parent (example: .media.type)
     * @param callback a function that is executed for this element and for every child
     */
    private async walkEntryRecursive(
        elementSemantics: ISemanticsEntry,
        elementParams: any,
        parentPath: string,
        callback: ScanCallback
    ): Promise<void> {
        if (elementParams === undefined && !elementSemantics.optional) {
            log.info(
                `${elementSemantics.name} has no params but is not optional.`
            );
        }
        if (elementParams === undefined) {
            // we ignore elements that are not used in the parameters
            return;
        }

        const currentPath = `${parentPath}.${elementSemantics.name}`;
        if (
            elementSemantics.type === 'group' &&
            elementSemantics.fields.length === 1 &&
            elementSemantics.fields[0].name === elementSemantics.name &&
            !elementParams[elementSemantics.name]
        ) {
            // The parameters produced by H5P are weird in this case: You would expect the parameters
            // to be an array with a single entry [{...}], as the semantic structure defines a group with a single entry.
            // For some reason, H5P directly puts the object {...} into the parameters. We have to
            // compensate for this special case.
            log.debug(`found single group entry ${currentPath}`);
            await this.walkEntryRecursive(
                elementSemantics.fields[0],
                elementParams,
                parentPath,
                callback
            );
            return;
        }

        if (callback(elementSemantics, elementParams, currentPath)) {
            // don't walk further into the tree if the callback signalled to stop
            return;
        }

        switch (elementSemantics.type) {
            case 'library':
                // If content contains another library, we have to retrieve the exact name,
                // and the nested content parameters.
                if(elementParams.library === undefined)
                {
                    // Skip if the element is empty.
                    return;
                }
                const subLibraryName = LibraryName.fromUberName(
                    elementParams.library,
                    {
                        useWhitespace: true
                    }
                );
                const subSemantics = await this.libraryManager.loadSemantics(
                    subLibraryName
                );
                await this.walkSemanticsRecursive(
                    subSemantics,
                    elementParams.params,
                    currentPath,
                    callback
                );
                break;
            case 'group':
                // groups contain several semantic entries, each with their own parameters.
                for (const groupElement of elementSemantics.fields) {
                    await this.walkEntryRecursive(
                        groupElement,
                        elementParams[groupElement.name],
                        currentPath,
                        callback
                    );
                }
                break;
            case 'list':
                // lists contain one semantic entry, but several content elements
                let counter = 0;
                for (const listElement of elementParams) {
                    await this.walkEntryRecursive(
                        elementSemantics.field,
                        listElement,
                        `${currentPath}[${counter}]`,
                        callback
                    );
                    counter += 1;
                }
                break;
        }
    }

    /**
     * Walks through all semantic entries in a library semantics.
     * @param semantics the semantic structure of a library
     * @param params the parameter object for the content
     * @param parentPath the path of the parent
     * @param callback the callback to execute for every element in the tree
     */
    private async walkSemanticsRecursive(
        semantics: ISemanticsEntry[],
        params: any,
        parentPath: string,
        callback: ScanCallback
    ): Promise<void> {
        for (const semanticEntry of semantics) {
            await this.walkEntryRecursive(
                semanticEntry,
                params[semanticEntry.name],
                parentPath,
                callback
            );
        }
    }
}
