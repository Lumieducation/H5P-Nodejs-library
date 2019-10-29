import ContentManager from './ContentManager';
import LibraryManager from './LibraryManager';
import { ContentId, IUser, ISemanticsEntry } from './types';

import Logger from './helpers/Logger';
import LibraryName from './LibraryName';

const log = new Logger('ContentParser');

export default class ContentParser {
    constructor(
        private contentManager: ContentManager,
        private libraryManager: LibraryManager
    ) {
        log.info('initialize');
    }

    public async parseContent(
        contentId: ContentId,
        user: IUser
    ): Promise<void> {
        log.info(`parsing content for contentId ${contentId}`);

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

        const mainSemantics = await this.libraryManager.loadSemantics(
            libraryName
        );
        const params = await this.contentManager.loadContent(contentId, user);

        const result = [];
        await this.walkSemanticsRecursive(mainSemantics, params, result);
        log.debug(JSON.stringify(result, null, 2));
        throw new Error('not finished');
    }

    private async walkSemanticsRecursive(
        semantics: ISemanticsEntry[],
        params: any,
        result: any
    ): Promise<void> {
        for (let index = 0; index < semantics.length; index += 1) {
            await this.walkRecursive(
                semantics[index],
                params[semantics[index].name],
                result
            );
        }
    }

    private async walkRecursive(
        semanticsEntry: ISemanticsEntry,
        params: any,
        result: any
    ): Promise<void> {
        if (params === undefined && semanticsEntry.optional) {
            return;
        }
        if (!params === undefined) {
            throw new Error(
                `parameter for ${semanticsEntry.name} does not exist`
            );
        }
        const r: any = {};
        result.push(r);
        r.type = semanticsEntry.type;
        r.name = semanticsEntry.name;

        switch (semanticsEntry.type) {
            case 'file':
            case 'image':
                break;
            case 'audio':
            case 'video':
                break;
            case 'library':
                log.debug(`${semanticsEntry.name} is library.`);
                const libraryName = LibraryName.fromUberName(params.library, {
                    useWhitespace: true
                });
                log.debug(`Loaded semantics for library.`);
                const subSemantics = await this.libraryManager.loadSemantics(
                    libraryName
                );
                log.debug(
                    `Loaded semantics for ${LibraryName.toUberName(
                        libraryName
                    )}.`
                );
                r.params = [];
                await this.walkSemanticsRecursive(
                    subSemantics,
                    params.params,
                    r.params
                );
                break;
            case 'group':
                log.debug(`walking into group ${semanticsEntry.name}`);
                r.fields = [];
                for (const groupEntry of semanticsEntry.fields) {
                    log.debug(
                        `walking into group field ${semanticsEntry.name}`
                    );
                    await this.walkRecursive(
                        groupEntry,
                        params[groupEntry.name],
                        r.fields
                    );
                }
                break;
            case 'list':
                r.entries = [];
                log.debug(`walking into list ${semanticsEntry.name}`);
                for (const contentEntry of params) {
                    await this.walkRecursive(
                        semanticsEntry.field,
                        contentEntry,
                        r.entries
                    );
                }
                break;
        }
    }
}
