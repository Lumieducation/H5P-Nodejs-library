import { Router, static as ExpressStatic } from 'express';

import { H5PEditor } from '@lumieducation/h5p-server';
import {
    errorHandler,
    undefinedOrTrue,
    catchAndPassOnErrors
} from '../expressErrorHandler';

export default function (h5pEditor: H5PEditor): Router {
    const router = Router();

    // get library file
    router.get(`/theme.css`, (req, res) => {
        res.setHeader('content-type', 'text/css');
        res.status(200).send(h5pEditor.renderTheme());
    });

    return router;
}
