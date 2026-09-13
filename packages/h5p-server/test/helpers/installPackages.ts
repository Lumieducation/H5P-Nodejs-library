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
 * @throws an error naming every package that is still failing (with its own
 * message) once a retry round makes no further progress. (Rethrowing only
 * the error of whichever package happened to be processed last in that round
 * would attribute a future genuine regression to the wrong file.)
 */
export async function installPackagesInDependencyOrder<T>(
    files: string[],
    install: (file: string) => Promise<T>
): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    let remaining = files;
    let lastFailures: Map<string, Error>;

    while (remaining.length > 0) {
        const failed: string[] = [];
        const failures = new Map<string, Error>();
        for (const file of remaining) {
            try {
                results.set(file, await install(file));
            } catch (error) {
                failed.push(file);
                failures.set(file, error);
            }
        }
        if (failed.length === remaining.length) {
            // None of the remaining packages could be installed, so waiting
            // for other packages to provide their dependencies won't help.
            lastFailures = failures;
            break;
        }
        remaining = failed;
    }

    if (lastFailures) {
        throw new Error(
            `Could not install ${lastFailures.size} package(s):\n${[
                ...lastFailures.entries()
            ]
                .map(([file, error]) => `${file}: ${error.message}`)
                .join('\n')}`
        );
    }

    return results;
}
