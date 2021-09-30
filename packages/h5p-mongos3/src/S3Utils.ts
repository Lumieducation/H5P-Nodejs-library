import { H5pError, Logger, utils } from '@lumieducation/h5p-server';

const { generalizedSanitizeFilename } = utils;

const log = new Logger('S3Utils');

/**
 * Checks if the filename can be used in S3 storage. Throws errors if the
 * filename is not valid
 * @param filename the filename to check
 * @returns no return value; throws errors if the filename is not valid
 */
export function validateFilename(
    filename: string,
    invalidCharactersRegExp?: RegExp
): void {
    if (/\.\.\//.test(filename)) {
        log.error(
            `Relative paths in filenames are not allowed: ${filename} is illegal`
        );
        throw new H5pError('illegal-filename', { filename }, 400);
    }
    if (filename.startsWith('/')) {
        log.error(
            `Absolute paths in filenames are not allowed: ${filename} is illegal`
        );
        throw new H5pError('illegal-filename', { filename }, 400);
    }

    // See https://docs.aws.amazon.com/AmazonS3/latest/dev/UsingMetadata.html
    // for a list of problematic characters. We filter all of them out
    // expect for ranges of non-printable ASCII characters:
    // &$@=;:+ ,?\\{^}%`]'">[~<#

    if ((invalidCharactersRegExp ?? /[^A-Za-z0-9\-._!()@/]/g).test(filename)) {
        log.error(`Found illegal character in filename: ${filename}`);
        throw new H5pError('illegal-filename', { filename }, 400);
    }
}

/**
 * Sanitizes a filename or path by shortening it to the specified maximum length
 * and removing the invalid characters in the RegExp. If you don't specify a
 * RegExp a very strict invalid character list will be used that only leaves
 * alphanumeric filenames untouched.
 * @param filename the filename or path (with UNIX slash separator) to sanitize
 * @param maxFileLength the filename will be shortened to this length
 * @param invalidCharactersRegExp these characters will be removed from the
 * filename
 * @returns the cleaned filename
 */
export function sanitizeFilename(
    filename: string,
    maxFileLength: number,
    invalidCharactersRegExp?: RegExp
): string {
    return generalizedSanitizeFilename(
        filename,
        invalidCharactersRegExp ?? /[^A-Za-z0-9\-._!()@/]/g,
        maxFileLength
    );
}
