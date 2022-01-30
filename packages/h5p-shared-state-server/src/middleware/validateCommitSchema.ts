import { IUser } from '@lumieducation/h5p-server';
import ShareDB from 'sharedb';
import { ISharedStateAgent } from '../types';
import ValidatorRepository from '../ValidatorRepository';

export default (validatorRepository: ValidatorRepository) =>
    async (
        context: ShareDB.middleware.CommitContext<ISharedStateAgent>,
        next: (err?: any) => void
    ): Promise<void> => {
        const user = context.agent.custom.user as IUser;

        if (context.agent.custom.fromServer) {
            return next();
        }

        if (!user && !context.agent.custom.fromServer) {
            return next(new Error('No user data in submit request'));
        }

        if (context.agent.custom.libraryMetadata.state?.snapshotSchema) {
            const snapshotSchemaValidator =
                await validatorRepository.getSnapshotSchemaValidator(
                    context.agent.custom.libraryMetadata
                );
            if (!snapshotSchemaValidator(context.snapshot.data)) {
                console.log(
                    "rejecting change as resulting state doesn't conform to schema"
                );
                return next("Resulting state doesn't conform to schema");
            }
        }
        console.log('commit schema validation passed');
        next();
    };
