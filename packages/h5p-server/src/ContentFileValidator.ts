import { open } from 'fs/promises';
import path from 'path';

import H5pError from './helpers/H5pError';
import Logger from './helpers/Logger';

const log = new Logger('ContentFileValidator');

/**
 * Magic byte signatures for binary media formats.
 * Each entry maps an extension to one or more byte patterns with an offset.
 */
interface IMagicSignature {
    bytes: number[];
    offset: number;
}

const magicSignatures: Record<string, IMagicSignature[]> = {
    png: [{ bytes: [0x89, 0x50, 0x4e, 0x47], offset: 0 }],
    jpg: [{ bytes: [0xff, 0xd8, 0xff], offset: 0 }],
    jpeg: [{ bytes: [0xff, 0xd8, 0xff], offset: 0 }],
    gif: [{ bytes: [0x47, 0x49, 0x46, 0x38], offset: 0 }],
    bmp: [{ bytes: [0x42, 0x4d], offset: 0 }],
    tif: [
        { bytes: [0x49, 0x49, 0x2a, 0x00], offset: 0 },
        { bytes: [0x4d, 0x4d, 0x00, 0x2a], offset: 0 }
    ],
    tiff: [
        { bytes: [0x49, 0x49, 0x2a, 0x00], offset: 0 },
        { bytes: [0x4d, 0x4d, 0x00, 0x2a], offset: 0 }
    ],
    webm: [{ bytes: [0x1a, 0x45, 0xdf, 0xa3], offset: 0 }],
    mp4: [
        { bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 } // "ftyp"
    ],
    m4a: [
        { bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 } // "ftyp"
    ],
    ogg: [{ bytes: [0x4f, 0x67, 0x67, 0x53], offset: 0 }],
    mp3: [
        { bytes: [0xff, 0xfb], offset: 0 },
        { bytes: [0xff, 0xf3], offset: 0 },
        { bytes: [0xff, 0xf2], offset: 0 },
        { bytes: [0x49, 0x44, 0x33], offset: 0 } // ID3
    ],
    wav: [{ bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }],
    glb: [{ bytes: [0x67, 0x6c, 0x54, 0x46], offset: 0 }]
};

/**
 * Extensions for text-based formats that have no magic byte signatures.
 * These are allowed through but checked for XML/SVG/HTML content.
 */
const textBasedExtensions = new Set(['json', 'vtt', 'webvtt', 'gltf']);

/**
 * Checks whether the given buffer matches a magic byte signature.
 */
function matchesSignature(
    buffer: Buffer,
    signatures: IMagicSignature[]
): boolean {
    return signatures.some((sig) => {
        if (buffer.length < sig.offset + sig.bytes.length) {
            return false;
        }
        return sig.bytes.every((byte, i) => buffer[sig.offset + i] === byte);
    });
}

/**
 * Checks if the beginning of a buffer looks like XML, SVG, HTML, or script
 * content that could be used for XSS attacks.
 */
function looksLikeXmlOrHtml(buffer: Buffer): boolean {
    const head = buffer
        .subarray(0, 1024)
        .toString('utf-8')
        .trimStart()
        .toLowerCase();

    return (
        head.startsWith('<?xml') ||
        head.startsWith('<svg') ||
        head.startsWith('<!doctype') ||
        head.startsWith('<html') ||
        head.startsWith('<script')
    );
}

/**
 * Validates that the content of a file matches its claimed extension.
 * Detects content type mismatches using magic byte signatures and
 * checks text-based files for XML/SVG/HTML content that could enable XSS.
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

    // Read first 64 bytes for magic byte detection (enough for all
    // signatures), plus up to 1024 bytes for text content checks.
    const fileHandle = await open(filePath, 'r');
    try {
        const buffer = Buffer.alloc(1024);
        const { bytesRead } = await fileHandle.read(buffer, 0, 1024, 0);
        const data = buffer.subarray(0, bytesRead);

        const expectedSignatures = magicSignatures[ext];
        if (expectedSignatures) {
            // Binary format: check magic bytes match
            if (bytesRead > 0 && !matchesSignature(data, expectedSignatures)) {
                log.info(
                    `File content mismatch: ${filePath} claims to be .${ext} but magic bytes do not match. Rejecting file.`
                );
                throw new H5pError('upload-validation-error', {}, 400);
            }
            return;
        }

        // Text-based format or unknown extension: check for XML/HTML content
        if (textBasedExtensions.has(ext)) {
            if (looksLikeXmlOrHtml(data)) {
                log.info(
                    `File contains XML/HTML content but claims to be .${ext}. Rejecting file: ${filePath}`
                );
                throw new H5pError('upload-validation-error', {}, 400);
            }
        }
    } finally {
        await fileHandle.close();
    }
}
