import ContentManager from './ContentManager';
import { ContentScanner } from './ContentScanner';
import Logger from './helpers/Logger';
import LibraryManager from './LibraryManager';
import { ContentId, ISemanticsEntry, IUser } from './types';

const log = new Logger('ContentFileScanner');

/**
 * Describes a file that was found inside the paramters of a piece of content.
 */
export interface IFileScanResult {
    context: {
        /**
         * The parameters of the object.
         */
        params: any;
        /**
         * The path of the object **inside the params tree**. You can use this path
         * to later modify the params, if needed.
         */
        path: string;
        /**
         * The semantic structure of the object (as defined in semantics.json)
         * .
         * Can be null or undefined if there is not semantic structure for the element
         * (happens if the file can be found somewhere that is not described by the
         * semantics)
         */
        semantics?: ISemanticsEntry;
    };
    /**
     * The path of the file **inside the H5P content directory**.
     */
    path: string;
    /**
     * If true, the file was marked as temporary (by the #tmp suffix).
     */
    temporary: boolean;
}

export class ContentFileScanner extends ContentScanner {
    constructor(
        contentManager: ContentManager,
        libraryManager: LibraryManager
    ) {
        super(contentManager, libraryManager);
        log.info('initialize');
    }

    // tslint:disable-next-line: typedef
    private static urlRegexp = /^https?:\/\//;

    public async scanForFiles(
        contentId: ContentId,
        user: IUser
    ): Promise<IFileScanResult[]> {
        const results: IFileScanResult[] = [];
        await this.scanContent(contentId, user, (semantics, params, path) => {
            log.debug(`Checking entry ${path} (type ${semantics.type})`);
            switch (semantics.type) {
                case 'file':
                case 'image':
                    log.debug(`found ${semantics.type} element`);
                    const element = this.pushIfDefined(
                        results,
                        this.checkFile(semantics, params, path)
                    );
                    if (element) {
                        log.debug(
                            `Found file is a reference to ${element.path}`
                        );
                    }
                    if (params.originalImage) {
                        const originalImageElement = this.pushIfDefined(
                            results,
                            this.checkFile(
                                null,
                                params.originalImage,
                                `${path}.originalImage`
                            )
                        );
                        if (originalImageElement) {
                            log.debug(
                                `Found file is a reference to ${originalImageElement.path}`
                            );
                        }
                    }
                    return true; // returning true aborts further recursion
                case 'video':
                case 'audio':
                    if (Array.isArray(params)) {
                        for (let index = 0; index < params.length; index += 1) {
                            const arrayElement = this.pushIfDefined(
                                results,
                                this.checkFile(
                                    null,
                                    params[index],
                                    `${path}[${index}]`
                                )
                            );
                            if (arrayElement) {
                                log.debug(
                                    `Found file is a reference to ${arrayElement.path}`
                                );
                            }
                        }
                    }
                    return true; // returning true aborts further recursion
            }
            return false;
        });
        return results;
    }

    private checkFile(
        semantics: ISemanticsEntry,
        params: any,
        path: string
    ): IFileScanResult {
        if (!params.path) {
            // Path shouldn't be empty, but we simply ignore the entry in this case.
            return undefined;
        }
        if (ContentFileScanner.urlRegexp.test(params.path)) {
            // if the file is a reference to a URL, we don't return it.
            return undefined;
        }

        let temporary = false;
        let cleanPath = params.path;
        if (params.path.endsWith('#tmp')) {
            // files marked as temporary will be identified as such
            temporary = true;
            cleanPath = params.path.substr(0, params.path.length - 4);
        }

        return {
            context: { semantics, params, path },
            path: cleanPath,
            temporary
        };
    }

    private pushIfDefined<T>(array: T[], item: T): T {
        if (item !== undefined) {
            array.push(item);
            return item;
        }
        return undefined;
    }
}
