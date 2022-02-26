import sass from 'sass';
import path from 'path';
import fs from 'fs';
import { ITheme } from '@lumieducation/h5p-server';

const generateVariablesScss = (theme: ITheme): string => {
    return `
    $fontColor: ${theme.fontColor};
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

const loadScss = (): string => {
    const styleDir = path.resolve(__dirname, '../styles');
    let scss: string = '';
    for (const files of fs.readdirSync(styleDir)) {
        scss += fs.readFileSync(path.join(styleDir, files));
    }
    return scss;
};

export default (theme: ITheme): string => {
    const vars = generateVariablesScss(theme);
    const scss = loadScss();
    const full = vars + scss;
    const css = sass.compileString(full, { sourceMap: false });
    return css.css;
};
