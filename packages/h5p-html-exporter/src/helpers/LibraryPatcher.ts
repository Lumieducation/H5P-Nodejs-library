import { ILibraryName } from '@lumieducation/h5p-server';

import { ILibraryFilePatch } from '../types';
import builtInPatches from '../patches/builtInPatches';

/**
 * Applies text patches to library files during HTML export bundling.
 *
 * The patcher holds a merged list of built-in and custom patches. Built-in
 * patches ship with the package and fix known incompatibilities (e.g. the
 * echo360.js strict-mode issue). Custom patches can be provided by the
 * implementor to fix additional issues or to override/disable built-in patches.
 *
 * **Merge strategy:** A custom patch with the same `machineName` and
 * `filename` as a built-in patch replaces that built-in patch entirely.
 * All other built-in patches remain active. This allows implementors to
 * override or disable specific patches without losing the rest.
 */
export default class LibraryPatcher {
    /**
     * Creates a new LibraryPatcher with the merged set of built-in and custom
     * patches.
     *
     * @param customPatches Optional patches provided by the implementor.
     *   A custom patch whose `machineName` and `filename` match a built-in
     *   patch replaces that built-in patch. Set `disabled: true` on a custom
     *   patch to effectively remove a built-in patch without adding a
     *   replacement.
     */
    constructor(customPatches?: ILibraryFilePatch[]) {
        this.patches = LibraryPatcher.mergePatches(
            builtInPatches,
            customPatches ?? []
        );
    }

    private patches: ILibraryFilePatch[];

    /**
     * Merges built-in patches with custom patches. For each built-in patch,
     * if a custom patch targets the same `machineName` and `filename`, the
     * built-in patch is dropped. All custom patches (including overrides and
     * additions) are then appended.
     *
     * @param builtIn The built-in patch definitions.
     * @param custom The custom patch definitions from the implementor.
     * @returns The merged patch list.
     */
    private static mergePatches(
        builtIn: ILibraryFilePatch[],
        custom: ILibraryFilePatch[]
    ): ILibraryFilePatch[] {
        const survivingBuiltIn = builtIn.filter(
            (bp) =>
                !custom.some(
                    (cp) =>
                        cp.machineName === bp.machineName &&
                        cp.filename === bp.filename
                )
        );
        return [...survivingBuiltIn, ...custom];
    }

    /**
     * Determines whether a patch should be applied to a given file.
     *
     * A patch applies when all of the following are true:
     * - The patch is not disabled.
     * - The library's machine name matches.
     * - The library's version falls within the patch's version range
     *   (if specified).
     * - The resolved filename ends with the patch's filename.
     *
     * @param patch The patch definition to check.
     * @param filename The resolved filename within the library.
     * @param library The library identity.
     * @returns `true` if the patch should be applied.
     */
    private static patchApplies(
        patch: ILibraryFilePatch,
        filename: string,
        library: ILibraryName
    ): boolean {
        if (patch.disabled) {
            return false;
        }

        if (patch.machineName !== library.machineName) {
            return false;
        }

        if (
            patch.minVersion &&
            !LibraryPatcher.versionGte(library, patch.minVersion)
        ) {
            return false;
        }
        if (
            patch.maxVersion &&
            !LibraryPatcher.versionLte(library, patch.maxVersion)
        ) {
            return false;
        }

        return filename.endsWith(patch.filename);
    }

    /**
     * Returns `true` if version `a` is greater than or equal to version `b`
     * using H5P's major.minor comparison.
     */
    private static versionGte(
        a: { majorVersion: number; minorVersion: number },
        b: { majorVersion: number; minorVersion: number }
    ): boolean {
        if (a.majorVersion !== b.majorVersion) {
            return a.majorVersion > b.majorVersion;
        }
        return a.minorVersion >= b.minorVersion;
    }

    /**
     * Returns `true` if version `a` is less than or equal to version `b`
     * using H5P's major.minor comparison.
     */
    private static versionLte(
        a: { majorVersion: number; minorVersion: number },
        b: { majorVersion: number; minorVersion: number }
    ): boolean {
        if (a.majorVersion !== b.majorVersion) {
            return a.majorVersion < b.majorVersion;
        }
        return a.minorVersion <= b.minorVersion;
    }

    /**
     * Applies all matching patches to the file content.
     *
     * Patches are matched by library machine name, version range, and
     * filename. Multiple patches can match the same file; they are applied
     * in order.
     *
     * Only library files are patched. If `library` is `undefined` (i.e. the
     * file is a core or editor file), the content is returned unchanged.
     *
     * @param text The raw file content.
     * @param filename The filename within the library (e.g. "js/echo360.js").
     * @param library The library identity, or `undefined` for core/editor
     *   files.
     * @returns The patched file content.
     */
    public applyPatches(
        text: string,
        filename: string,
        library: ILibraryName | undefined
    ): string {
        if (!library) {
            return text;
        }

        let result = text;
        for (const patch of this.patches) {
            if (!LibraryPatcher.patchApplies(patch, filename, library)) {
                continue;
            }

            if (typeof patch.search === 'string') {
                if (patch.replaceAll) {
                    result = result.replaceAll(patch.search, patch.replace);
                } else {
                    result = result.replace(patch.search, patch.replace);
                }
            } else {
                // RegExp
                const flags = patch.replaceAll
                    ? patch.search.flags.includes('g')
                        ? patch.search.flags
                        : patch.search.flags + 'g'
                    : patch.search.flags;
                result = result.replace(
                    new RegExp(patch.search.source, flags),
                    patch.replace
                );
            }
        }
        return result;
    }
}
