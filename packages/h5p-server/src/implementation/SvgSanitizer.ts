import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);
import { readFile } from 'fs/promises';

import { IFileMalwareScanner, MalwareScanResult } from '../types';

export default class SvgSanitizer implements IFileMalwareScanner {
    readonly name: string = 'SVG Sanitizer based on sanatize-html package';
    async scan(
        file: string,
        mimetype: string
    ): Promise<{
        result: MalwareScanResult;
        wasSanitized?: boolean;
        sanitizedFile?: string;
    }> {
        if (mimetype !== 'image/svg+xml' && file.endsWith('.svg')) {
            return { result: MalwareScanResult.NotScanned };
        }
        const data = await readFile(file, 'utf8');
        console.log(data);

        const sanitizedFile = DOMPurify.sanitize(data, {
            USE_PROFILES: { svg: true }
        });
        console.log(sanitizedFile);

        if (
            sanitizedFile.replaceAll(/[\n\s]/g, '') ===
            data.replaceAll(/[\n\s]/g, '')
        ) {
            return { result: MalwareScanResult.Clean };
        } else {
            return {
                result: MalwareScanResult.MalwareFound,
                wasSanitized: true,
                sanitizedFile
            };
        }
    }
}
