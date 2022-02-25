import { Readable } from 'stream';
import fsExtra from 'fs-extra';
import { getAllFiles } from 'get-all-files';
import upath from 'upath';

import H5pError from './helpers/H5pError';
import Logger from './helpers/Logger';
import InstalledLibrary from './InstalledLibrary';
import LibraryName from './LibraryName';
import {
    IFileStats,
    IFullLibraryName,
    IInstalledLibrary,
    ILanguageFileEntry,
    ILibraryFileUrlResolver,
    ILibraryInstallResult,
    ILibraryMetadata,
    ILibraryName,
    ILibraryStorage,
    ILockProvider,
    IPath,
    ISemanticsEntry,
    ITranslationFunction
} from './types';
import TranslatorWithFallback from './helpers/TranslatorWithFallback';
import SimpleLockProvider from './implementation/SimpleLockProvider';
import variantEquivalents from '../assets/variantEquivalents.json';

const log = new Logger('LibraryManager');

/**
 * This class manages library installations, enumerating installed libraries etc.
 * It is storage agnostic and can be re-used in all implementations/plugins.
 */

export default class LibraryManager {
    /**
     *
     * @param libraryStorage the library repository that persists library
     * somewhere.
     * @param fileUrlResolver gets URLs at which a file in a library can be
     * downloaded. Must be passed through from the implementation.
     * @param alterLibrarySemantics a hook that allows implementations to change
     * the semantics of certain libraries; should be used together with
     * alterLibraryLanguageFile if you plan to use any other language than
     * English! See the documentation of IH5PEditorOptions for more details.
     * @param alterLibraryLanguageFile a hook that allows implementations to
     * change the language files of certain libraries; should be used together
     * with alterLibrarySemantics if you plan to use any other language than
     * English! See the documentation of IH5PEditorOptions for more details.
     * @param translationFunction (optional) The translation function to use if
     * you want to localize library metadata (titles). If undefined, no
     * localization will be performed.
     * @param lock (optional) an implementation of a locking mechanism that
     * prevents race conditions. If this is left undefined a simple
     * single-process lock mechanism will be used. If the library is used within
     * a multi-process or cluster setup, it is necessary to pass in a
     * distributed locking implementation.
     */
    constructor(
        public libraryStorage: ILibraryStorage,
        private fileUrlResolver: ILibraryFileUrlResolver = (
            library,
            filename
        ) => '', // default is there to avoid having to pass empty function in tests
        private alterLibrarySemantics?: (
            library: ILibraryName,
            semantics: ISemanticsEntry[]
        ) => ISemanticsEntry[],
        private alterLibraryLanguageFile?: (
            library: ILibraryName,
            languageFile: ILanguageFileEntry[],
            language: string
        ) => ILanguageFileEntry[],
        translationFunction?: ITranslationFunction,
        lockProvider?: ILockProvider,
        private config?: {
            installLibraryLockMaxOccupationTime: number;
            installLibraryLockTimeout: number;
        }
    ) {
        log.info('initialize');
        if (translationFunction) {
            this.translator = new TranslatorWithFallback(translationFunction, [
                'hub',
                'library-metadata'
            ]);
        }
        if (!lockProvider) {
            this.lock = new SimpleLockProvider();
        } else {
            this.lock = lockProvider;
        }

        if (!this.config) {
            this.config = {
                installLibraryLockMaxOccupationTime: 10000,
                installLibraryLockTimeout: 120000
            };
        }
    }

    private translator: TranslatorWithFallback;
    private lock: ILockProvider;

    /**
     * Returns a readable stream of a library file's contents.
     * Throws an exception if the file does not exist.
     * @param library library
     * @param filename the relative path inside the library
     * @returns a readable stream of the file's contents
     */
    public async getFileStats(
        library: ILibraryName,
        file: string
    ): Promise<IFileStats> {
        log.debug(
            `getting stats ${file} from library ${LibraryName.toUberName(
                library
            )}`
        );
        return this.libraryStorage.getFileStats(library, file);
    }

