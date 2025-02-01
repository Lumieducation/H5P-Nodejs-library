import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { readFile, writeFile } from 'fs/promises';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

import { FileSanitizerResult, IFileSanitizer } from '@lumieducation/h5p-server';

export default class SvgSanitizer implements IFileSanitizer {
    readonly name: string = 'SVG Sanitizer based on dompurify package';

    async scan(file: string, mimetype: string): Promise<FileSanitizerResult> {
        if (mimetype !== 'image/svg+xml' && file.endsWith('.svg')) {
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
