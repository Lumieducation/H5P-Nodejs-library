import ShareDB from 'sharedb';
import debug from 'debug';

import { checkLogic } from '../LogicChecker';
import { ISharedStateAgent } from '../types';
import ValidatorRepository from '../ValidatorRepository';

const log = debug('h5p:SharedStateServer:performOpLogicChecks');

export default (validatorRepository: ValidatorRepository) =>
    async (
        context: ShareDB.middleware.SubmitContext,
        next: (err?: any) => void
    ): Promise<void> => {
        const agent = context.agent.custom as ISharedStateAgent;
        if (agent.fromServer) {
            log('Letting op from server pass through');
            return next();
        }

        if (context.op && agent.libraryMetadata.state?.opLogicChecks) {
            const opLogicCheck = await validatorRepository.getOpLogicCheck(
                agent.libraryMetadata
            );
            if (
                !checkLogic(
                    {
                        op: context.op.op,
                        create: context.op.create,
                        params: agent.params,
                        context: {
                            user: agent.user,
                            permission: agent.permission
                        },
                        snapshot: context.snapshot?.data
                    },
                    opLogicCheck
                )
            ) {
                log("Rejecting change as op doesn't conform to logic checks");
                return next("Op doesn't conform to logic checks");
            }
        }

        log('Op logic checks passed');
        next();
    };
