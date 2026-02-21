import { ILibraryName } from '@lumieducation/h5p-server';

import { ILibraryFilePatch } from '../types';
import { builtInPatches } from '../patches/builtInPatches';

/**
 * Applies text patches to library files during HTML export bundling.
 *
 * The patcher holds a list of patches and applies all matching ones to each
 * library file. By default the built-in patch list is used. Pass a custom
 * list to the constructor to replace it entirely — spread {@link builtInPatches}
 * into your array if you want to keep the built-in patches alongside your own.
 */
export default class LibraryPatcher {
    /**
     * Creates a new LibraryPatcher.
     *
     * @param patches The complete list of patches to apply. When omitted,
     *   {@link builtInPatches} is used. To add custom patches on top of the
     *   built-ins, pass `[...builtInPatches, ...myPatches]`.
     */
    constructor(patches?: ILibraryFilePatch[]) {
        this.patches = patches ?? builtInPatches;
    }

    private patches: ILibraryFilePatch[];

    /**
     * Determines whether a patch should be applied to a given file.
     *
     * A patch applies when all of the following are true:
     * - The library's machine name matches.
     * - The library's version falls within the patch's version range
     *   (if specified).
     * - The resolved filename equals the patch's filename exactly, or ends
     *   with `/<patch.filename>` (path-segment boundary match).
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

        return (
            filename === patch.filename ||
            filename.endsWith('/' + patch.filename)
        );
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

            if (patch.search === undefined || patch.search === null) {
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
