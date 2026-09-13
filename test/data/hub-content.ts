import path from 'path';

/**
 * The directory containing example content downloaded from the H5P Hub via
 * `npm run download:content`. Shared by the PackageExporter and HtmlExporter
 * integration test suites so both exercise the same corpus of packages.
 *
 * Resolved relative to this file rather than to the current working
 * directory, as the suites importing it are run both from the repository
 * root and from inside their own package directory.
 */
export const hubContentDirectory = path.resolve(__dirname, 'hub-content');

/**
 * Packages on the H5P Hub that declare dependencies on libraries they don't
 * ship themselves and that PackageValidator rejects for that reason. They
 * can't be imported into an empty system at all, so there is nothing to
 * export/render for them. (H5PEditor.CoursePresentation 1.25, which is part
 * of H5P.BranchingScenario, requires H5P.InteractiveVideo 1.27.)
 */
export const packagesWithUnsatisfiableDependencies = [
    'H5P.BranchingScenario.h5p'
];
