import ShareDB from 'sharedb';
import debug from 'debug';

import { ISharedStateAgent } from '../types';
import ValidatorRepository from '../ValidatorRepository';

const log = debug('h5p:SharedStateServer:validatePresenceSchema');

export default (validatorRepository: ValidatorRepository) =>
    async (
        context: ShareDB.middleware.PresenceContext,
        next: (err?: any) => void
    ): Promise<void> => {
        const agent = context.agent.custom as ISharedStateAgent;

        /*
        Documentation of what to find in the context:
        context.presence: {
            a: 'p', // indicates its a presence
            ch: string, // the presence channel (contentId)
            id: string, // the presence id
            p: any, // arbitrary presence object
            pv: number // unknown; presence version?
        }

        context.agent.custom is regularly filled        
        */

        log('context %O', context);

        if (
            context.presence?.p &&
            agent.libraryMetadata.state?.presenceSchema
        ) {
            const presenceSchemaValidator =
                await validatorRepository.getPresenceSchemaValidator(
                    agent.libraryMetadata
                );
            if (!presenceSchemaValidator(context.presence.p)) {
                log("Rejecting change as presence doesn't conform to schema");
                log('Error log: %O', presenceSchemaValidator.errors);
                return next("Presence doesn't conform to schema");
            }
        }

        log('Presence schema validation passed');

        next();
    };
