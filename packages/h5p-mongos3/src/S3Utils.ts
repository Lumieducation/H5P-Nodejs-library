import { S3, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';

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

/**
 * Deletes a list of objects from the S3 bucket. We can't use the normal
 * S3.deleteObjects function as it doesn't generate the MD5 hash needed by S3.
 * @param keys a list of keys to delete
 * @param bucket
 * @param s3
 * @param keyResolver
 */
export async function deleteObjects(
    keys: string[],
    bucket: string,
    s3: S3
): Promise<void> {
    // S3 batch deletes only work with 1000 files at a time, so we
    // might have to do this in several requests.

    const errors = [];

    while (keys.length > 0) {
        const nextFiles = keys.splice(0, 1000);
        if (nextFiles.length > 0) {
            log.debug(
                `Batch deleting ${nextFiles.length} file(s) in S3 storage.`
            );
            const deleteParams = {
                Bucket: bucket,
                Delete: {
                    Objects: nextFiles.map((key) => ({
                        Key: key
                    }))
                }
            };
            log.debug('Delete params:', JSON.stringify(deleteParams));
            const deletePayload = JSON.stringify(deleteParams.Delete);
            const md5Hash = crypto
                .createHash('md5')
                .update(deletePayload)
                .digest('base64');
            const command = new DeleteObjectsCommand(deleteParams);
            command.middlewareStack.add(
                (next) => async (args) => {
                    (args.request as any).headers['Content-MD5'] = md5Hash;
                    return next(args);
                },
                {
                    step: 'build'
                }
            );
            try {
                const response = await s3.send(command);
                log.debug('Deleted files in S3 storage.', response);
            } catch (error) {
                log.error(
                    `There was an error while deleting files in S3 storage. The delete operation will continue.\nError:`,
                    error
                );
                errors.push(error);
            }
        }
    }
    if (errors.length > 0) {
        throw new Error(
            `Errors while deleting files in S3 storage: ${errors.map((e) => e.message).join(', ')}`
        );
    }
}
