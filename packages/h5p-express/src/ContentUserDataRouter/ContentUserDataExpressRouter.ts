import { Router } from 'express';
import { ContentUserDataManager, IH5PConfig } from '@lumieducation/h5p-server';

import {
    errorHandler,
    undefinedOrTrue,
    catchAndPassOnErrors
} from '../expressErrorHandler';
import ContentUserDataController from './ContentUserDataController';

/**
 * This router implements necessary routes for the content user data (user
 * state) to work. If you only want certain routes, you can specify this in the
 * options parameter.
 * @param options sets if you want and how to handle errors
 * @param languageOverride the language to use when returning errors. Only has
 * an effect if you use the i18next http middleware, as it relies on
 * req.i18n.changeLanguage to be present. Defaults to auto, which means the a
 * language detector must have detected language and req.t translated to the
 * detected language.
 */
export default function (
    contentUserDataManager: ContentUserDataManager,
    config: IH5PConfig,
    options: { handleErrors: boolean } = { handleErrors: true },
    languageOverride: string | 'auto' = 'auto'
): Router {
    const router = Router();

    const contentUserDataController = new ContentUserDataController(
        contentUserDataManager,
        config
    );

    router.get(
        '/:contentId/:dataType/:subContentId',
        catchAndPassOnErrors(
            contentUserDataController.getContentUserData,
            undefinedOrTrue(options?.handleErrors)
        )
    );

    router.post(
        '/:contentId/:dataType/:subContentId',
        catchAndPassOnErrors(
            contentUserDataController.postContentUserData,
            undefinedOrTrue(options?.handleErrors)
        )
    );

    if (undefinedOrTrue(options?.handleErrors)) {
        router.use(errorHandler(languageOverride));
    }

    return router;
}
