import ShareDB from 'sharedb';
import { ISharedStateAgent } from '../types';
import ValidatorRepository from '../ValidatorRepository';

export default (validatorRepository: ValidatorRepository) =>
    async (
        context: ShareDB.middleware.SubmitContext<ISharedStateAgent>,
        next: (err?: any) => void
    ): Promise<void> => {
        console.log('submit', JSON.stringify(context.op));
        console.log(context.op.op);
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
                console.log("rejecting change as op doesn't conform to schema");
                return next("Op doesn't conform to schema");
            }
        }
        next();
    };
