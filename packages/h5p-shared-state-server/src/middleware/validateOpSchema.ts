import ShareDB from 'sharedb';
import debug from 'debug';

import { ISharedStateAgent } from '../types';
import ValidatorRepository from '../ValidatorRepository';

const log = debug('h5p:SharedStateServer:validateOpSchema');

export default (validatorRepository: ValidatorRepository) =>
    async (
        context: ShareDB.middleware.SubmitContext<ISharedStateAgent>,
        next: (err?: any) => void
    ): Promise<void> => {
        log('submit %O', context.op);
        if (context.agent.custom.fromServer) {
            log('Letting op from server pass through');
            return next();
        }

        if (
            context.op &&
            context.agent.custom.libraryMetadata.state?.opSchema
        ) {
            const opSchemaValidator =
                await validatorRepository.getOpSchemaValidator(
                    context.agent.custom.libraryMetadata
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
