import ShareDB from 'sharedb';
import debug from 'debug';

import { ISharedStateAgent } from '../types';
import ValidatorRepository from '../ValidatorRepository';

const log = debug('h5p:SharedStateServer:validateOpSchema');

export default (validatorRepository: ValidatorRepository) =>
    async (
        context: ShareDB.middleware.SubmitContext,
        next: (err?: any) => void
    ): Promise<void> => {
        const agent = context.agent.custom as ISharedStateAgent;

        log('submit %O', context.op);
        if (agent.fromServer) {
            log('Letting op from server pass through');
            return next();
        }

        if (context.op && agent.libraryMetadata.state?.opSchema) {
            const opSchemaValidator =
                await validatorRepository.getOpSchemaValidator(
                    agent.libraryMetadata
                );
            if (
                !opSchemaValidator({
                    op: context.op.op,
                    create: context.op.create
                })
            ) {
                log("Rejecting change as op doesn't conform to schema");
                log('Error log: %O', opSchemaValidator.errors);
                return next("Op doesn't conform to schema");
            }
        }

        log('Op schema validation passed');

        next();
    };