    /**
     * Returns a readable stream of a library file's contents.
     * Throws an exception if the file does not exist.
     * @param library library
     * @param filename the relative path inside the library
     * @returns a readable stream of the file's contents
     */
    public async getFileStream(
        library: ILibraryName,
        file: string
    ): Promise<Readable> {
        log.debug(
            `getting file ${file} from library ${LibraryName.toUberName(
                library
            )}`
        );
        return this.libraryStorage.getFileStream(library, file);
    }

    /**
     * Gets the language file for the specified language.
     * @param library
     * @param language the language code
     * @returns a string with the contents language file; null if the library
     * isn't localized to the language
     */
    public async getLanguage(
        library: ILibraryName,
        language: string
    ): Promise<string> {
        const cleanLanguage = language.toLocaleLowerCase();
        try {
            // Try full language code first
            return await this.getLanguageWithoutFallback(
                library,
                cleanLanguage
            );
        } catch (ignored) {
            // The language file didn't exist
            log.debug(
                `language '${cleanLanguage}' not found for ${LibraryName.toUberName(
                    library
                )}`
            );

            // Try known variant equivalents (e.g. zh-hans, zh-cn, zh)
            const variantList = variantEquivalents
                .find((l) => l.includes(cleanLanguage))
                ?.filter((v) => v !== cleanLanguage);
            if (variantList) {
                for (const variant of variantList) {
                    try {
                        log.debug(`Trying variant equivalent ${variant}`);
                        // eslint-disable-next-line no-await-in-loop
                        return await this.getLanguageWithoutFallback(
                            library,
                            variant
                        );
                    } catch {
                        log.debug(
                            `Variant equivalent ${variant} not found. Continuing...`
                        );
                    }
                }
            }

            // Try fallback to language without variant
            const languageCodeMatch = /^([a-zA-Z]+)-([a-zA-Z]+)$/.exec(
                cleanLanguage
            );
            if (languageCodeMatch && languageCodeMatch.length === 3) {
                log.debug(
                    `Language code ${cleanLanguage} seems to contain country code. Trying without it.`
                );
                try {
                    return await this.getLanguageWithoutFallback(
                        library,
                        languageCodeMatch[1]
                    );
                } catch {
                    log.debug(`Language ${languageCodeMatch[1]} not found`);
                }
            }

            // Fallback to English
            if (cleanLanguage !== 'en' && cleanLanguage !== '.en') {
                try {
                    return await this.getLanguageWithoutFallback(library, 'en');
                } catch {
                    log.debug('Language en not found');
                }
                try {
                    return await this.getLanguageWithoutFallback(
                        library,
                        '.en'
                    );
                } catch {
                    log.debug('Language .en not found');
                }
            }
            if (cleanLanguage === 'en') {
                try {
                    return await this.getLanguageWithoutFallback(
                        library,
                        '.en'
                    );
                } catch {
                    log.debug('Language .en not found');
                }
            }
            return null;
        }
    }

    /**
     * Returns the information about the library that is contained in
     * library.json.
     * @param library The library to get (machineName, majorVersion and
     * minorVersion is enough)
     * @param language (optional) the language to use for the title, will always
     * fall back to English if it is not possible to localize
     * @returns the decoded JSON data or undefined if library is not installed
     */
    public async getLibrary(
        library: ILibraryName,
        language?: string
    ): Promise<IInstalledLibrary> {
        try {
            log.debug(
                `loading library ${LibraryName.toUberName(
                    library
                )}. Requested language: ${language}`
            );
            const metadata = await this.libraryStorage.getLibrary(library);
            if (
                this.translator &&
                language &&
                language.toLowerCase() !== 'en' &&
                !language.toLowerCase().startsWith('en-')
            ) {
                log.debug(`Trying to localize title`);
                metadata.title = this.translator.tryLocalize(
                    `${metadata.machineName.replace('.', '_')}.title`,
                    metadata.title,
                    language
                );
            }
            return metadata;
        } catch {
            log.warn(
                `library ${LibraryName.toUberName(library)} is not installed`
            );
            return undefined;
        }
    }

