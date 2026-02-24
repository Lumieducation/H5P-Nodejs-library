import createDOMPurify from 'dompurify';
import { readFile, writeFile } from 'fs/promises';
import { JSDOM } from 'jsdom';

import {
    File,
    FileSanitizerResult,
    IFileSanitizer
} from '@lumieducation/h5p-server';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

export default class SvgSanitizer implements IFileSanitizer {
    readonly name: string = 'SVG Sanitizer based on dompurify package';

    async sanitize(file: File): Promise<FileSanitizerResult> {
        if (!file.name.endsWith('.svg')) {
            return FileSanitizerResult.Ignored;
        }

        let svgString: string;
        if (file.data) {
            svgString = file.data.toString('utf8');
        } else {
            svgString = await readFile(file.tempFilePath, 'utf8');
        }

        const sanitizedSvgString = DOMPurify.sanitize(svgString, {
            USE_PROFILES: { svg: true }
        });

        if (file.data) {
            file.data = Buffer.from(sanitizedSvgString, 'utf8');
        } else {
            await writeFile(file.tempFilePath, sanitizedSvgString, 'utf8');
        }
        return FileSanitizerResult.Sanitized;
    }
}
