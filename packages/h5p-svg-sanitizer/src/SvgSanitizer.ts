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
        const normalizedFile = this.normalizeFileInput(file);

        if (!this.isSvgFile(normalizedFile.name)) {
            return FileSanitizerResult.Ignored;
        }

        const svgString = await this.readContent(normalizedFile);
        if (svgString === null) {
            return FileSanitizerResult.NotSanitized;
        }

        const sanitizedSvgString = DOMPurify.sanitize(svgString, {
            USE_PROFILES: { svg: true }
        });

        const writeSuccess = await this.writeContent(
            normalizedFile,
            sanitizedSvgString
        );
        return writeSuccess
            ? FileSanitizerResult.Sanitized
            : FileSanitizerResult.NotSanitized;
    }

    private normalizeFileInput(
        file: string | File
    ): File | { tempFilePath: string; name: string } {
        return typeof file === 'string'
            ? { tempFilePath: file, name: basename(file) }
            : file;
    }

    private isSvgFile(fileName: string): boolean {
        return fileName.toLowerCase().endsWith('.svg');
    }

    private hasBufferData(
        file: File | { tempFilePath: string; name: string }
    ): file is File & { data: Buffer } {
        return 'data' in file && !!file.data;
    }

    private async readContent(
        file: File | { tempFilePath: string; name: string }
    ): Promise<string | null> {
        if (this.hasBufferData(file)) {
            return file.data.toString('utf8');
        }

        if (file.tempFilePath) {
            return readFile(file.tempFilePath, 'utf8');
        }

        return null;
    }

    private async writeContent(
        file: File | { tempFilePath: string; name: string },
        content: string
    ): Promise<boolean> {
        if (this.hasBufferData(file)) {
            file.data = Buffer.from(content, 'utf8');
            return true;
        }

        if (file.tempFilePath) {
            await writeFile(file.tempFilePath, content, 'utf8');
            return true;
        }

        return false;
    }
}
