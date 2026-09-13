/* eslint-disable no-await-in-loop */

/**
 * Installs a list of H5P packages, retrying the ones that failed after all
 * others have been installed.
 *
 * Some packages on the H5P Hub declare dependencies on libraries they don't
 * include themselves (H5P.BranchingScenario's editor requires
 * H5P.InteractiveVideo 1.27, which is only shipped by other packages). As
 * PackageValidator rejects packages with unsatisfied dependencies, these
 * packages can only be installed after another package has provided the
 * libraries they are missing.
 * @param files the packages to install
 * @param install the function that installs a single package
 * @returns the results of the install function by package
 * @throws the last error if there are packages left that can't be installed
 */
export async function installPackagesInDependencyOrder<T>(
    files: string[],
    install: (file: string) => Promise<T>
): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    let remaining = files;
    let lastError: Error;

    while (remaining.length > 0) {
        const failed: string[] = [];
        for (const file of remaining) {
            try {
                results.set(file, await install(file));
            } catch (error) {
                failed.push(file);
                lastError = error;
            }
        }
        if (failed.length === remaining.length) {
            // None of the remaining packages could be installed, so waiting
            // for other packages to provide their dependencies won't help.
            throw lastError;
        }
        remaining = failed;
    }

    return results;
}
