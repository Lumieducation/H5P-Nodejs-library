import LibraryName from './LibraryName';
import { ILibraryName, ILibraryStorage } from './types';

import Logger from './helpers/Logger';

const log = new Logger('DependencyGetter');
/**
 * Gets the libraries required to run a specific library.
 * Uses LibraryManager to get metadata for libraries.
 */
export default class DependencyGetter {
    constructor(private libraryStorage: ILibraryStorage) {
        log.info(`initialize`);
    }

    /**
     * Gets all dependent libraries of the libraries in the list.
     * @param libraries the libraries whose dependencies should be retrieved
     * @param dynamic include dependencies that are part of the dynamicDependencies property or used in the content
     * @param editor include dependencies that are listed in editorDependencies
     * @param preloaded include regular dependencies that are included in preloadedDependencies
     * @param doNotAdd libraries in this list will not be added to the dependency list
     * @returns a list of libraries
     */
    public async getDependentLibraries(
        libraries: ILibraryName[],
        {
            dynamic = false,
            editor = false,
            preloaded = false
        }: { dynamic?: boolean; editor?: boolean; preloaded?: boolean },
        doNotAdd?: ILibraryName[]
    ): Promise<ILibraryName[]> {
        log.info(
            `getting dependent libraries for ${libraries
                .map(
                    (dep) =>
                        `${dep.machineName}-${dep.majorVersion}.${dep.minorVersion}`
                )
                .join(', ')}`
        );
        const dependencies = new Set<string>();
        for (const library of libraries) {
            await this.addDependenciesRecursive(
                new LibraryName(
                    library.machineName,
                    typeof library.majorVersion === 'string'
                        ? Number.parseInt(library.majorVersion, 10)
                        : library.majorVersion,
                    typeof library.minorVersion === 'string'
                        ? Number.parseInt(library.minorVersion, 10)
                        : library.minorVersion
                ),
                { preloaded, editor, dynamic },
                dependencies,
                doNotAdd
            );
        }
        return Array.from(dependencies).map((str) =>
            LibraryName.fromUberName(str)
        );
    }

    /**
     * Recursively walks through all dependencies of a library and adds them to the set libraries.
     * @param library the library that is currently being processed
     * @param libraries the set to add to
     * @returns the set that was added to (same as libraries; can be used to chain the call)
     */
    private async addDependenciesRecursive(
        library: ILibraryName,
        {
            dynamic = false,
            editor = false,
            preloaded = false
        }: { dynamic: boolean; editor: boolean; preloaded: boolean },
        libraries: Set<string>,
        doNotAdd?: ILibraryName[]
    ): Promise<Set<string>> {
        log.debug(`adding dependencies recursively`);
        // we use strings to make equality comparison easier
        if (libraries.has(LibraryName.toUberName(library))) {
            return null;
        }
        let metadata;
        try {
            metadata = await this.libraryStorage.getLibrary(library);
        } catch {
            // We silently ignore missing libraries, as this can happen with
            // 'fake libraries' used by the H5P client (= libraries which are
            // referenced in the parameters, but don't exist)
            return libraries;
        }
        if (!doNotAdd?.some((dna) => LibraryName.equal(dna, library))) {
            libraries.add(LibraryName.toUberName(library));
        }
        if (preloaded && metadata.preloadedDependencies) {
            await this.addDependenciesToSet(
                metadata.preloadedDependencies,
                { preloaded, editor, dynamic },
                libraries
            );
        }
        if (editor && metadata.editorDependencies) {
            await this.addDependenciesToSet(
                metadata.editorDependencies,
                { preloaded, editor, dynamic },
                libraries
            );
        }
        if (dynamic && metadata.dynamicDependencies) {
            await this.addDependenciesToSet(
                metadata.dynamicDependencies,
                { preloaded, editor, dynamic },
                libraries
            );
        }
        if (dynamic) {
            // TODO: recurse through semantic structure of content.json
        }

        return libraries;
    }

    /**
     * Adds all dependencies in the list to the set.
     */
    private async addDependenciesToSet(
        dependencies: ILibraryName[],
        {
            dynamic = false,
            editor = false,
            preloaded = false
        }: { dynamic: boolean; editor: boolean; preloaded: boolean },
        libraries: Set<string>,
        doNotAdd?: LibraryName[]
    ): Promise<void> {
        log.info(`adding dependencies to set`);
        for (const dependency of dependencies) {
            await this.addDependenciesRecursive(
                new LibraryName(
                    dependency.machineName,
                    dependency.majorVersion,
                    dependency.minorVersion
                ),
                { preloaded, editor, dynamic },
                libraries,
                doNotAdd
            );
        }
    }
}
