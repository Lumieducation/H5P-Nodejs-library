import type { ITranslationFunction } from '@lumieducation/h5p-server';

import type { IExporterTemplate } from './HtmlExporter';

/**
 * Optional configuration for the {@link HtmlExporter} constructor.
 */
export interface IHtmlExporterOptions {
    /**
     * A custom template function to generate the HTML output.
     */
    template?: IExporterTemplate;

    /**
     * A translation function for localizing the H5P player.
     */
    translationFunction?: ITranslationFunction;

    /**
     * The complete list of patches to apply to library files during bundling.
     * When omitted, {@link builtInPatches} is used. To keep the built-in
     * patches and add your own, pass `[...builtInPatches, ...myPatches]`.
     * To replace the list entirely, pass only your own patches.
     * See {@link ILibraryFilePatch} for details.
     */
    libraryPatches?: ILibraryFilePatch[];
}

/**
 * Defines a patch to apply to a library file during HTML export bundling.
 *
 * Library file patches allow fixing incompatibilities in H5P library files
 * that would otherwise break the export process (e.g. syntax that causes
 * minification errors) or cause runtime issues in the exported HTML bundle.
 *
 * Patches are applied to the raw file content before any further processing
 * (minification, PostCSS transforms, etc.).
 *
 * @example
 * // Simple string replacement
 * const patch: ILibraryFilePatch = {
 *     machineName: 'H5P.Echo360',
 *     filename: 'echo360.js',
 *     search: 'delete previousTickMS',
 *     replace: 'previousTickMS = undefined',
 *     patchReason: 'delete statement causes uglifyJs error in strict mode'
 * };
 *
 * @example
 * // Regex replacement with version constraint
 * const patch: ILibraryFilePatch = {
 *     machineName: 'H5P.SomeLibrary',
 *     minVersion: { majorVersion: 1, minorVersion: 0 },
 *     maxVersion: { majorVersion: 2, minorVersion: 5 },
 *     filename: 'scripts/main.js',
 *     search: /brokenCall\(\s*\)/g,
 *     replace: 'fixedCall()',
 *     patchReason: 'Fix broken function call in versions 1.0 through 2.5'
 * };
 */
export interface ILibraryFilePatch {
    /**
     * The machine name of the H5P library this patch targets
     * (e.g. "H5P.Echo360", "H5P.BranchingScenario").
     */
    machineName: string;

    /**
     * Minimum library version (inclusive) this patch applies to.
     * Uses H5P's major.minor versioning scheme.
     * If omitted, there is no lower version bound.
     */
    minVersion?: { majorVersion: number; minorVersion: number };

    /**
     * Maximum library version (inclusive) this patch applies to.
     * Uses H5P's major.minor versioning scheme.
     * If omitted, there is no upper version bound, meaning the patch applies
     * to all future versions of the library.
     */
    maxVersion?: { majorVersion: number; minorVersion: number };

    /**
     * The filename within the library to patch (e.g. "js/echo360.js").
     * Matched as an exact path or as a path-segment suffix, so "echo360.js"
     * matches "echo360.js" and "js/echo360.js" but not "notecho360.js".
     */
    filename: string;

    /**
     * The search string or regex pattern to find in the file content.
     *
     * - When a string, performs a literal match.
     * - When a RegExp, performs a regex match. Use the `g` flag or set
     *   {@link replaceAll} to `true` to replace all occurrences.
     */
    search: string | RegExp;

    /**
     * The replacement string. Supports `$1`, `$2`, etc. for regex capture
     * groups.
     */
    replace: string;

    /**
     * If `true`, replaces all occurrences of `search` in the file.
     * If `false` or omitted, only the first occurrence is replaced.
     * @default false
     */
    replaceAll?: boolean;

    /**
     * An optional human-readable description of why this patch exists.
     * This is purely informational and has no effect on patch behavior.
     */
    patchReason?: string;
}
