import path from 'path';
import { access, mkdir, readdir, rename, rm } from 'fs/promises';

import PackageImporter from '@lumieducation/h5p-server/src/PackageImporter';
import Logger from '@lumieducation/h5p-server/src/helpers/Logger';

const log = new Logger('exportPackage');
/**
 * Extracts the files in a h5p package into the appropriate directories on the
 * disk. This function can be used to prepare e2e tests with the file storage
 * classes.
 * @param h5pPackagePath the path to the h5p package; the filename will be used
 * as the contentId of the package, so make sure not to have two ids of the same
 * value!
 * @param librariesPath the path to which the libraries should be copied
 * @param contentPath the path to which the content should be copied; this is
 * the root directory of the content storage, NOT the directory with the
 * contentId! (e.g. h5p/content and not h5p/content/H5P.Accordion)
 * @param clearDirs if true, all files in librariesPath and contentPath will be
 * deleted before the package is extracted
 * @returns the contentId used
 */
export default async function (
    h5pPackagePath: string,
    librariesPath: string,
    contentPath: string,
    options: {
        clearDirs?: boolean;
    } = {
        clearDirs: false
    }
): Promise<string> {
    const contentId = path.basename(
        h5pPackagePath,
        path.extname(h5pPackagePath)
    );
    if (options?.clearDirs) {
        await rm(librariesPath, { recursive: true, force: true });
        await rm(contentPath, { recursive: true, force: true });
    }
    await mkdir(librariesPath, { recursive: true });
    await mkdir(contentPath, { recursive: true });

    await PackageImporter.extractPackage(h5pPackagePath, librariesPath, {
        includeContent: false,
        includeLibraries: true,
        includeMetadata: false
    });
    const contentPackageRoot = path.join(contentPath, contentId);
    await PackageImporter.extractPackage(h5pPackagePath, contentPackageRoot, {
        includeContent: true,
        includeLibraries: false,
        includeMetadata: true
    });
    const realContentPath = path.join(contentPackageRoot, 'content');
    try {
        await access(realContentPath);
    } catch {
        log.error(
            `Error when extracting content from ${h5pPackagePath}. No content directory.`
        );
        return contentId;
    }
    for (const file of await readdir(realContentPath)) {
        await rename(
            path.join(realContentPath, file),
            path.join(contentPackageRoot, file)
        );
    }
    await rm(realContentPath, { recursive: true, force: true });
    return contentId;
}
