import { ILibraryFilePatch } from '../types';

/**
 * Built-in patches that fix known incompatibilities in H5P library files
 * during HTML export bundling.
 *
 * These patches are applied automatically when no custom patch list is
 * provided to the {@link HtmlExporter} constructor. Implementors who want
 * to customise the list can import this constant and spread it into their
 * own array:
 *
 * @example
 * import HtmlExporter, { builtInPatches } from '@lumieducation/h5p-html-exporter';
 *
 * const exporter = new HtmlExporter(
 *     libraryStorage,
 *     contentStorage,
 *     config,
 *     coreFilePath,
 *     editorFilePath,
 *     {
 *         libraryPatches: [
 *             ...builtInPatches,            // keep all built-in patches
 *             { machineName: 'H5P.Foo', filename: 'foo.js', search: 'old', replace: 'new' }
 *         ]
 *     }
 * );
 *
 * When adding new built-in patches, document the reason clearly in the
 * `patchReason` field so that future maintainers can determine whether the
 * patch is still necessary.
 */
export const builtInPatches: ILibraryFilePatch[] = [
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
