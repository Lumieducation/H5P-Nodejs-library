import { IUser } from '@lumieducation/h5p-server';
import ShareDB from 'sharedb';
import debug from 'debug';

import { checkLogic } from '../LogicChecker';
import { ISharedStateAgent } from '../types';
import ValidatorRepository from '../ValidatorRepository';

const log = debug('h5p:SharedStateServer:performCommitLogicChecks');

export default (validatorRepository: ValidatorRepository) =>
    async (
        context: ShareDB.middleware.CommitContext<ISharedStateAgent>,
        next: (err?: any) => void
    ): Promise<void> => {
        const user = context.agent.custom.user as IUser;

        if (context.agent.custom.fromServer) {
            log('letting op from server pass through');
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
                log(
                    "rejecting change as snapshot doesn't conform to logic checks"
                );
                return next("Snapshot doesn't conform to logic checks");
            }
        }
        log('commit logic checks passed');
        next();
    };
