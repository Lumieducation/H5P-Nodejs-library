import { ContentScanner } from './ContentScanner';
import Logger from './helpers/Logger';
import LibraryManager from './LibraryManager';
import { ILibraryName, ISemanticsEntry } from './types';

const log = new Logger('ContentFileScanner');

/**
 * Describes a reference to a file that is embedded inside the content.
 */
export interface IFileReference {
    /**
     * Information about where the file reference was found
     */
    context: {
        /**
         * The path of the object **inside the params tree**. You can use this
         * path to later modify the params, if needed.
         */
        jsonPath: string;
        /**
         * The raw parameters of the object.
         */
        params: any;
        /**
         * The semantic structure of the object (as defined in semantics.json).
         *
         * Can be null or undefined if there is no semantic structure for the
         * element (happens if the file can be found somewhere that is not
         * described by the semantics)
         */
        semantics?: ISemanticsEntry;
    };
    /**
     * The path of the file **inside the H5P content directory** as can be used
     * to reference it in ContentManager (without any suffixes like #tmp).
     */
    filePath: string;
    /**
     * The mime type specified in the params
     */
    mimeType?: string;
    /**
     * If true, the file was marked as temporary (by the #tmp suffix). The
     * suffix is **not included** in filePath
     */
    temporary: boolean;
}

/**
 * Scans the content parameters (=content.json) of a piece of content and
 * returns a list of references to file that are embedded inside the content.
 */
export class ContentFileScanner extends ContentScanner {
    constructor(libraryManager: LibraryManager) {
        super(libraryManager);
        log.info('initialize');
    }

    /**
     * Used to differentiate between local files and URLs.
     */
    private static urlRegExp: RegExp = /^https?:\/\//;

    /**
     * Loads the specified content from the ContentManager and scans its
     * parameters (= content.json) for references to local files (= audio,
     * video, images, generic files).
     * @param contentId the content to scan
     * @param user the user who wants to access the file
     * @returns a list of local files
     */
    public async scanForFiles(
        mainParams: any,
        mainLibraryName: ILibraryName
    ): Promise<IFileReference[]> {
        const results: IFileReference[] = [];
        await this.scanContent(
            mainParams,
            mainLibraryName,
            (semantics, params, jsonPath) => {
                log.debug(
                    `Checking entry ${jsonPath} (type ${semantics.type})`
                );
                switch (semantics.type) {
                    case 'file':
                    case 'image':
                        log.debug(`found ${semantics.type} element`);
                        const element = this.pushIfDefined(
                            results,
                            this.checkFileElement(semantics, params, jsonPath)
                        );
                        if (element) {
                            log.debug(
                                `Found file is a reference to ${element.filePath}`
                            );
                        }
                        if (params.originalImage) {
                            const originalImageElement = this.pushIfDefined(
                                results,
                                this.checkFileElement(
                                    null,
                                    params.originalImage,
                                    `${jsonPath}.originalImage`
                                )
                            );
                            if (originalImageElement) {
                                log.debug(
                                    `Found file is a reference to ${originalImageElement.filePath}`
                                );
                            }
                        }
                        return true; // returning true aborts further recursion
                    case 'video':
                    case 'audio':
                        if (Array.isArray(params)) {
                            for (
                                let index = 0;
                                index < params.length;
                                index += 1
                            ) {
                                const arrayElement = this.pushIfDefined(
                                    results,
                                    this.checkFileElement(
                                        null,
                                        params[index],
                                        `${jsonPath}[${index}]`
                                    )
                                );
                                if (arrayElement) {
                                    log.debug(
                                        `Found file is a reference to ${arrayElement.filePath}`
                                    );
                                }
                            }
                        }
                        return true; // returning true aborts further recursion
                    default:
                        return false;
                }
            }
        );
        return results;
    }

    /**
     * Checks if an element in the parameter tree contains a valid reference to
     * a local file and removes temporary markers.
     * @param semantics The semantic structure of the element to check
     * @param params the parameter object of the element to check
     * @param jsonPath the JSONPath at which the element can be found in the
     * parameter object
     * @returns an object with information about the file reference; undefined
     * if the file reference is invalid
     */
    private checkFileElement(
        semantics: ISemanticsEntry,
        params: any,
        jsonPath: string
    ): IFileReference {
        if (!params.path) {
            // Path shouldn't be empty, but we simply ignore the entry in this
            // case.
            return undefined;
        }
        if (ContentFileScanner.urlRegExp.test(params.path)) {
            // If the file is a reference to a URL, we don't return it.
            return undefined;
        }

        let temporary = false;
        let cleanFileReferencePath = params.path;
        if (params.path.endsWith('#tmp')) {
            // files marked as temporary will be identified as such
            temporary = true;
            cleanFileReferencePath = params.path.substr(
                0,
                params.path.length - 4
            );
        }

        return {
            context: { semantics, params, jsonPath },
            filePath: cleanFileReferencePath,
            mimeType: params.mime,
            temporary
        };
    }

    /**
     * Helper function that pushes an item to an array if the item is defined.
     * @param array the array to push to
     * @param item the item to push
     * @returns the item (if defined); otherwise undefined
     */
    private pushIfDefined<T>(array: T[], item: T): T {
        if (item !== undefined) {
            array.push(item);
            return item;
        }
        return undefined;
    }
}