    /**
     * Returns a (relative) URL for a library file that can be used to hard-code
     * URLs of specific files if necessary. Avoid using this method when
     * possible! This method does NOT check if the file exists!
     * @param library the library for which the URL should be retrieved
     * @param file the filename inside the library (path)
     * @returns the URL of the file
     */
    public getLibraryFileUrl(library: ILibraryName, file: string): string {
        log.debug(
            `getting URL of file ${file} for library ${library.machineName}-${library.majorVersion}.${library.minorVersion}`
        );
        const url = this.fileUrlResolver(library, file);
        log.debug(`URL resolved to ${url}`);
        return url;
    }

    /**
     * Checks which libraries in the list are not installed.
     * @param libraries the list of libraries to check
     * @returns the list of not installed libraries
     */
    public async getNotInstalledLibraries(
        libraries: ILibraryName[]
    ): Promise<ILibraryName[]> {
        const allLibraries = await this.listInstalledLibraries();
        const missingLibraries = [];
        for (const lib of libraries) {
            if (
                !allLibraries[lib.machineName]?.find(
                    (l) => l.compareVersions(lib) === 0
                )
            ) {
                missingLibraries.push(lib);
            }
        }
        return missingLibraries;
    }

    /**
     * Returns the content of semantics.json for the specified library.
     * @param library
     * @returns the content of semantics.json
     */
    public async getSemantics(
        library: ILibraryName
    ): Promise<ISemanticsEntry[]> {
        log.debug(
            `loading semantics for library ${LibraryName.toUberName(library)}`
        );
        const originalSemantics = await this.libraryStorage.getFileAsJson(
            library,
            'semantics.json'
        );

        // We call the hook that allows implementations to alter library
        // semantics;
        if (this.alterLibrarySemantics) {
            log.debug('Calling alterLibrarySemantics hook');
            const alteredSemantics = await this.alterLibrarySemantics(
                library,
                originalSemantics
            );
            if (!alteredSemantics) {
                throw new Error(
                    'alterLibrarySemantics returned undefined, but must return a proper list of semantic entries'
                );
            }
            return alteredSemantics;
        }
        return originalSemantics;
    }

    /**
     * Returns a URL of the upgrades script in the library
     * @param library the library whose upgrade script should be accessed
     * @returns the URL of upgrades.js. Null if there is no upgrades file.
     * (The null value can be passed back to the client.)
     */
    public async getUpgradesScriptPath(library: ILibraryName): Promise<string> {
        log.debug(
            `getting upgrades script for ${library.machineName}-${library.majorVersion}.${library.minorVersion}`
        );
        if (await this.libraryStorage.fileExists(library, 'upgrades.js')) {
            return this.getLibraryFileUrl(library, 'upgrades.js');
        }
        log.debug(`no upgrades script found.`);
        return null;
    }

