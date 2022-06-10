import { IUser } from '@lumieducation/h5p-server';
import ShareDB from 'sharedb';
import debug from 'debug';

import { ISharedStateAgent } from '../types';
import ValidatorRepository from '../ValidatorRepository';

const log = debug('h5p:SharedStateServer:validateCommitSchema');

export default (validatorRepository: ValidatorRepository) =>
    async (
        context: ShareDB.middleware.CommitContext,
        next: (err?: any) => void
    ): Promise<void> => {
        const agent = context.agent.custom as ISharedStateAgent;
        const user = agent.user as IUser;

        if (agent.fromServer) {
            log('letting op from server pass through');
            return next();
        }

        if (!user && !agent.fromServer) {
            return next(new Error('No user data in submit request'));
        }

        if (agent.libraryMetadata.state?.snapshotSchema) {
            const snapshotSchemaValidator =
                await validatorRepository.getSnapshotSchemaValidator(
                    agent.libraryMetadata
                );
            if (!snapshotSchemaValidator(context.snapshot.data)) {
                log(
                    "rejecting change as resulting state doesn't conform to schema"
                );
                return next("Resulting state doesn't conform to schema");
            }
        }
        log('commit schema validation passed');
        next();
    };
