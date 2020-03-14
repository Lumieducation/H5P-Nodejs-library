import ContentManager from './ContentManager';
import Logger from './helpers/Logger';
import LibraryManager from './LibraryManager';
import LibraryName from './LibraryName';
import { ILibraryName, ISemanticsEntry } from './types';

const log = new Logger('ContentScanner');

/**
 * @param semantics The semantic information about the current content params
 * @param params The current current params
 * @param jsonPath The current path of the object in the tree as a JSON path (example: .media.type.path)
 * @returns true if the children of this entry should not be scanned (= abort scan for this subtree)
 */
export type ScanCallback = (
    semantics: ISemanticsEntry,
    params: any,
    jsonPath: string
) => boolean;

/**
 * Scans the content parameters (= content.json) of a piece of content and calls a callback for each
 * element in the semantic tree. This includes all nested pieces of content.
 */
export class ContentScanner {
    constructor(private libraryManager: LibraryManager) {
        log.info('initialize');
    }

    /**
     * Scans the specified parameters and executes the callback for every element in the tree.
     * This includes nested content!
     * @param contentId the piece of content
     * @param user the user who executes the action
     * @param callback a function that is executed for every element in the semantic structure
     */
    public async scanContent(
        params: any,
        mainLibraryName: ILibraryName,
        callback: ScanCallback
    ): Promise<void> {
        log.info(
            `scanning content for of type ${LibraryName.toUberName(
                mainLibraryName
            )}`
        );

        const mainSemantics = await this.libraryManager.getSemantics(
            mainLibraryName
        );
        await this.walkSemanticsRecursive(mainSemantics, params, '$', callback);
    }

    /**
     * Walks through an element in the semantic tree of a library.
     * @param elementSemantics the semantic information for the current element
     * @param elementParams the parameters for the current element (as in content.json)
     * @param parentJsonPath the JSON path of the parent (example: .media.type)
     * @param callback a function that is executed for this element and for every child
     * @param doNotAddNameToJsonPath if true, the name of the current element will not appended to the JSON path
     * This is the case when a group contains only one element. Then the child's name is omitted in the parameters.
     */
    private async walkEntryRecursive(
        elementSemantics: ISemanticsEntry,
        elementParams: any,
        parentJsonPath: string,
        callback: ScanCallback,
        doNotAddNameToJsonPath: boolean = false
    ): Promise<void> {
        if (elementParams === undefined && !elementSemantics.optional) {
            log.info(
                `${elementSemantics.name} has no params but is not optional.`
            );
        }

        // we ignore elements that are not used in the parameters
        if (elementParams === undefined) {
            return;
        }

        // Don't append our name to the JSON path if our parent signalled us not to do so
        const currentJsonPath = doNotAddNameToJsonPath
            ? parentJsonPath
            : `${parentJsonPath}.${elementSemantics.name}`;

        // Treating a special case of how group deals with fields with only one entry.
        if (
            elementSemantics.type === 'group' &&
            elementSemantics.fields.length === 1 &&
            !elementParams[elementSemantics.name]
        ) {
            // The parameters produced by H5P are weird in this case: You would expect the parameters
            // to be an array with a single entry [{...}], as the semantic structure defines a group with a single entry.
            // For some reason, H5P directly puts the object {...} into the parameters. We have to
            // compensate for this special case.

            log.debug(`found single group entry ${currentJsonPath}`);
            await this.walkEntryRecursive(
                elementSemantics.fields[0],
                elementParams,
                doNotAddNameToJsonPath
                    ? parentJsonPath
                    : `${parentJsonPath}.${elementSemantics.name}`,
                callback,
                true // we have already added the parent's name to the JSON path, so
                // we don't want the child to add its name
            );
            return;
        }

        if (callback(elementSemantics, elementParams, currentJsonPath)) {
            // don't walk further into the tree if the callback signalled to stop
            return;
        }

        switch (elementSemantics.type) {
            case 'library':
                // If an element contains another library, we have to retrieve the exact name,
                // and the nested content parameters.
                if (elementParams.library === undefined) {
                    // Skip if the element is empty. (= unused)
                    return;
                }
                const subLibraryName = LibraryName.fromUberName(
                    elementParams.library,
                    {
                        useWhitespace: true
                    }
                );
                const subSemantics = await this.libraryManager.getSemantics(
                    subLibraryName
                );
                await this.walkSemanticsRecursive(
                    subSemantics,
                    elementParams.params,
                    `${currentJsonPath}.params`,
                    callback
                );
                break;
            case 'group':
                // groups contain several semantic entries, each with their own parameters.
                for (const groupElement of elementSemantics.fields) {
                    await this.walkEntryRecursive(
                        groupElement,
                        elementParams[groupElement.name],
                        currentJsonPath,
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
                        `${currentJsonPath}[${counter}]`,
                        callback,
                        true // we don't want the field name of a list to be added to the JSON path
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
     * @param parentJsonPath the path of the parent
     * @param callback the callback to execute for every element in the tree
     */
    private async walkSemanticsRecursive(
        semantics: ISemanticsEntry[],
        params: any,
        parentJsonPath: string,
        callback: ScanCallback
    ): Promise<void> {
        for (const semanticEntry of semantics) {
            await this.walkEntryRecursive(
                semanticEntry,
                params[semanticEntry.name],
                parentJsonPath,
                callback
            );
        }
    }
}
