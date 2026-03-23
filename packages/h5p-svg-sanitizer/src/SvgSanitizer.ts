import createDOMPurify from 'dompurify';
import { readFile, writeFile } from 'fs/promises';
import { JSDOM } from 'jsdom';

import {
    File,
    FileSanitizerResult,
    IFileSanitizer
} from '@lumieducation/h5p-server';
import { basename } from 'path';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

export default class SvgSanitizer implements IFileSanitizer {
    readonly name: string = 'SVG Sanitizer based on dompurify package';

    async sanitize(file: string | File): Promise<FileSanitizerResult> {
        const normalizedFile: File | { tempFilePath: string; name: string } =
            typeof file === 'string'
                ? { tempFilePath: file, name: basename(file) }
                : file;

        if (!normalizedFile.name.toLowerCase().endsWith('.svg')) {
            return FileSanitizerResult.Ignored;
        }

        let svgString: string;
        if ('data' in normalizedFile && normalizedFile.data) {
            svgString = normalizedFile.data.toString('utf8');
        } else if (normalizedFile.tempFilePath) {
            svgString = await readFile(normalizedFile.tempFilePath, 'utf8');
        } else {
            return FileSanitizerResult.NotSanitized;
        }

        const sanitizedSvgString = DOMPurify.sanitize(svgString, {
            USE_PROFILES: { svg: true }
        });

        if ('data' in normalizedFile && normalizedFile.data) {
            normalizedFile.data = Buffer.from(sanitizedSvgString, 'utf8');
        } else if (normalizedFile.tempFilePath) {
            await writeFile(
                normalizedFile.tempFilePath,
                sanitizedSvgString,
                'utf8'
            );
        } else {
            return FileSanitizerResult.NotSanitized;
        }

        return FileSanitizerResult.Sanitized;
    }
}
