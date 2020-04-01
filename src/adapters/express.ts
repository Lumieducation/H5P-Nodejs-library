import express from 'express';

import { H5PEditor } from '../';
import expressErrorHandler from './expressErrorHandler';
import ExpressH5PController from './expressController';
import ExpressRouterOptions from './expressRouterOptions';

/**
 * This router implements all Ajax calls necessary for the H5P (editor) client to work.
 * Use it like this: server.use('/h5p', H5P.adapters.express(h5pEditor, path.resolve('h5p/core'), path.resolve('h5p/editor')));
 * If you only want certain routes, you can specify this in the options parameter.
 * @param h5pEditor the editor object
 * @param h5pCorePath the path on the local disk at which the core files (of the player) can be found
 * @param h5pEditorLibraryPath the path on the local disk at which the core files of the editor can be found
 * @param options sets which routes you want and how to handle errors
 */
export default function (
    h5pEditor: H5PEditor,
    h5pCorePath: string,
    h5pEditorLibraryPath: string,
    options: ExpressRouterOptions = new ExpressRouterOptions()
): express.Router {
    const router = express.Router();
    const h5pController = new ExpressH5PController(h5pEditor);

    /**
     * Calls the function passed to it and catches errors it throws. These arrows are then
     * passed to the next(...) function for proper error handling.
     * @param fn The function to call
     */
    const catchAndPassOnErrors = (fn) => (...args) => {
        if (options.handleErrors) {
            return fn(...args).catch(args[2]);
        }
        return fn(...args);
    };

    // get library file
    if (options.routeGetLibraryFile) {
        router.get(
            `${h5pEditor.config.librariesUrl}/:uberName/:file(*)`,
            catchAndPassOnErrors(h5pController.getLibraryFile)
        );
    }

    // get content file
    if (options.routeGetContentFile) {
        router.get(
            `${h5pEditor.config.contentFilesUrl}/:id/:file(*)`,
            catchAndPassOnErrors(h5pController.getContentFile)
        );
    }

    // get temporary content file
    if (options.routeGetTemporaryContentFile) {
        router.get(
            `${h5pEditor.config.temporaryFilesUrl}/:file(*)`,
            catchAndPassOnErrors(h5pController.getTemporaryContentFile)
        );
    }

    // get parameters (= content.json) of content
    if (options.routeGetParameters) {
        router.get(
            `${h5pEditor.config.paramsUrl}/:contentId`,
            catchAndPassOnErrors(h5pController.getContentParameters)
        );
    }

    // get various things through the Ajax endpoint
    if (options.routeGetAjax) {
        router.get(
            h5pEditor.config.ajaxUrl,
            catchAndPassOnErrors(h5pController.getAjax)
        );
    }

    // post various things through the Ajax endpoint
    // Don't be confused by the fact that many of the requests dealt with here are not
    // really POST requests, but look more like GET requests. This is simply how the H5P
    // client works and we can't change it.
    if (options.routePostAjax) {
        router.post(
            h5pEditor.config.ajaxUrl,
            catchAndPassOnErrors(h5pController.postAjax)
        );
    }

    // serve core files (= JavaScript + CSS from h5p-php-library)
    if (options.routeCoreFiles) {
        router.use(h5pEditor.config.coreUrl, express.static(h5pCorePath));
    }

    // serve editor core files (= JavaScript + CSS from h5p-editor-php-library)
    if (options.routeEditorCoreFiles) {
        router.use(
            h5pEditor.config.editorLibraryUrl,
            express.static(h5pEditorLibraryPath)
        );
    }

    // serve download links
    if (options.routeGetDownload) {
        router.get(
            `${h5pEditor.config.downloadUrl}/:contentId`,
            catchAndPassOnErrors(h5pController.getDownload)
        );
    }

    if (options.handleErrors) {
        router.use(expressErrorHandler);
    }

    return router;
}
