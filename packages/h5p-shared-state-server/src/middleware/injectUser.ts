import ShareDB from 'sharedb';
import debug from 'debug';

const log = debug('h5p:SharedStateServer:injectUser');

/**
 * Injects the user information from the request into the sharedb context
 */
export default async (
    context: ShareDB.middleware.ConnectContext,
    next: (err?: any) => void
): Promise<void> => {
    log('Connected client');
    if (context.req) {
        context.agent.custom = {
            user: context.req.user,
            fromServer: false
            // indicates if this a real user request from the client or
            // an internal request created by the server itself
        };
    } else {
        log('Client resides on the server');
        context.agent.custom = { fromServer: true };
    }
    next();
};
