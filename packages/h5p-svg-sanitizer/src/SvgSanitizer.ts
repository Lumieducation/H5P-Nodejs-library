import createDOMPurify from 'dompurify';
import { readFile, writeFile } from 'fs/promises';
import { JSDOM } from 'jsdom';

import {
    FileSanitizerResult,
    H5PFileBuffer,
    IFileSanitizer
} from '@lumieducation/h5p-server';
import { basename } from 'path';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

export default class SvgSanitizer implements IFileSanitizer {
    readonly name: string = 'SVG Sanitizer based on dompurify package';

    async sanitize(file: string): Promise<FileSanitizerResult> {
        if (!this.isSvgFile(basename(file))) {
            return FileSanitizerResult.Ignored;
        }

        const svgString = await readFile(file, 'utf8');
        const sanitizedSvgString = this.sanitizeSvgString(svgString);
        await writeFile(file, sanitizedSvgString, 'utf8');

        return FileSanitizerResult.Sanitized;
    }

    async sanitizeBuffer(file: H5PFileBuffer): Promise<FileSanitizerResult> {
        if (!this.isSvgFile(file.name)) {
            return FileSanitizerResult.Ignored;
        }
        if (!file.data) {
            throw new Error(
                'SvgSanitizer.sanitizeBuffer was called without file.data'
            );
        }

        const svgString = file.data.toString('utf8');
        const sanitizedSvgString = this.sanitizeSvgString(svgString);
        file.data = Buffer.from(sanitizedSvgString, 'utf8');

        return FileSanitizerResult.Sanitized;
    }

    private sanitizeSvgString(svgString: string): string {
        return DOMPurify.sanitize(svgString, {
            USE_PROFILES: { svg: true }
        });
    }

    private isSvgFile(fileName: string): boolean {
        return fileName.toLowerCase().endsWith('.svg');
    }
}
