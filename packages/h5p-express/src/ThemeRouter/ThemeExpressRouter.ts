import { Router, static as ExpressStatic } from 'express';

import { H5PEditor } from '@lumieducation/h5p-server';
import {
    errorHandler,
    undefinedOrTrue,
    catchAndPassOnErrors
} from '../expressErrorHandler';

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
export default function (h5pEditor: H5PEditor): Router {
    const router = Router();

    // get library file
    router.get(`/theme.css`, (req, res) => {
        res.setHeader('content-type', 'text/css');
        res.status(200).send(h5pEditor.renderTheme());
    });

    return router;
}
