import { MongoClient } from 'mongodb';

export default async (
    url?: string,
    db?: string,
    user?: string,
    password?: string
) => {
    try {
        const auth = process.env.MONGODB_USER
            ? {
                  password: process.env.MONGODB_PASSWORD,
                  user: process.env.MONGODB_USER
              }
            : user
            ? {
                  user,
                  password
              }
            : undefined;

        const client = await MongoClient.connect(
            process.env.MONGODB_URL ?? url,
            {
                auth,
                ignoreUndefined: true // this is important as otherwise mongo
                // stores null for deliberately set
                // undefined values!
            }
        );

        return client.db(process.env.MONGODB_DB ?? db);
    } catch (error) {
        throw error;
    }
};
