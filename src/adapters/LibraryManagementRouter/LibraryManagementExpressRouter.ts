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
    const controller = new LibraryManagementExpressController(h5pEditor);

    if (undefinedOrTrue(routeOptions.routeGetLibraries)) {
        router.get(
            `/`,
            catchAndPassOnErrors(
                controller.getLibraries,
                routeOptions.handleErrors
            )
        );
    }

    if (undefinedOrTrue(routeOptions.routePostLibraries)) {
        router.post(
            `/`,
            catchAndPassOnErrors(
                controller.postLibraries,
                routeOptions.handleErrors
            )
        );
    }

    if (undefinedOrTrue(routeOptions.routeGetLibrary)) {
        router.get(
            `/:machinename`,
            catchAndPassOnErrors(
                controller.getLibrary,
                routeOptions.handleErrors
            )
        );
    }

    if (undefinedOrTrue(routeOptions.routePatchLibrary)) {
        router.patch(
            `/:machinename`,
            catchAndPassOnErrors(
                controller.patchLibrary,
                routeOptions.handleErrors
            )
        );
    }

    if (undefinedOrTrue(routeOptions.routeDeleteLibrary)) {
        router.delete(
            `/:machinename`,
            catchAndPassOnErrors(
                controller.deleteLibrary,
                routeOptions.handleErrors
            )
        );
    }

    if (undefinedOrTrue(routeOptions.routePostLibraryUpdateContent)) {
        router.post(
            `/:machinename/update-content`,
            catchAndPassOnErrors(
                controller.postLibraryUpdateContent,
                routeOptions.handleErrors
            )
        );
    }

    if (undefinedOrTrue(routeOptions.routePostContentTypeCacheUpdate)) {
        router.get(
            `/content-type-cache/update`,
            catchAndPassOnErrors(
                controller.postLibrariesContentTypeCacheUpdate,
                routeOptions.handleErrors
            )
        );
    }

    if (undefinedOrTrue(routeOptions.handleErrors)) {
        router.use(errorHandler(languageOverride));
    }

    return router;
}
