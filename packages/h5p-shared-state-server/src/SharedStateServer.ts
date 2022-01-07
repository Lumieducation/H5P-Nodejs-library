import http from 'http';
import ShareDB from 'sharedb';
import WebSocket from 'ws';
import WebSocketJSONStream from '@teamwork/websocket-json-stream';
import { promisify } from 'util';

import ValidatorRepository from './ValidatorRepository';
import injectUser from './middleware/injectUser';
import {
    GetContentMetadataFunction,
    GetContentParametersFunction,
    GetLibraryFileAsJsonFunction,
    GetLibraryMetadataFunction,
    GetPermissionForUserFunction,
    RequestToUserFunction
} from './types';
import checkPermissionsAndInjectContentContext from './middleware/checkPermissionsAndInjectContentContext';
import validateOpSchema from './middleware/validateOpSchema';
import performOpLogicChecks from './middleware/performOpLogicChecks';
import validateCommitSchema from './middleware/validateCommitSchema';
import performCommitLogicChecks from './middleware/performCommitLogicChecks';

/**
 * This class opens a Websocket on the server to which clients can connect to
 * and send ops via ShareDB to modify the shared state. The shared state
 * validates the changes against the library schema, propagates them to the
 * other connected clients and persists the state.
 */
export default class SharedStateServer {
    constructor(
        httpServer: http.Server,
        private getLibraryMetadata: GetLibraryMetadataFunction,
        getLibraryFileAsJson: GetLibraryFileAsJsonFunction,
        private requestToUserCallback: RequestToUserFunction,
        private getPermissionForUser: GetPermissionForUserFunction,
        private getContentMetadata: GetContentMetadataFunction,
        private getContentParameters: GetContentParametersFunction
    ) {
        this.validatorRepository = new ValidatorRepository(
            getLibraryFileAsJson
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
        this.backend.use('connect', injectUser);

        // "Submit" is the earliest point at which we can check individual
        // messages by the client.
        this.backend.use(
            'submit',
            checkPermissionsAndInjectContentContext(
                this.getPermissionForUser,
                this.getLibraryMetadata,
                this.getContentMetadata,
                this.getContentParameters
            )
        );
        this.backend.use('submit', validateOpSchema(this.validatorRepository));
        this.backend.use(
            'submit',
            performOpLogicChecks(this.validatorRepository)
        );

        // "Commit" means the changes of the ops were applied to the old
        // snapshot and there is a new one that we can check.
        this.backend.use(
            'commit',
            validateCommitSchema(this.validatorRepository)
        );
        this.backend.use(
            'commit',
            performCommitLogicChecks(this.validatorRepository)
        );
    }
}
