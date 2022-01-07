import http from 'http';
import ShareDB from 'sharedb';
import WebSocket from 'ws';
import WebSocketJSONStream from '@teamwork/websocket-json-stream';
import {
    LibraryManager,
    ContentManager,
    LibraryName,
    IUser
} from '@lumieducation/h5p-server';
import { promisify } from 'util';

import { checkLogic } from './LogicChecker';
import ValidatorRepository from './ValidatorRepository';

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
        this.validatorRepository = new ValidatorRepository(
            libraryManager.libraryStorage.getFileAsJson.bind(
                libraryManager.libraryStorage
            )
        );
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
    private validatorRepository: ValidatorRepository;

    public deleteState = async (contentId: string): Promise<void> => {
        console.log('deleting shared user state for contentId', contentId);
        const connection = this.backend.connect();
        const doc = connection.get('h5p', contentId);
        await promisify(doc.fetch).bind(doc)();
        try {
            await promisify(doc.del).bind(doc)({});
        } catch (error) {
            console.error(error);
        }

        // TODO: delete state in DB storage once implemented
    };

    private setupShareDBBackend(): void {
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

            if (context.agent.custom.fromServer) {
                return next();
            }

            if (!user && !context.agent.custom.fromServer) {
                return next(new Error('No user data in submit request'));
            }

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
                    return next(
                        new Error(
                            `Library ${LibraryName.toUberName(
                                libraryMetadata
                            )} uses unsupported shared state extension: The library requires v${
                                libraryMetadata.requiredExtensions?.sharedState
                            } but this application only supports v1.`
                        )
                    );
                }
                const params = await this.contentManager.getContentParameters(
                    contentId,
                    user
                );
                context.agent.custom.params = params;

                context.agent.custom.ubername =
                    LibraryName.toUberName(libraryMetadata);
                context.agent.custom.libraryMetadata = libraryMetadata;
            }

            console.log('submit', JSON.stringify(context.op));
            console.log(context.op.op);
            if (context.op) {
                if (context.agent.custom.libraryMetadata.state?.opSchema) {
                    const opSchemaValidator =
                        await this.validatorRepository.getOpSchemaValidator(
                            context.agent.custom.libraryMetadata
                        );
                    if (
                        !opSchemaValidator({
                            op: context.op.op,
                            create: context.op.create
                        })
                    ) {
                        console.log(
                            "rejecting change as op doesn't conform to schema"
                        );
                        return next("Op doesn't conform to schema");
                    }
                }
                if (context.agent.custom.libraryMetadata.state?.opLogicCHecks) {
                    const opLogicCheck =
                        await this.validatorRepository.getOpLogicCheck(
                            context.agent.custom.libraryMetadata
                        );
                    if (
                        !checkLogic(
                            {
                                op: context.op.op,
                                create: context.op.create,
                                params: context.agent.custom.params,
                                context: {
                                    user: context.agent.custom.user,
                                    permission: context.agent.custom.permission
                                }
                            },
                            opLogicCheck
                        )
                    ) {
                        console.log(
                            "rejecting change as op doesn't conform to logic checks"
                        );
                        return next("Op doesn't conform to logic checks");
                    }
                }
            }
            next();
        });

        this.backend.use('commit', async (context, next) => {
            console.log('commit', JSON.stringify(context.snapshot));
            const user = context.agent.custom.user as IUser;

            if (context.agent.custom.fromServer) {
                return next();
            }

            if (!user && !context.agent.custom.fromServer) {
                return next(new Error('No user data in submit request'));
            }

            if (context.agent.custom.libraryMetadata.state?.snapshotSchema) {
                const snapshotSchemaValidator =
                    await this.validatorRepository.getSnapshotSchemaValidator(
                        context.agent.custom.libraryMetadata
                    );
                if (!snapshotSchemaValidator(context.snapshot.data)) {
                    console.log(
                        "rejecting change as resulting state doesn't conform to schema"
                    );
                    return next("Resulting state doesn't conform to schema");
                }
            }

            if (
                context.agent.custom.libraryMetadata.state?.snapshotLogicChecks
            ) {
                const snapshotLogicCheck =
                    await this.validatorRepository.getSnapshotLogicCheck(
                        context.agent.custom.libraryMetadata
                    );
                if (
                    !checkLogic(
                        {
                            snapshot: context.snapshot.data,
                            params: context.agent.custom.params,
                            context: {
                                user: context.agent.custom.user,
                                permission: context.agent.custom.permission
                            }
                        },
                        snapshotLogicCheck
                    )
                ) {
                    console.log(
                        "rejecting change as snapshot doesn't conform to logic checks"
                    );
                    return next("Snapshot doesn't conform to logic checks");
                }
            }

            next();
        });
    }
}