    /**
     * Installs or updates a library from a temporary directory. It does not
     * delete the library files in the temporary directory. The method does NOT
     * validate the library! It must be validated before calling this method!
     * Throws an error if something went wrong and deletes the files already
     * installed.
     * @param directory The path to the temporary directory that contains the
     * library files (the root directory that includes library.json)
     * @returns a structure telling if a library was newly installed, updated or
     * nothing happened (e.g. because there already is a newer patch version
     * installed).
     */
    public async installFromDirectory(
        directory: string,
        restricted: boolean = false
    ): Promise<ILibraryInstallResult> {
        log.info(`installing from directory ${directory}`);
        const newLibraryMetadata: ILibraryMetadata = await fsExtra.readJSON(
            `${directory}/library.json`
        );
        const newVersion = {
            machineName: newLibraryMetadata.machineName,
            majorVersion: newLibraryMetadata.majorVersion,
            minorVersion: newLibraryMetadata.minorVersion,
            patchVersion: newLibraryMetadata.patchVersion
        };

        try {
            return await this.lock.acquire(
                `install-from-directory:${LibraryName.toUberName(newVersion)}`,
                async () => {
                    if (await this.libraryExists(newLibraryMetadata)) {
                        // Check if library is already installed.
                        let oldVersion: IFullLibraryName;
                        if (
                            // eslint-disable-next-line no-cond-assign
                            (oldVersion = await this.isPatchedLibrary(
                                newLibraryMetadata
                            ))
                        ) {
                            // Update the library if it is only a patch of an existing library
                            await this.updateLibrary(
                                newLibraryMetadata,
                                directory
                            );
                            return {
                                newVersion,
                                oldVersion,
                                type: 'patch'
                            };
                        }
                        // Skip installation of library if it has already been installed and
                        // the library is no patch for it.
                        return { type: 'none' };
                    }
                    // Install the library if it hasn't been installed before (treat
                    // different major/minor versions the same as a new library)
                    await this.installLibrary(
                        directory,
                        newLibraryMetadata,
                        restricted
                    );
                    return {
                        newVersion,
                        type: 'new'
                    };
                },
                {
                    timeout: this.config.installLibraryLockTimeout,
                    maxOccupationTime:
                        this.config.installLibraryLockMaxOccupationTime
                }
            );
        } catch (error) {
            const ubername = LibraryName.toUberName(newLibraryMetadata);
            if (error.message == 'occupation-time-exceeded') {
                log.error(
                    `The installation of the library ${ubername} took longer than the allowed ${this.config.installLibraryLockMaxOccupationTime} ms.`
                );
                throw new H5pError(
                    'server:install-library-lock-max-time-exceeded',
                    {
                        ubername,
                        limit: this.config.installLibraryLockTimeout.toString()
                    },
                    500
                );
            }
            if (error.message == 'timeout') {
                log.error(
                    `Could not acquire installation lock for library ${ubername} within the limit of ${this.config.installLibraryLockTimeout} ms.`
                );
                throw new H5pError(
                    'server:install-library-lock-timeout',
                    {
                        ubername,
                        limit: this.config.installLibraryLockTimeout.toString()
                    },
                    500
                );
            }
            throw error;
        }
    }

    /**
     * Is the library a patched version of an existing library?
     * @param library The library the check
     * @returns the full library name of the already installed version if there
     * is a patched version of an existing library, undefined otherwise
     */
    public async isPatchedLibrary(
        library: IFullLibraryName
    ): Promise<IFullLibraryName> {
        log.info(
            `checking if library ${LibraryName.toUberName(library)} is patched`
        );
        const wrappedLibraryInfos = await this.listInstalledLibraries(
            library.machineName
        );
        if (!wrappedLibraryInfos || !wrappedLibraryInfos[library.machineName]) {
            return undefined;
        }
        const libraryInfos = wrappedLibraryInfos[library.machineName];

        for (const lib of libraryInfos) {
            if (
                lib.majorVersion === library.majorVersion &&
                lib.minorVersion === library.minorVersion
            ) {
                if (lib.patchVersion < library.patchVersion) {
                    return {
                        machineName: lib.machineName,
                        majorVersion: lib.majorVersion,
                        minorVersion: lib.minorVersion,
                        patchVersion: lib.patchVersion
                    };
                }
                break;
            }
        }
        return undefined;
    }

    /**
     * Checks if a library was installed.
     * @param library the library to check
     * @returns true if the library has been installed
     */
    public async libraryExists(library: LibraryName): Promise<boolean> {
        return this.libraryStorage.isInstalled(library);
    }

