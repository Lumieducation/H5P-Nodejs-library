import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { readFile, writeFile } from 'fs/promises';

import { FileSanitizerResult, IFileSanitizer } from '@lumieducation/h5p-server';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

export default class SvgSanitizer implements IFileSanitizer {
    readonly name: string = 'SVG Sanitizer based on dompurify package';

    async sanitize(file: string): Promise<FileSanitizerResult> {
        if (!file.endsWith('.svg')) {
            return FileSanitizerResult.Ignored;
        }
        const svgString = await readFile(file, 'utf8');
        const sanitizedSvgString = DOMPurify.sanitize(svgString, {
            USE_PROFILES: { svg: true }
        });

        await writeFile(file, sanitizedSvgString, 'utf8');
        return FileSanitizerResult.Sanitized;
    }
}
