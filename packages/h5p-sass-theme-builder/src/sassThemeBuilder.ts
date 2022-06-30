import sass, { ImporterResult } from 'sass';
import path from 'path';
import fs from 'fs';
import type { ITheme } from '@lumieducation/h5p-server';

const generateVariablesScss = (theme: ITheme): string => {
    return `
    $fontColor: ${theme.fontColor};
    $secondaryFontColor: ${theme.secondaryFontColor};
    $disabledFontColor: ${theme.disabledFontColor};
    $backgroundColor: ${theme.backgroundColor};
    $secondaryBackgroundColor: ${theme.secondaryBackgroundColor};
    $primaryColor: ${theme.primaryColor};
    $primaryContrastColor: ${theme.primaryContrastColor};
    $secondaryColor: ${theme.secondaryColor};
    $secondaryContrastColor: ${theme.secondaryContrastColor};
    $dividerColor: ${theme.dividerColor};
    $warningColor: ${theme.warningColor};
    $warningContrastColor: ${theme.warningContrastColor};
    $successColor: ${theme.successColor};
    $successContrastColor: ${theme.successContrastColor};
    $errorColor: ${theme.errorColor};
    $errorContrastColor: ${theme.errorContrastColor};
    $fontFamily: ${theme.fontFamily};
    $buttonBorderRadius: ${theme.buttonBorderRadius};
    `;
};

export default (theme: ITheme): string => {
    // We don't load the main.scss file with `compile` as sass wouldn't
    // use the Importer below to resolve variables.scss
    const css = sass.compileString('@import "main.scss";', {
        sourceMap: false,
        // We use a custom importer to override the _variables.scs files.
        // We also have to load all other files with it as the fallback doesn't work.
        importers: [
            {
                canonicalize: (url) => {
                    if (url.endsWith('variables.scss')) {
                        return new URL('override:variables.scss');
                    }
                    if (
                        fs.existsSync(
                            path.resolve(__dirname, '../styles/', url)
                        )
                    ) {
                        return new URL(`override:${url}`);
                    }
                    return null;
                },
                load: (url): ImporterResult => {
                    if (url.toString() === 'override:variables.scss') {
                        return {
                            contents: generateVariablesScss(theme),
                            syntax: 'scss'
                        };
                    }
                    const p = path.resolve(
                        __dirname,
                        '../styles',
                        url.toString().replace('override:', '')
                    );
                    return {
                        contents: fs.readFileSync(p, 'utf8'),
                        syntax: 'scss'
                    };
                }
            }
        ],
        loadPaths: [path.resolve(__dirname, '../styles')]
    });
    return css.css;
};