    /**
     * Check if the library contains a file
     * @param library The library to check
     * @param filename
     * @return {Promise<boolean>} true if file exists in library, false
     * otherwise
     */
    public async libraryFileExists(
        library: ILibraryName,
        filename: string
    ): Promise<boolean> {
        log.debug(
            `checking if file ${filename} exists for library ${LibraryName.toUberName(
                library
            )}`
        );
        return this.libraryStorage.fileExists(library, filename);
    }

    /**
     * Checks if the given library has a higher version than the highest
     * installed version.
     * @param library Library to compare against the highest locally installed
     * version.
     * @returns true if the passed library contains a version that is higher
     * than the highest installed version, false otherwise
     */
    public async libraryHasUpgrade(
        library: IFullLibraryName
    ): Promise<boolean> {
        log.verbose(
            `checking if library ${library.machineName}-${library.majorVersion}.${library.minorVersion} has an upgrade`
        );
        const wrappedLibraryInfos = await this.listInstalledLibraries(
            library.machineName
        );
        if (!wrappedLibraryInfos || !wrappedLibraryInfos[library.machineName]) {
            return false;
        }
        const allInstalledLibsOfMachineName = wrappedLibraryInfos[
            library.machineName
        ].sort((a: any, b: any) => a.compareVersions(b));
        const highestLocalLibVersion =
            allInstalledLibsOfMachineName[
                allInstalledLibsOfMachineName.length - 1
            ];
        if (highestLocalLibVersion.compareVersions(library) < 0) {
            return true;
        }
        return false;
    }

    public async listAddons(): Promise<ILibraryMetadata[]> {
        if (this.libraryStorage.listAddons) {
            return this.libraryStorage.listAddons();
        }
        return [];
    }

    /**
     * Gets a list of files that exist in the library.
     * @param library the library for which the files should be listed
     * @return the files in the library including language files
     */
    public async listFiles(library: ILibraryName): Promise<string[]> {
        log.verbose(
            `listing files for library ${LibraryName.toUberName(library)}`
        );
        return this.libraryStorage.listFiles(library);
    }

    /**
     * Get a list of the currently installed libraries.
     * @param machineName (optional) only return results for the machine name
     * @returns An object which has properties with the existing library machine
     * names. The properties' values are arrays of Library objects, which
     * represent the different versions installed of this library.
     */
    public async listInstalledLibraries(
        machineName?: string
    ): Promise<{ [machineName: string]: IInstalledLibrary[] }> {
        if (machineName) {
            log.debug(`Listing libraries with machineName ${machineName}`);
        } else {
            log.debug('Listing all installed libraries.');
        }

        let libraries = await this.libraryStorage.getInstalledLibraryNames(
            machineName
        );
        libraries = (
            await Promise.all(
                libraries.map(async (libName) => {
                    const installedLib = InstalledLibrary.fromName(libName);
                    const info = await this.getLibrary(libName);
                    installedLib.patchVersion = info.patchVersion;
                    installedLib.runnable = info.runnable;
                    installedLib.title = info.title;
                    return installedLib;
                })
            )
        ).sort((lib1, lib2) => lib1.compareVersions(lib2));

        const returnObject = {};
        for (const library of libraries) {
            if (!returnObject[library.machineName]) {
                returnObject[library.machineName] = [];
            }
            returnObject[library.machineName].push(library);
        }
        return returnObject;
    }

    /**
     * Gets a list of translations that exist for this library.
     * @param library
     * @returns the language codes for translations of this library
     */
    public async listLanguages(library: ILibraryName): Promise<string[]> {
        try {
            log.verbose(
                `listing languages for library ${LibraryName.toUberName(
                    library
                )}`
            );
            const installedLanguages = await this.libraryStorage.getLanguages(
                library
            );
            // always include English as its the language of the semantics file
            if (!installedLanguages.includes('en')) {
                installedLanguages.push('en');
            }
            return installedLanguages;
        } catch (error) {
            log.warn(
                `no languages found for library ${LibraryName.toUberName(
                    library
                )}`
            );
            return [];
        }
    }

