import { ILibraryName } from '../types';
import LibraryName from '../LibraryName';

/**
 * Checks if the metadata contains any dependencies on the given library.
 * @param metadata
 * @param library
 */
export function hasDependencyOn(
    metadata: {
        dynamicDependencies?: ILibraryName[];
        editorDependencies?: ILibraryName[];
        preloadedDependencies?: ILibraryName[];
    },
    library: ILibraryName
): boolean {
    return (
        metadata.preloadedDependencies?.some((dep) =>
            LibraryName.equal(dep, library)
        ) ||
        metadata.editorDependencies?.some((dep) =>
            LibraryName.equal(dep, library)
        ) ||
        metadata.dynamicDependencies?.some((dep) =>
            LibraryName.equal(dep, library)
        )
    );
}
