import { H5pError } from '../..';
import { generalizedSanitizeFilename } from '../utils';

export function checkFilename(filename: string): void {
    if (/\.\.\//.test(filename)) {
        throw new H5pError(
            'storage-file-implementations:illegal-relative-filename',
            { filename },
            400
        );
    }
    if (filename.startsWith('/')) {
        throw new H5pError(
            'storage-file-implementations:illegal-absolute-filename',
            { filename },
            400
        );
    }
}

export function sanitizeFilename(filename: string, maxLength: number): string {
    return generalizedSanitizeFilename(filename, /<>:"\|\?\*/g, maxLength);
}
