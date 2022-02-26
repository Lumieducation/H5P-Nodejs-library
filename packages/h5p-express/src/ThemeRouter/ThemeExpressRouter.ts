import { Router } from 'express';

import {
    defaultThemeGenerator,
    IH5PConfig,
    ITheme
} from '@lumieducation/h5p-server';

export default function (
    config: IH5PConfig,
    themeGenerator: (theme: ITheme) => string = defaultThemeGenerator
): Router {
    const router = Router();

    if (config.theme && config.themeUrl) {
        router.get(config.themeUrl, (req, res) => {
            res.setHeader('content-type', 'text/css');
            res.status(200).send(themeGenerator(config.theme));
        });
    }

    return router;
}
