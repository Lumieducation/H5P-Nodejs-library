import { IUser } from '@lumieducation/h5p-server';
import ShareDB from 'sharedb';
import debug from 'debug';

import { checkLogic } from '../LogicChecker';
import { ISharedStateAgent } from '../types';
import ValidatorRepository from '../ValidatorRepository';

const log = debug('h5p:SharedStateServer:performCommitLogicChecks');

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

        if (agent.libraryMetadata.state?.snapshotLogicChecks) {
            const snapshotLogicCheck =
                await validatorRepository.getSnapshotLogicCheck(
                    agent.libraryMetadata
                );
            if (
                !checkLogic(
                    {
                        snapshot: context.snapshot.data,
                        params: agent.params,
                        context: {
                            user: agent.user,
                            permission: agent.permission
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
