import { dir } from 'tmp-promise';
import fsExtra from 'fs-extra';

import PackageImporter from '../../src/PackageImporter';
import PackageValidator from '../../src/PackageValidator';
import { IH5PConfig } from '../../src/types';
import { LibraryManager } from '../../src';

export async function validatePackage(
    libraryManager: LibraryManager,
    config: IH5PConfig,
    packagePath: string,
    checkContent: boolean = true,
    checkLibraries: boolean = true
): Promise<any> {
    const packageValidator = new PackageValidator(config, libraryManager);
    // no need to check result as the validator throws an exception if there is an error
    await packageValidator.validateFileSizes(packagePath);
    // we don't use withDir here, to have better error handling (catch & finally block below)
    const { path: tempDirPath } = await dir();

    try {
        await PackageImporter.extractPackage(packagePath, tempDirPath, {
            includeContent: checkContent,
            includeLibraries: checkLibraries,
            includeMetadata: checkContent
        });

        return await packageValidator.validateExtractedPackage(
            tempDirPath,
            checkContent,
            checkLibraries
        );

        // eslint-disable-next-line no-useless-catch
    } catch (error) {
        // if we don't do this, finally weirdly just swallows the errors
        throw error;
    } finally {
        // clean up temporary files in any case
        await fsExtra.remove(tempDirPath);
    }
}
