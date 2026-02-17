import { ILibraryFilePatch } from '../types';

/**
 * Built-in patches that fix known incompatibilities in H5P library files
 * during HTML export bundling.
 *
 * These patches are applied automatically unless overridden by custom patches
 * provided to the {@link HtmlExporter} constructor. A custom patch with the
 * same `machineName` and `filename` replaces the corresponding built-in patch.
 *
 * When adding new built-in patches, document the reason clearly in the
 * `patchReason` field so that future maintainers can determine whether the
 * patch is still necessary.
 */
const builtInPatches: ILibraryFilePatch[] = [
    {
        machineName: 'H5P.Echo360',
        filename: 'echo360.js',
        search: 'delete previousTickMS',
        replace: 'previousTickMS = undefined',
        patchReason:
            'The "delete" statement on a local variable causes uglifyJs ' +
            'to throw an error in strict mode during minification.'
    }
];

export default builtInPatches;
