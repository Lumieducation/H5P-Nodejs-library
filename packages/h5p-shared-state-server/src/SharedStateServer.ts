import http from 'http';
import ShareDB from 'sharedb';
import WebSocket from 'ws';
import WebSocketJSONStream from '@teamwork/websocket-json-stream';
import { promisify } from 'util';
import debug from 'debug';

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

const log = debug('h5p:SharedStateServer:SharedStateServer');

/**
 * Main entry point into the share-state functionality.
 *
 * This class opens a Websocket on the server to which clients can connect to
 * and send ops via ShareDB to modify the shared state. The shared state
 * validates the changes against the library schema, propagates them to the
 * other connected clients and persists the state.
 */
export default class SharedStateServer {
    /**
     *
     * @param httpServer a http server that can be used to open the websocket
     * @param getLibraryMetadata return the library metadata (= library.json)
     * for a library
     * @param getLibraryFileAsJson  return an arbitrary JSON file for a specific
     * library; throw an error if the file doesn't exist or if it's not JSON
     * @param requestToUserCallback converts the request that is used to
     * initiate the websocket connection to the user object for the user who is
     * making the request; this is used to authenticate a user who connects to
     * the websocket
     * @param getPermissionForUser returns the permission a user has to a
     * specific content object
     * @param getContentMetadata returns the metadata (h5p.json) for a piece of
     * content
     * @param getContentParameters returns the parameters (content.json) for a
     * piece of content
     */
    constructor(
        httpServer: http.Server,
        private getLibraryMetadata: GetLibraryMetadataFunction,
        getLibraryFileAsJson: GetLibraryFileAsJsonFunction,
        private requestToUserCallback: RequestToUserFunction,
        private getPermissionForUser: GetPermissionForUserFunction,
        private getContentMetadata: GetContentMetadataFunction,
        private getContentParameters: GetContentParametersFunction,
        private options?: {
            baseUrl?: string;
        }
    ) {
        // The URL building method assumes there is no trailing slash in the
        // baseUrl, so we make sure the baseUrl doesn't include one.
        if (this.options?.baseUrl && this.options.baseUrl.endsWith('/')) {
            this.options.baseUrl = this.options.baseUrl.substring(
                0,
                this.options.baseUrl.length - 1
            );
        }

        this.validatorRepository = new ValidatorRepository(
            getLibraryFileAsJson
        );
        this.setupShareDBMiddleware();

        // Connect any incoming WebSocket connection to ShareDB
        const wss = new WebSocket.Server({
            server: httpServer,
            path: this.getWsUrl()
        });
        wss.on('connection', async (ws, request) => {
            log('Websocket connected');

            // We authenticate with a callback
            const user = await this.requestToUserCallback(request);
            (request as any).user = user;

            const stream = new WebSocketJSONStream(ws);
            this.backend.listen(stream, request);
            ws.on('close', () => {
                log('Websocket disconnected');
            });
        });
    }

    private backend: ShareDB;

    /**
     * We cache validators in a repository to avoid constructing them over and
     * over. (They are used for every request)
     */
    private validatorRepository: ValidatorRepository;

    /**
     * Call this method when a content object is deleted or changed in the host
     * system. This will delete the state from the system (and also notify users
     * who are currently connected)
     * @param contentId
     */
    public deleteState = async (contentId: string): Promise<void> => {
        log('Deleting shared user state for contentId %s', contentId);
        const connection = this.backend.connect();
        const doc = connection.get('h5p', contentId);

        // The ShareDB API is not promisified and relies on on this usage, so we
        // have to bind the Promises
        await promisify(doc.fetch).bind(doc)();
        try {
            await promisify(doc.del).bind(doc)({});
        } catch (error) {
            console.error(error);
        }

        // TODO: delete state in DB storage once implemented
    };

    /**
     * Adds all the required middleware to a new ShareDB object
     */
    private setupShareDBMiddleware(): void {
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

        // We use 'apply' for the op logic checks as we have access to the old
        // snapshot then, which we wouldn't have in 'submit'. Some OP checks
        // require the old snapshot.
        this.backend.use(
            'apply',
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

    /**
     * @returns the URL at which the websocket should be opened.
     */
    private getWsUrl(): string {
        if (this.options?.baseUrl) {
            return `${this.options.baseUrl}/shared-state`;
        }

        return '/shared-state';
    }
}
