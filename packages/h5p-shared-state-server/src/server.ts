import Ajv from 'ajv/dist/2020';
import fsExtra from 'fs-extra';
import http from 'http';
import path from 'path';
import ShareDB from 'sharedb';
import WebSocket from 'ws';
import WebSocketJSONStream from '@teamwork/websocket-json-stream';

export default class SharedStateServer {
    constructor(httpServer: http.Server) {
        this.setupShareDBBackend();

        // Connect any incoming WebSocket connection to ShareDB
        const wss = new WebSocket.Server({
            server: httpServer,
            path: '/shared-state'
        });
        wss.on('connection', (ws, request) => {
            console.log('Websocket connected');

            this.getSession(request);

            const stream = new WebSocketJSONStream(ws);
            this.backend.listen(stream);
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
        this.backend.use('submit', (context, next) => {
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

    // Gets the current session from a WebSocket connection.
    // Draws from http://stackoverflow.com/questions/36842159/node-js-ws-and-express-session-how-to-get-session-object-from-ws-upgradereq
    private getSession = (req: { headers: any }): void => {
        const headers = req.headers;

        // If there's no cookie, there's no session, so do nothing.
        if (!headers.cookie) {
            return;
        }

        // If there's a cookie, get the session id from it.
        console.log(headers.cookie);
    };
}
