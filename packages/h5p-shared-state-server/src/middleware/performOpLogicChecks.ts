import ShareDB from 'sharedb';
import debug from 'debug';

import { checkLogic } from '../LogicChecker';
import { ISharedStateAgent } from '../types';
import ValidatorRepository from '../ValidatorRepository';

const log = debug('h5p:SharedStateServer:performOpLogicChecks');

export default (validatorRepository: ValidatorRepository) =>
    async (
        context: ShareDB.middleware.SubmitContext<ISharedStateAgent>,
        next: (err?: any) => void
    ): Promise<void> => {
        if (context.agent.custom.fromServer) {
            log('Letting op from server pass through');
            return next();
        }

        if (
            context.op &&
            context.agent.custom.libraryMetadata.state?.opLogicChecks
        ) {
            const opLogicCheck = await validatorRepository.getOpLogicCheck(
                context.agent.custom.libraryMetadata
            );
            if (
                !checkLogic(
                    {
                        op: context.op.op,
                        create: context.op.create,
                        params: context.agent.custom.params,
                        context: {
                            user: context.agent.custom.user,
                            permission: context.agent.custom.permission
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
