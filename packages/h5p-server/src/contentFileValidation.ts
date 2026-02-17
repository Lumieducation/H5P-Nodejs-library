import { open } from 'fs/promises';
import path from 'path';
import { filetypeextension } from 'magic-bytes.js';
import { lookup as mimeLookup } from 'mime-types';

import H5pError from './helpers/H5pError';
import Logger from './helpers/Logger';

const log = new Logger('contentFileValidation');

/**
 * Formats that share magic bytes but have unrelated MIME types, so they
 * cannot be matched via mime-types lookups. Each group is fully
 * bidirectional: every extension in a group is equivalent to every other.
 */
const magicByteEquivalents: string[][] = [
    ['webm', 'mkv', 'mka', 'mks'],
    ['png', 'apng']
];

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
                // Even when the extension matches, text-based detections
                // (e.g. a BOM causing magic-bytes to return "txt") still
                // need the dangerous-content check. A UTF-8 BOM followed
                // by <html>…</html> would otherwise slip through.
                if (
                    detectedExtensions.includes('txt') &&
                    looksLikeXmlOrHtml(data)
                ) {
                    log.info(
                        `File detected as text but contains XML/HTML content. Rejecting file: ${filePath}`
                    );
                    throw new H5pError('upload-validation-error', {}, 400);
                }
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
 * Extracts the subtype portion of a MIME type string (e.g. "mp4" from
 * "video/mp4").
 */
function getMimeSubtype(mimeType: string): string | undefined {
    const slash = mimeType.indexOf('/');
    return slash >= 0 ? mimeType.substring(slash + 1) : undefined;
}

/**
 * Checks whether the claimed extension matches any of the detected
 * extensions using three tiers:
 * 1. Direct match — the claimed extension is in the detected list.
 * 2. MIME match — mime-types resolves both extensions to the same MIME
 *    type or to types that share the same subtype (e.g. video/mp4 and
 *    audio/mp4).
 * 3. Residual map — a small list of formats that share magic bytes but
 *    have unrelated MIME types (e.g. webm/mkv, png/apng).
 */
export function extensionMatchesDetected(
    claimedExt: string,
    detectedExtensions: string[]
): boolean {
    // Tier 1: direct match
    if (detectedExtensions.includes(claimedExt)) {
        return true;
    }

    // Tier 2: MIME type / subtype match
    const claimedMime = mimeLookup(claimedExt);
    if (claimedMime) {
        const claimedSubtype = getMimeSubtype(claimedMime);
        for (const det of detectedExtensions) {
            const detMime = mimeLookup(det);
            if (!detMime) continue;
            if (detMime === claimedMime) return true;
            if (claimedSubtype && claimedSubtype === getMimeSubtype(detMime)) {
                return true;
            }
        }
    }

    // Tier 3: residual magic-byte equivalents
    for (const group of magicByteEquivalents) {
        if (group.includes(claimedExt)) {
            if (detectedExtensions.some((det) => group.includes(det))) {
                return true;
            }
        }
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
