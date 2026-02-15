import { open } from 'fs/promises';
import path from 'path';
import { filetypeextension } from 'magic-bytes.js';

import H5pError from './helpers/H5pError';
import Logger from './helpers/Logger';

const log = new Logger('contentFileValidation');

/**
 * Extensions that magic-bytes.js considers equivalent. For example, mp4 and
 * m4a share the same "ftyp" magic bytes, and webm shares bytes with mkv.
 */
const extensionEquivalents: Record<string, string[]> = {
    jpg: ['jpeg'],
    jpeg: ['jpg'],
    tif: ['tiff'],
    tiff: ['tif'],
    mp4: ['m4a'],
    m4a: ['mp4'],
    webm: ['mkv', 'mka', 'mks'],
    png: ['apng'],
    ogg: ['ogx', 'oga', 'ogv']
};

/**
 * Patterns that indicate dangerous XML/SVG/HTML content which could enable
 * XSS attacks when disguised as other file types.
 */
const dangerousTextPatterns = [
    '<?xml',
    '<svg',
    '<!doctype',
    '<html',
    '<script'
];

/**
 * Validates that the content of a file matches its claimed extension.
 * Uses magic byte detection via magic-bytes.js to identify binary file types
 * and rejects mismatches. Also detects XML/SVG/HTML content disguised as
 * other file types, which could enable XSS attacks.
 *
 * This validator checks all extensions in the configured content whitelist,
 * not a hardcoded set, so custom whitelist entries are also validated.
 *
 * @param filePath absolute path to the file to validate
 * @throws H5pError with errorId 'upload-validation-error' if the file
 * content does not match its extension
 */
export async function validateFileContent(filePath: string): Promise<void> {
    const ext = path.extname(filePath).toLowerCase().replace(/^\./, '');
    if (!ext) {
        return;
    }

    const fileHandle = await open(filePath, 'r');
    try {
        const buffer = Buffer.alloc(1024);
        const { bytesRead } = await fileHandle.read(buffer, 0, 1024, 0);
        if (bytesRead === 0) {
            return;
        }
        const data = buffer.subarray(0, bytesRead);

        // Detect the actual file type using magic bytes
        const detectedExtensions = filetypeextension([...data] as number[]).map(
            (e) => e.replace(/^\./, '')
        );

        if (detectedExtensions.length > 0) {
            // The library detected a file type — check it matches
            // the claimed extension
            if (extensionMatchesDetected(ext, detectedExtensions)) {
                return;
            }
            log.info(
                `File content mismatch: ${filePath} claims to be .${ext} but detected as ${detectedExtensions.join(', ')}. Rejecting file.`
            );
            throw new H5pError('upload-validation-error', {}, 400);
        }

        // magic-bytes.js returned nothing — file may be text-based
        // or an unrecognized binary format. Check for dangerous
        // XML/SVG/HTML content that could enable XSS regardless of
        // the claimed extension.
        if (looksLikeXmlOrHtml(data)) {
            log.info(
                `File contains XML/HTML content but claims to be .${ext}. Rejecting file: ${filePath}`
            );
            throw new H5pError('upload-validation-error', {}, 400);
        }
    } finally {
        await fileHandle.close();
    }
}

/**
 * Checks whether the claimed extension matches any of the detected
 * extensions, taking into account known equivalences between formats
 * that share magic bytes.
 */
function extensionMatchesDetected(
    claimedExt: string,
    detectedExtensions: string[]
): boolean {
    if (detectedExtensions.includes(claimedExt)) {
        return true;
    }
    const equivalents = extensionEquivalents[claimedExt];
    if (equivalents) {
        return detectedExtensions.some((det) => equivalents.includes(det));
    }
    return false;
}

/**
 * Checks if the beginning of a buffer looks like XML, SVG, HTML, or
 * script content that could be used for XSS attacks.
 */
function looksLikeXmlOrHtml(buffer: Buffer): boolean {
    const head = buffer
        .subarray(0, 1024)
        .toString('utf-8')
        .trimStart()
        .toLowerCase();

    return dangerousTextPatterns.some((pattern) => head.startsWith(pattern));
}
