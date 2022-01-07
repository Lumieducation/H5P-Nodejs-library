import ShareDB from 'sharedb';

export default async (
    context: ShareDB.middleware.ConnectContext,
    next: (err?: any) => void
): Promise<void> => {
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
};
