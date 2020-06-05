import { Router } from 'express';

import { H5PEditor } from '../..';
import LibraryManagementExpressController from './libraryManagementController';
import LibraryManagementExpressRouterOptions from './LibraryManagementExpressRouterOptions';
import {
    errorHandler,
    catchAndPassOnErrors,
    undefinedOrTrue
} from '../expressErrorHandler';

export default function (
    h5pEditor: H5PEditor,
    routeOptions: LibraryManagementExpressRouterOptions = new LibraryManagementExpressRouterOptions(),
    languageOverride: string | 'auto' = 'auto'
): Router {
    const router = Router();
    const h5pController = new LibraryManagementExpressController(h5pEditor);

    // get library file
    /*if (undefinedOrTrue(routeOptions.routeGetLibraryFile)) {
        router.get(
            `${h5pEditor.config.librariesUrl}/:uberName/:file(*)`,
            catchAndPassOnErrors(h5pController.xxx, routeOptions.handleErrors)
        );
    }*/

    if (undefinedOrTrue(routeOptions.handleErrors)) {
        router.use(errorHandler(languageOverride));
    }

    return router;
}
