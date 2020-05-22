import Logger from '../../helpers/Logger';
import H5pError from '../../helpers/H5pError';
import { generalizedSanitizeFilename } from '../utils';

const log = new Logger('S3Utils');

/**
 * Checks if the filename can be used in S3 storage. Throws errors if the
 * filename is not valid
 * @param filename the filename to check
 * @returns no return value; throws errors if the filename is not valid
 */
export function validateFilename(filename: string): void {
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

    if (/[&\$@=;:\+\s,\?\\\{\^\}%`\]'">\[~<#|]/.test(filename)) {
        log.error(`Found illegal character in filename: ${filename}`);
        throw new H5pError('illegal-filename', { filename }, 400);
    }
}

export function sanitizeFilename(
    filename: string,
    maxFileLength: number
): string {
    return generalizedSanitizeFilename(
        filename,
        /[&\$@=;:\+\s,\?\\\{\^\}%`\]'">\[~<#|]/g,
        maxFileLength
    );
}
