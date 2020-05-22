import path from 'path';

/**
 * Sanitizes a filename. Removes invalid characters and shortens to the max
 * length.
 * @param filename
 * @param invalidCharacterRegex
 * @param maxLength
 * @returns the sanitized filename
 */
export function generalizedSanitizeFilename(
    filename: string,
    invalidCharacterRegex: RegExp,
    maxLength: number
): string {
    // First remove all invalid characters.
    // We keep / and \ as the "filename" can be a relative path with
    // directories. We don't use the sanitize-filename package, as it
    // also removes directory separators.
    const cleanedFilename = filename.replace(invalidCharacterRegex, '');

    // Second, shorten the filename if it is too long.
    const numberOfCharactersToCut = cleanedFilename.length - maxLength;
    if (numberOfCharactersToCut < 0) {
        return cleanedFilename;
    }

    const extension = path.extname(cleanedFilename);
    const dirname = path.dirname(cleanedFilename);
    const basename = path.basename(cleanedFilename);
    const finalLength = Math.max(1, basename.length - numberOfCharactersToCut);
    return path.join(dirname, `${basename.substr(0, finalLength)}${extension}`);
}
