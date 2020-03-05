import { H5pError } from '../../../src';

export default function checkFilename(filename: string): void {
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