    /**
     * Checks (as far as possible) if all necessary files are present for the
     * library to run properly.
     * @param library The library to check
     * @returns true if the library is ok. Throws errors if not.
     */
    private async checkConsistency(library: ILibraryName): Promise<boolean> {
        if (!(await this.libraryExists(library))) {
            log.error(
                `Error in library ${LibraryName.toUberName(
                    library
                )}: not installed.`
            );
            throw new H5pError('library-consistency-check-not-installed', {
                name: LibraryName.toUberName(library)
            });
        }

        let metadata: ILibraryMetadata;
        try {
            metadata = await this.libraryStorage.getLibrary(library);
        } catch (error) {
            throw new H5pError(
                'library-consistency-check-library-json-unreadable',
                {
                    message: error.message,
                    name: LibraryName.toUberName(library)
                }
            );
        }
        if (metadata.preloadedJs) {
            await this.checkFiles(
                library,
                metadata.preloadedJs.map((js: IPath) => js.path)
            );
        }
        if (metadata.preloadedCss) {
            await this.checkFiles(
                library,
                metadata.preloadedCss.map((css: IPath) => css.path)
            );
        }

        return true;
    }

    /**
     * Checks if all files in the list are present in the library.
     * @param library The library to check
     * @param requiredFiles The files (relative paths in the library) that must
     * be present
     * @returns true if all dependencies are present. Throws an error if any are
     * missing.
     */
    private async checkFiles(
        library: ILibraryName,
        requiredFiles: string[]
    ): Promise<boolean> {
        log.debug(
            `checking files ${requiredFiles.join(
                ', '
            )} for ${LibraryName.toUberName(library)}`
        );
        const missingFiles = (
            await Promise.all(
                requiredFiles.map(async (file: string) => ({
                    path: file,
                    status: await this.libraryStorage.fileExists(library, file)
                }))
            )
        )
            .filter((file: { status: boolean }) => !file.status)
            .map((file: { path: string }) => file.path);
        if (missingFiles.length > 0) {
            throw new H5pError('library-consistency-check-file-missing', {
                files: missingFiles,
                name: LibraryName.toUberName(library)
            });
        }
        return true;
    }

    /**
     * Copies all library file s from a directory (excludes library.json) to the
     * storage. Throws errors if something went wrong.
     * @param fromDirectory The directory to copy from
     * @param libraryInfo the library object
     * @returns
     */
    private async copyLibraryFiles(
        fromDirectory: string,
        libraryInfo: ILibraryName
    ): Promise<void> {
        log.info(`copying library files from ${fromDirectory}`);
        const fromDirectoryLength = fromDirectory.length + 1;
        const files = await getAllFiles(fromDirectory).toArray();
        await Promise.all(
            files.map((fileFullPath: string) => {
                const fileLocalPath: string =
                    fileFullPath.substr(fromDirectoryLength);
                if (fileLocalPath === 'library.json') {
                    return Promise.resolve(true);
                }
                const readStream: Readable =
                    fsExtra.createReadStream(fileFullPath);
                return this.libraryStorage.addFile(
                    libraryInfo,
                    upath.toUnix(fileLocalPath),
                    readStream
                );
            })
        );
    }

