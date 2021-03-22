import { MongoClient, Db } from 'mongodb';

import { Logger } from '@lumieducation/h5p-server';

const log = new Logger('initMongo');

/**
 * Creates a MongoDB client.
 * You must either pass the configuration values through the parameters or set
 * them as environment variables.
 * @param url (optional) the connection URL for MongoDB (e.g. mongodb://localhost:27105)
 * Can also be set through the environment variable MONGODB_URL.
 * @param db (optional) the DB
 * Can also be set through the environment variable MONGODB_DB.
 * @param user (optional) a MongoDB user that can read and write the database
 * Can also be set through the environment variable MONGODB_USER.
 * @param password (optional) the password for the MongoDB user
 * Can also be set through the environment variable MONGODB_PASSWORD.
 * @returns the MongoDB client
 */
export default async (
    url?: string,
    db?: string,
    user?: string,
    password?: string
): Promise<Db> => {
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
                ignoreUndefined: true, // this is important as otherwise MongoDB
                // stores null for deliberately set undefined values!
                useUnifiedTopology: true
            }
        );

        return client.db(process.env.MONGODB_DB ?? db);
    } catch (error) {
        log.error(`Error while initializing MongoDB: ${error.message}`);
        throw error;
    }
};
