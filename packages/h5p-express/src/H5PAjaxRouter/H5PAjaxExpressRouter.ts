import { Router, static as ExpressStatic } from 'express';

import { H5PEditor } from '@lumieducation/h5p-server';
import {
    errorHandler,
    undefinedOrTrue,
    catchAndPassOnErrors
} from '../expressErrorHandler';
import H5PAjaxExpressController from './H5PAjaxExpressController';
import H5PAjaxExpressRouterOptions from './H5PAjaxExpressRouterOptions';
import ContentUserDataExpressRouter from '../ContentUserDataRouter/ContentUserDataExpressRouter';
import FinishedDataExpressRouter from '../FinishedDataRouter/FinishedDataExpressRouter';

/**
 * This router implements all Ajax calls necessary for the H5P (editor) client to work.
 * Use it like this: server.use('/h5p', H5P.adapters.express(h5pEditor, path.resolve('h5p/core'), path.resolve('h5p/editor')));
 * If you only want certain routes, you can specify this in the options parameter.
 * @param h5pEditor the editor object
 * @param h5pCorePath the path on the local disk at which the core files (of the player) can be found
 * @param h5pEditorLibraryPath the path on the local disk at which the core files of the editor can be found
 * @param routeOptions sets which routes you want and how to handle errors
 * @param languageOverride the language to use when returning errors.
 * Only has an effect if you use the i18next http middleware, as it relies on
 * req.i18n.changeLanguage to be present. Defaults to auto, which means the
 * a language detector must have detected language and req.t translated to the
 * detected language.
 */
export default function (
    h5pEditor: H5PEditor,
    h5pCorePath: string,
    h5pEditorLibraryPath: string,
    routeOptions: H5PAjaxExpressRouterOptions = new H5PAjaxExpressRouterOptions(),
    languageOverride: string | 'auto' = 'auto'
): Router {
    const router = Router();
    const h5pController = new H5PAjaxExpressController(h5pEditor);

    // get library file
    if (undefinedOrTrue(routeOptions.routeGetLibraryFile)) {
        router.get(
            `${h5pEditor.config.librariesUrl}/:uberName/:file(*)`,
            catchAndPassOnErrors(
                h5pController.getLibraryFile,
                routeOptions.handleErrors
            )
        );
    }

    // get content file
    if (undefinedOrTrue(routeOptions.routeGetContentFile)) {
        router.get(
            `${h5pEditor.config.contentFilesUrl}/:id/:file(*)`,
            catchAndPassOnErrors(
                h5pController.getContentFile,
                routeOptions.handleErrors
            )
        );
    }

    // get temporary content file
    if (undefinedOrTrue(routeOptions.routeGetTemporaryContentFile)) {
        router.get(
            `${h5pEditor.config.temporaryFilesUrl}/:file(*)`,
            catchAndPassOnErrors(
                h5pController.getTemporaryContentFile,
                routeOptions.handleErrors
            )
        );
    }

    // get parameters (= content.json) of content
    if (undefinedOrTrue(routeOptions.routeGetParameters)) {
        router.get(
            `${h5pEditor.config.paramsUrl}/:contentId`,
            catchAndPassOnErrors(
                h5pController.getContentParameters,
                routeOptions.handleErrors
            )
        );
    }

    // get various things through the Ajax endpoint
    if (undefinedOrTrue(routeOptions.routeGetAjax)) {
        router.get(
            h5pEditor.config.ajaxUrl,
            catchAndPassOnErrors(
                h5pController.getAjax,
                routeOptions.handleErrors
            )
        );
    }

    // post various things through the Ajax endpoint
    // Don't be confused by the fact that many of the requests dealt with here are not
    // really POST requests, but look more like GET requests. This is simply how the H5P
    // client works and we can't change it.
    if (undefinedOrTrue(routeOptions.routePostAjax)) {
        router.post(
            h5pEditor.config.ajaxUrl,
            catchAndPassOnErrors(
                h5pController.postAjax as any,
                routeOptions.handleErrors
            )
        );
    }

    // save and retrieve the state of individual users
    if (undefinedOrTrue(routeOptions.routeContentUserData)) {
        router.use(
            h5pEditor.config.contentUserDataUrl,
            ContentUserDataExpressRouter(
                h5pEditor.contentUserDataManager,
                h5pEditor.config
            )
        );
    }

    // track usage of users
    if (undefinedOrTrue(routeOptions.routeFinishedData)) {
        router.use(
            h5pEditor.config.setFinishedUrl,
            FinishedDataExpressRouter(
                h5pEditor.contentUserDataManager,
                h5pEditor.config
            )
        );
    }

    // serve core files (= JavaScript + CSS from h5p-php-library)
    if (undefinedOrTrue(routeOptions.routeCoreFiles)) {
        router.use(
            h5pEditor.config.coreUrl,
            ExpressStatic(h5pCorePath, {
                cacheControl: true,
                etag: true,
                lastModified: true,
                maxAge: 31536000000
            })
        );
    }

    // serve editor core files (= JavaScript + CSS from h5p-editor-php-library)
    if (undefinedOrTrue(routeOptions.routeEditorCoreFiles)) {
        router.use(
            h5pEditor.config.editorLibraryUrl,
            ExpressStatic(h5pEditorLibraryPath, {
                cacheControl: true,
                etag: true,
                lastModified: true,
                maxAge: 31536000000
            })
        );
    }

    // serve download links
    if (undefinedOrTrue(routeOptions.routeGetDownload)) {
        router.get(
            `${h5pEditor.config.downloadUrl}/:contentId`,
            catchAndPassOnErrors(
                h5pController.getDownload,
                routeOptions.handleErrors
            )
        );
    }

    if (undefinedOrTrue(routeOptions.handleErrors)) {
        router.use(errorHandler(languageOverride));
    }

    return router;
}
