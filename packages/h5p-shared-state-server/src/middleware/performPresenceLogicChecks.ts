import ShareDB from 'sharedb';
import debug from 'debug';

import { checkLogic } from '../LogicChecker';
import { ISharedStateAgent } from '../types';
import ValidatorRepository from '../ValidatorRepository';

const log = debug('h5p:SharedStateServer:performPresenceLogicChecks');

export default (validatorRepository: ValidatorRepository) =>
    async (
        context: ShareDB.middleware.PresenceContext,
        next: (err?: any) => void
    ): Promise<void> => {
        const agent = context.agent.custom as ISharedStateAgent;

        if (!context.agent.custom) {
            return next('No custom agent');
        }

        if (
            context.presence &&
            agent.libraryMetadata.state?.presenceLogicChecks
        ) {
            const presenceLogicCheck =
                await validatorRepository.getPresenceLogicCheck(
                    agent.libraryMetadata
                );
            if (
                !checkLogic(
                    {
                        presence: context.presence.p,
                        params: agent.params,
                        context: {
                            user: agent.user,
                            permission: agent.permission
                        }
                    },
                    presenceLogicCheck
                )
            ) {
                log(
                    "Rejecting change as presence doesn't conform to logic checks"
                );
                return next("Presence doesn't conform to logic checks");
            }
        }

        log('Presence logic checks passed');
        next();
    };
