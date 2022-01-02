import Ajv from 'ajv/dist/2020';
import fsExtra from 'fs-extra';
import http from 'http';
import path from 'path';
import ShareDB from 'sharedb';
import WebSocket from 'ws';
import WebSocketJSONStream from '@teamwork/websocket-json-stream';
import {
    LibraryManager,
    ContentManager,
    LibraryName,
    IUser
} from '@lumieducation/h5p-server';

export default class SharedStateServer {
    constructor(
        httpServer: http.Server,
        private libraryManager: LibraryManager,
        private contentManager: ContentManager,
        private requestToUserCallback: (req: any) => Promise<IUser>,
        private getPermissionForUser: (
            user: IUser,
            contentId: string
        ) => Promise<'privileged' | 'user' | undefined>
    ) {
        this.setupShareDBBackend();

        // Connect any incoming WebSocket connection to ShareDB
        const wss = new WebSocket.Server({
            server: httpServer,
            path: '/shared-state'
        });
        wss.on('connection', async (ws, request) => {
            console.log('Websocket connected');

            const user = await this.requestToUserCallback(request);
            (request as any).user = user;

            const stream = new WebSocketJSONStream(ws);
            this.backend.listen(stream, request);
            ws.on('close', () => {
                console.log('Websocket disconnected');
            });
        });
    }

    private backend: ShareDB;

    private setupShareDBBackend(): void {
        const ajv = new Ajv();

        const opSchema = fsExtra.readJSONSync(
            path.join(__dirname, '../opSchema.json')
        );
        const opSchemaValidator = ajv.compile(opSchema);

        const stateSchema = fsExtra.readJSONSync(
            path.join(__dirname, '../stateSchema.json')
        );
        const stateSchemaValidator = ajv.compile(stateSchema);

        this.backend = new ShareDB();

        this.backend.use('connect', async (context, next) => {
            console.log('connected');
            if (context.req) {
                context.agent.custom = {
                    user: context.req.user,
                    fromServer: false
                    // indicates if this a real user request from the client or
                    // an internal request created by the server itself
                };
            } else {
                context.agent.custom = { fromServer: true };
            }
            next();
        });

        this.backend.use('submit', async (context, next) => {
            const contentId = context.id;
            const user = context.agent.custom.user as IUser;
            const permission = await this.getPermissionForUser(user, contentId);

            if (!permission) {
                console.log(
                    'User tried to access content without proper permission.'
                );
                return next(
                    'You do not have permission to access this content.'
                );
            }
            context.agent.custom.permission = permission;

            console.log(
                'User',
                user.id,
                '(',
                user.name,
                ')',
                'is accessing',
                contentId,
                'with access level',
                permission
            );

            if (contentId) {
                const contentMetadata =
                    await this.contentManager.getContentMetadata(
                        contentId,
                        user
                    );
                const libraryMetadata = await this.libraryManager.getLibrary(
                    contentMetadata.preloadedDependencies.find(
                        (d) => d.machineName === contentMetadata.mainLibrary
                    )
                );
                if (libraryMetadata.requiredExtensions?.sharedState !== 1) {
                    console.log(
                        `Library ${LibraryName.toUberName(
                            libraryMetadata
                        )} uses unsupported shared state extension: The library requires v${
                            libraryMetadata.requiredExtensions?.sharedState
                        } but this application only supports v1.`
                    );
                    // Unknown extension version ... Aborting.
                    next(
                        `Library ${LibraryName.toUberName(
                            libraryMetadata
                        )} uses unsupported shared state extension: The library requires v${
                            libraryMetadata.requiredExtensions?.sharedState
                        } but this application only supports v1.`
                    );
                    return;
                }
            }

            console.log('submit', JSON.stringify(context.op));
            console.log(context.op.op);
            if (!context.op?.op || opSchemaValidator(context.op.op)) {
                next();
            } else {
                console.log("rejecting change as op doesn't conform to schema");
                next("Op doesn't conform to schema");
            }
        });

        this.backend.use('commit', (context, next) => {
            console.log('commit', JSON.stringify(context.snapshot));
            if (stateSchemaValidator(context.snapshot.data)) {
                next();
            } else {
                console.log(
                    "rejecting change as resulting state doesn't conform to schema"
                );
                next("Resulting state doesn't conform to schema");
            }
        });
    }
}
