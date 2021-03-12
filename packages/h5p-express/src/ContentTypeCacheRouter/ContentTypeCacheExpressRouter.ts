import { Router } from 'express';
import { ContentTypeCache } from '@lumieducation/h5p-server';

import {
    errorHandler,
    catchAndPassOnErrors,
    undefinedOrTrue
} from '../expressErrorHandler';
import ContentTypeCacheController from './ContentTypeCacheController';

export default function (
    contentTypeCache: ContentTypeCache,
    options: { handleErrors: boolean } = { handleErrors: true },
    languageOverride: string | 'auto' = 'auto'
): Router {
    const router = Router();
    const controller = new ContentTypeCacheController(contentTypeCache);

    router.post(
        `/update`,
        catchAndPassOnErrors(
            controller.postLibrariesContentTypeCacheUpdate,
            undefinedOrTrue(options?.handleErrors)
        )
    );

    router.get(
        `/update`,
        catchAndPassOnErrors(
            controller.getLibrariesContentTypeCacheUpdate,
            undefinedOrTrue(options?.handleErrors)
        )
    );

    if (undefinedOrTrue(options?.handleErrors)) {
        router.use(errorHandler(languageOverride));
    }

    return router;
}
