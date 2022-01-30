import ShareDB from 'sharedb';
import { checkLogic } from '../LogicChecker';
import { ISharedStateAgent } from '../types';
import ValidatorRepository from '../ValidatorRepository';

export default (validatorRepository: ValidatorRepository) =>
    async (
        context: ShareDB.middleware.SubmitContext<ISharedStateAgent>,
        next: (err?: any) => void
    ): Promise<void> => {
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
                        }
                    },
                    opLogicCheck
                )
            ) {
                console.log(
                    "rejecting change as op doesn't conform to logic checks"
                );
                return next("Op doesn't conform to logic checks");
            }
        }

        console.log('op logic checks passed');
        next();
    };
