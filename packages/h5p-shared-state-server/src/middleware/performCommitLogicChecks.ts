import { IUser } from '@lumieducation/h5p-server';
import ShareDB from 'sharedb';
import { checkLogic } from 'src/LogicChecker';
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

        if (context.agent.custom.libraryMetadata.state?.snapshotLogicChecks) {
            const snapshotLogicCheck =
                await validatorRepository.getSnapshotLogicCheck(
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
    };