    /**
     * Installs a library and rolls back changes if the library installation
     * failed. Throws errors if something went wrong.
     * @param fromDirectory the local directory to install from
     * @param libraryInfo the library object
     * @param libraryMetadata the library metadata
     * @param restricted true if the library can only be installed with a
     * special permission
     * @returns the library object (containing - among others - the id of the
     * newly installed library)
     */
    private async installLibrary(
        fromDirectory: string,
        libraryMetadata: ILibraryMetadata,
        restricted: boolean
    ): Promise<IInstalledLibrary> {
        log.info(
            `installing library ${LibraryName.toUberName(
                libraryMetadata
            )} from ${fromDirectory}`
        );

        const ubername = LibraryName.toUberName(libraryMetadata);

        try {
            return await this.lock.acquire(
                `install-library:${ubername}`,
                async () => {
                    const newLibraryInfo = await this.libraryStorage.addLibrary(
                        libraryMetadata,
                        restricted
                    );

                    try {
                        await this.copyLibraryFiles(
                            fromDirectory,
                            newLibraryInfo
                        );
                        await this.checkConsistency(libraryMetadata);
                    } catch (error) {
                        log.error(
                            `There was a consistency error when installing library ${ubername}. Reverting installation.`
                        );
                        await this.libraryStorage.deleteLibrary(
                            libraryMetadata
                        );
                        throw error;
                    }
                    log.debug(
                        `library ${LibraryName.toUberName(
                            libraryMetadata
                        )} successfully installed.`
                    );
                    return newLibraryInfo;
                },
                {
                    timeout: this.config.installLibraryLockTimeout,
                    maxOccupationTime:
                        this.config.installLibraryLockMaxOccupationTime
                }
            );
        } catch (error) {
            if (error.message == 'occupation-time-exceeded') {
                log.error(
                    `The installation of library ${ubername} took longer than the allowed ${this.config.installLibraryLockMaxOccupationTime} ms. Deleting the library.`
                );
                throw new H5pError(
                    'server:install-library-lock-max-time-exceeded',
                    {
                        ubername,
                        limit: this.config.installLibraryLockTimeout.toString()
                    },
                    500
                );
            }
            if (error.message == 'timeout') {
                log.error(
                    `Could not acquire installation lock for library ${ubername} within the limit of ${this.config.installLibraryLockTimeout} ms.`
                );
                throw new H5pError(
                    'server:install-library-lock-timeout',
                    {
                        ubername,
                        limit: this.config.installLibraryLockTimeout.toString()
                    },
                    500
                );
            }
            throw error;
        }
    }

    /**
     * Updates the library to a new version. REMOVES THE LIBRARY IF THERE IS AN
     * ERROR!!!
     * @param filesDirectory the path of the directory containing the library
     * files to update to
     * @param library the library object
     * @param newLibraryMetadata the library metadata (library.json)
     */
    private async updateLibrary(
        newLibraryMetadata: ILibraryMetadata,
        filesDirectory: string
    ): Promise<any> {
        try {
            log.info(
                `updating library ${LibraryName.toUberName(
                    newLibraryMetadata
                )} in ${filesDirectory}`
            );
            await this.libraryStorage.updateLibrary(newLibraryMetadata);
            log.info(
                `clearing library ${LibraryName.toUberName(
                    newLibraryMetadata
                )} from files`
            );
            await this.libraryStorage.clearFiles(newLibraryMetadata);
            await this.copyLibraryFiles(filesDirectory, newLibraryMetadata);
            await this.checkConsistency(newLibraryMetadata);
        } catch (error) {
            log.error(error);
            log.info(
                `removing library ${LibraryName.toUberName(newLibraryMetadata)}`
            );
            await this.libraryStorage.deleteLibrary(newLibraryMetadata);
            throw error;
        }
    }

    private async getLanguageWithoutFallback(
        library: ILibraryName,
        language: string
    ): Promise<string> {
        log.debug(
            `loading language ${language} for library ${LibraryName.toUberName(
                library
            )}`
        );
        const languageFileAsString = await this.libraryStorage.getFileAsString(
            library,
            `language/${language}.json`
        );
        // If the implementation has specified one, we use a hook to alter
        // the language files to match the structure of the altered
        // semantics.
        if (this.alterLibraryLanguageFile) {
            log.debug('Calling hook to alter language file of library.');
            return JSON.stringify({
                semantics: this.alterLibraryLanguageFile(
                    library,
                    JSON.parse(languageFileAsString).semantics,
                    language
                )
            });
        }
        return languageFileAsString;
    }
}
