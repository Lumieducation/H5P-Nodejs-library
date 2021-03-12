import Ajv, { ValidateFunction } from 'ajv';
import ajvKeywords from 'ajv-keywords';
import * as path from 'path';
import promisepipe from 'promisepipe';
import { WritableStreamBuffer } from 'stream-buffers';
import * as yauzlPromise from 'yauzl-promise';
import fsExtra from 'fs-extra';

import AggregateH5pError from './helpers/AggregateH5pError';
import H5pError from './helpers/H5pError';
import Logger from './helpers/Logger';
import { formatBytes } from './helpers/StringFormatter';
import {
    throwErrorsNowRule,
    ValidatorBuilder
} from './helpers/ValidatorBuilder';
import { IH5PConfig } from './types';

const log = new Logger('PackageValidator');

/**
 * Performs checks if uploaded H5P packages or those from the H5P Hub are valid.
 * Call await validatePackage(...) to perform these checks.
 *
 * The validator currently does not check if all necessary library versions will be present after performing
 * an upgrade (done in ll. 968 - 1032 of h5p.classes.php). This is not done because it would require enumerating
 * all installed libraries and this is not possible in the extractor without introducing a dependency to the
 * core.
 *
 * REMARK: Note that the validator operates on zip files and thus has to use slashes (/) in paths regardless of the
 * operating system!
 */
export default class PackageValidator {
    /**
     * @param configurationValues Object containing all required configuration parameters
     */
    constructor(private config: IH5PConfig) {
        log.info(`initialize`);
        this.contentExtensionWhitelist = config.contentWhitelist.split(' ');
        this.libraryExtensionWhitelist = config.libraryWhitelist
            .split(' ')
            .concat(this.contentExtensionWhitelist);
    }

    private contentExtensionWhitelist: string[];
    private h5pMetadataValidator: any;
    private libraryDirectoryNameRegex: RegExp = /^[\w0-9\-.]{1,255}$/i;
    private libraryExtensionWhitelist: string[];
    private libraryMetadataValidator: any;

    /**
     * Returns a list of top-level directories in the zip file
     * @param zipEntries
     * @returns list of top-level directories
     */
    private static getTopLevelDirectories(
        zipEntries: yauzlPromise.Entry[]
    ): string[] {
        log.verbose(
            `getting top level directories ${zipEntries
                .map((entry) => entry.fileName)
                .join(', ')}`
        );
        return Object.keys(
            zipEntries.reduce((directorySet, entry) => {
                const split = entry.fileName.split('/');
                if (split.length > 1) {
                    directorySet[split[0]] = true;
                }
                return directorySet;
            }, {})
        );
    }

    /**
     * Checks if the passed filename has an extension that is in the passed list.
     * @param filename The filename to check
     * @param allowedExtensions A list of extensions to check against
     */
    private static isAllowedFileExtension(
        filename: string,
        allowedExtensions: string[]
    ): boolean {
        log.verbose(
            `checking allowed file extension: ${filename} - allowed extensions: ${allowedExtensions.join(
                ', '
            )}`
        );
        let actualExtension = path.extname(filename);
        if (actualExtension === '') {
            return false;
        }
        actualExtension = actualExtension.substr(1);
        if (
            allowedExtensions.some(
                (allowedExtension) => allowedExtension === actualExtension
            )
        ) {
            return true;
        }
        return false;
    }

    /**
     * Checks if a zip file path is a directory
     * @param p the path to check
     * @returns true if directory, false if not
     */
    private static isDirectory(p: string): boolean {
        log.debug(`checking if ${p} is a directory`);
        return p.endsWith('/');
    }

    /**
     * Opens the zip archive.
     * @param file Path to file to open
     * @returns Zip archive object or undefined if zip file cannot be opened.
     */
    private static async openZipArchive(
        file: string
    ): Promise<yauzlPromise.ZipFile> {
        try {
            log.info(`opening zip archive ${file}`);
            // we await the promise here because we want to catch the error and return undefined
            return await yauzlPromise.open(file, { lazyEntries: false });
        } catch (ignored) {
            log.error(`zip file ${file} could not be opened: ${ignored}`);
            return undefined;
        }
    }

    /**
     * Similar to path.join(...) but uses slashes (/) as separators regardless of OS.
     * We have to use slashes when dealing with zip files as the specification for zips require them. If the program
     * runs on Windows path.join(...) uses backslashes \ which don't work for zip files.
     * @param parts The parts of the path to join
     * @returns the full path
     */
    private static pathJoin(...parts: string[]): string {
        const separator = '/';
        const replace = new RegExp(`${separator}{1,}`, 'g');
        return parts.join(separator).replace(replace, separator);
    }

    /**
     * Validates the H5P package located at the path passed to the method.
     * @param h5pFile Path to H5P file to validate
     * @param checkContent If true, the method will check if the content in the package conforms to the standard
     * @param checkLibraries If true, the method will check if the libraries in the package conform to the standard
     * @returns true if the package is valid. Will throw Errors with the error in Error.message if there is a validation error.
     */
    public async validatePackage(
        h5pFile: string,
        checkContent: boolean = true,
        checkLibraries: boolean = true
    ): Promise<any> {
        log.info(`validating package ${h5pFile}`);
        await this.initializeJsonValidators();

        const zipArchive = await PackageValidator.openZipArchive(h5pFile);
        if (!zipArchive) {
            log.error(`zip archive not valid`);
            throw new H5pError('unable-to-unzip', {}, 400);
        }

        const result = await new ValidatorBuilder()
            .addRule(this.fileSizeMustBeWithinLimits)
            .addRule(
                this.filterOutEntries(
                    (entry) =>
                        path.basename(entry.fileName).startsWith('.') ||
                        path.basename(entry.fileName).startsWith('_') ||
                        path.basename(entry.fileName).endsWith('/')
                )
            )
            .addRuleWhen(
                this.fileExtensionMustBeAllowed(
                    (name) => name.startsWith('content/'),
                    this.contentExtensionWhitelist
                ),
                checkContent
            )
            .addRuleWhen(
                this.fileExtensionMustBeAllowed(
                    (name) =>
                        name.includes('/') && !name.startsWith('content/'),
                    this.libraryExtensionWhitelist
                ),
                checkLibraries
            )
            .addRuleWhen(
                this.fileMustExist('h5p.json', 'invalid-h5p-json-file', true),
                checkContent
            )
            .addRuleWhen(
                this.jsonMustConformToSchema(
                    'h5p.json',
                    this.h5pMetadataValidator,
                    'invalid-h5p-json-file-2'
                ),
                checkContent
            )
            .addRuleWhen(
                this.fileMustExist(
                    'content/content.json',
                    'invalid-content-folder',
                    true
                ),
                checkContent
            )
            .addRuleWhen(
                this.jsonMustBeParsable('content/content.json'),
                checkContent
            )
            .addRule(throwErrorsNowRule)
            .addRuleWhen(
                this.filesMustBeReadable((filePath) =>
                    filePath.startsWith('content/')
                ),
                checkContent
            )
            .addRuleWhen(this.librariesMustBeValid, checkLibraries)
            .addRule(throwErrorsNowRule)
            .addRule(this.returnTrue)
            .validate(await zipArchive.readEntries());

        await zipArchive.close();
        return result;
    }

    /**
     * Checks if the core API version required in the metadata can be satisfied by the running instance.
     * @param {{coreApi: { majorVersion: number, minorVersion: number }}} metadata The object containing information about the required core version
     * @param libraryName The name of the library that is being checked.
     * @param error The error object.
     * @returns true if the core API required in the metadata can be satisfied by the running instance. Also true if the metadata doesn't require any core API version.
     */
    private checkCoreVersion(
        metadata: { coreApi: { majorVersion: number; minorVersion: number } },
        libraryName: string,
        error: AggregateH5pError
    ): boolean {
        log.info(`checking core version for ${libraryName}`);
        if (
            !metadata.coreApi ||
            !metadata.coreApi.majorVersion ||
            !metadata.coreApi.minorVersion
        ) {
            return true;
        }
        if (
            metadata.coreApi.majorVersion > this.config.coreApiVersion.major ||
            (metadata.coreApi.majorVersion ===
                this.config.coreApiVersion.major &&
                metadata.coreApi.minorVersion >
                    this.config.coreApiVersion.minor)
        ) {
            log.error(
                `api version ${metadata.coreApi.majorVersion}.${metadata.coreApi.minorVersion} for ${libraryName} not supported`
            );
            error.addError(
                new H5pError(
                    'api-version-unsupported',
                    {
                        component: libraryName,
                        current: `${this.config.coreApiVersion.major}.${this.config.coreApiVersion.minor}`,
                        required: `${metadata.coreApi.majorVersion}.${metadata.coreApi.minorVersion}`
                    },
                    400
                )
            );
        }
        return true;
    }

    /**
     * Factory for the file extension rule: Checks if the file extensions of the files in the array are
     * in the whitelists.
     * Does NOT throw errors but appends them to the error object.
     * @param {(arg: string) => boolean} filter The filter function must return true if the filename passed to it should be checked
     * @param whitelist The file extensions that are allowed for files that match the filter
     * @returns the rule
     */
    private fileExtensionMustBeAllowed(
        filter: (arg: string) => boolean,
        whitelist: string[]
    ): (
        zipEntries: yauzlPromise.Entry[],
        error: AggregateH5pError
    ) => Promise<yauzlPromise.Entry[]> {
        return async (
            zipEntries: yauzlPromise.Entry[],
            error: AggregateH5pError
        ): Promise<yauzlPromise.Entry[]> => {
            for (const zipEntry of zipEntries) {
                const lowercaseName = zipEntry.fileName.toLocaleLowerCase();

                // Skip files that aren't matched by the filter and directories
                if (
                    filter(lowercaseName) &&
                    !PackageValidator.isDirectory(zipEntry.fileName) &&
                    !PackageValidator.isAllowedFileExtension(
                        lowercaseName,
                        whitelist
                    )
                ) {
                    log.error(
                        `file extension ${
                            zipEntry.fileName
                        } is not in whitelist: ${whitelist.join(', ')}`
                    );
                    error.addError(
                        new H5pError('not-in-whitelist', {
                            filename: zipEntry.fileName,
                            'files-allowed': this.contentExtensionWhitelist.join(
                                ' '
                            )
                        })
                    );
                }
            }
            return zipEntries;
        };
    }

    /**
     * Factory for a rule that makes sure that a certain file must exist.
     * Does NOT throw errors but appends them to the error object.
     * @param filename The filename that must exist among the zip entries (path, not case-sensitive)
     * @param errorId The error message that is used if the file does not exist
     * @param throwOnError (optional) If true, the rule will throw an error if the file does not exist.
     * @param errorReplacements (optional) The replacement variables to pass to the error.
     * @returns the rule
     */
    private fileMustExist(
        filename: string,
        errorId: string,
        throwOnError: boolean = false,
        errorReplacements: { [key: string]: string | string[] } = {}
    ): (
        zipEntries: yauzlPromise.Entry[],
        error: AggregateH5pError
    ) => Promise<yauzlPromise.Entry[]> {
        log.verbose(`checking if file ${filename} exists`);
        return async (
            zipEntries: yauzlPromise.Entry[],
            error: AggregateH5pError
        ) => {
            if (
                !zipEntries.find(
                    (e) =>
                        e.fileName.toLocaleLowerCase() ===
                        filename.toLocaleLowerCase()
                )
            ) {
                log.error(`file ${filename} does not exist`);
                error.addError(new H5pError(errorId, errorReplacements));
                if (throwOnError) {
                    throw error;
                }
            }
            return zipEntries;
        };
    }

    /**
     * Checks file sizes (single files and all files combined)
     * Does NOT throw errors but appends them to the error object.
     * @param zipEntries The entries inside the h5p file
     * @param error The error object to use
     * @returns The unchanged zip entries
     */
    private fileSizeMustBeWithinLimits = async (
        zipEntries: yauzlPromise.Entry[],
        error: AggregateH5pError
    ): Promise<yauzlPromise.Entry[]> => {
        log.debug(`checking if file sizes exceed limit`);
        let totalFileSize = 0; // in bytes
        if (this.config.maxFileSize) {
            for (const entry of zipEntries) {
                totalFileSize += entry.uncompressedSize;
                if (entry.uncompressedSize > this.config.maxFileSize) {
                    log.error(`file ${entry.fileName} exceeds limit`);
                    error.addError(
                        new H5pError('file-size-too-large', {
                            file: entry.fileName,
                            max: formatBytes(this.config.maxFileSize),
                            used: formatBytes(entry.uncompressedSize)
                        })
                    );
                }
            }
        }
        if (
            this.config.maxTotalSize &&
            totalFileSize > this.config.maxTotalSize
        ) {
            log.error(`total size is too large`);
            error.addError(
                new H5pError('total-size-too-large', {
                    max: formatBytes(this.config.maxTotalSize),
                    used: formatBytes(totalFileSize)
                })
            );
        }
        return zipEntries;
    };

    /**
     * Factory for a rule that tries reading the files that are matched by the filter.
     * Does not throw errors.
     * @param {(path: string) => boolean} filter Returns true for files that should be readable.
     * @returns the rule
     */
    private filesMustBeReadable(
        filter: (path: string) => boolean
    ): (
        zipEntries: yauzlPromise.Entry[],
        error: AggregateH5pError
    ) => Promise<yauzlPromise.Entry[]> {
        log.info(`checking if files are readable`);
        return async (
            zipEntries: yauzlPromise.Entry[],
            error: AggregateH5pError
        ) => {
            for (const entry of zipEntries.filter(
                (e) =>
                    filter(e.fileName.toLocaleLowerCase()) &&
                    !PackageValidator.isDirectory(e.fileName)
            )) {
                try {
                    // we do nothing with the write stream, as we just check if the file is fully readable
                    const readStream = await entry.openReadStream();
                    const writeStream = new WritableStreamBuffer({
                        incrementAmount: 100 * 1024,
                        initialSize: 500 * 1024
                    });
                    await promisepipe(readStream, writeStream);
                } catch (e) {
                    log.error(`file ${e.fileName} is not readable`);
                    error.addError(
                        new H5pError(
                            'corrupt-file',
                            {
                                file: e.fileName
                            },
                            400
                        )
                    );
                }
            }
            return zipEntries;
        };
    }

    /**
     * Factory for a rule that filters out files from the validation.
     * @param {(yauzlPromise.Entry) => boolean} filter The filter. Filenames matched by this filter will be filtered out.
     * @returns the rule
     */
    private filterOutEntries(
        filter: (arg: any) => boolean
    ): (zipEntries: yauzlPromise.Entry[]) => Promise<yauzlPromise.Entry[]> {
        /**
         * @param zipEntries The zip entries in the whole H5P package
         * @returns The zip entries without the filtered out entries
         */
        return async (
            zipEntries: yauzlPromise.Entry[]
        ): Promise<yauzlPromise.Entry[]> =>
            zipEntries.filter((e) => !filter(e));
    }

    /**
     * Initializes the JSON schema validators _h5pMetaDataValidator and _libraryMetadataValidator.
     * Can be called multiple times, as it only creates new validators when it hasn't been called before.
     */
    private async initializeJsonValidators(): Promise<void> {
        if (this.h5pMetadataValidator && this.libraryMetadataValidator) {
            return;
        }
        log.info(`initializing json validators`);

        const jsonValidator = new Ajv();
        ajvKeywords(jsonValidator, 'regexp');
        const h5pJsonSchema = await fsExtra.readJSON(
            path.join(__dirname, 'schemas/h5p-schema.json')
        );
        const libraryNameSchema = await fsExtra.readJSON(
            path.join(__dirname, 'schemas/library-name-schema.json')
        );
        const librarySchema = await fsExtra.readJSON(
            path.join(__dirname, 'schemas/library-schema.json')
        );
        jsonValidator.addSchema([
            h5pJsonSchema,
            libraryNameSchema,
            librarySchema
        ]);
        this.h5pMetadataValidator = jsonValidator.compile(h5pJsonSchema);
        this.libraryMetadataValidator = jsonValidator.compile(librarySchema);
    }
    /**
     * Factory for a rule that makes sure a JSON file is parsable.
     * Throws an error if the JSON file can't be parsed.
     * @param filename The path to the file.
     * @param errorId An optional error message to use instead of the default
     * @param skipIfNonExistent if true, the rule does not produce an error if the file doesn't exist.
     * @param throwIfError if true, the rule will throw an error if the JSON file is not parsable, otherwise it will append the error message to the error object
     * @param errorReplacements replacements to use when generating the an error
     * @return The rule
     */
    private jsonMustBeParsable(
        filename: string,
        errorId?: string,
        skipIfNonExistent: boolean = false,
        throwIfError: boolean = true,
        errorReplacements: { [key: string]: string | string[] } = {}
    ): (
        zipEntires: yauzlPromise.Entry[],
        error: AggregateH5pError
    ) => Promise<yauzlPromise.Entry[]> {
        log.info(`checking if json of ${filename} is parsable`);
        return async (
            zipEntries: yauzlPromise.Entry[],
            error: AggregateH5pError
        ) => {
            const entry = zipEntries.find(
                (e) =>
                    e.fileName.toLocaleLowerCase() ===
                    filename.toLocaleLowerCase()
            );
            if (!entry) {
                if (skipIfNonExistent) {
                    return zipEntries;
                }
                log.error(
                    `File ${filename} missing from H5P package. Make sure to use the fileMustExistRule before using jsonMustBeParsableRule!`
                );
                throw new Error(
                    `File ${filename} missing from H5P package. Make sure to use the fileMustExistRule before using jsonMustBeParsableRule!`
                );
            }
            try {
                await this.tryParseJson(entry);
            } catch (jsonParseError) {
                log.error(`json ${filename} is not parsable`);
                const err = new H5pError(
                    errorId || jsonParseError.errorId,
                    errorId ? errorReplacements : jsonParseError.replacements,
                    400,
                    jsonParseError.debugMessage
                );
                if (throwIfError) {
                    throw error.addError(err);
                } else {
                    error.addError(err);
                }
            }
            return zipEntries;
        };
    }

    /**
     * Factory for a rule that makes sure a JSON file is parsable and conforms to the specified JSON schema.
     * Throws an error if the JSON file can't be parsed or if it does not conform to the schema.
     * @param filename The path to the file.
     * @param schemaValidator The validator for the required schema.
     * @param errorIdAnyError The id of the message that is emitted, when there is an error. (Allowed placeholders: %name, %reason)
     * @param errorIdJsonParse (optional) The message to output if the JSON file is not parsable (will default to a generíc error message)
     * @param returnContent (optional) If true, the rule will return an object with { zipEntries, jsonData } where jsonData contains the parsed JSON of the file
     * @param errorReplacements (optional) The replacements to pass to error objects created in the method.
     * @return The rule (return value: An array of ZipEntries if returnContent == false, otherwise the JSON content is added to the return object)
     */
    private jsonMustConformToSchema(
        filename: string,
        schemaValidator: ValidateFunction,
        errorIdAnyError: string,
        errorIdJsonParse?: string,
        returnContent: boolean = false,
        errorReplacements: { [key: string]: string | string[] } = {}
    ): (
        zipEntries: yauzlPromise.Entry[],
        error: AggregateH5pError
    ) => Promise<
        | yauzlPromise.Entry[]
        | { jsonData: any; zipEntries: yauzlPromise.Entry[] }
    > {
        log.info(`checking if json ${filename} conforms to schema`);
        return async (
            zipEntries: yauzlPromise.Entry[],
            error: AggregateH5pError
        ) => {
            const entry = zipEntries.find(
                (e) =>
                    e.fileName.toLocaleLowerCase() ===
                    filename.toLocaleLowerCase()
            );
            if (!entry) {
                log.error(
                    `File ${filename} missing from H5P package. Make sure to use the fileMustExistRule before using jsonMustConformToSchemaRule!`
                );
                throw new Error(
                    `File ${filename} missing from H5P package. Make sure to use the fileMustExistRule before using jsonMustConformToSchemaRule!`
                );
            }
            let jsonData;
            try {
                jsonData = await this.tryParseJson(entry);
            } catch (jsonParseError) {
                log.error(`${errorIdJsonParse || jsonParseError.message}`);
                throw error.addError(
                    new H5pError(
                        errorIdJsonParse || jsonParseError.errorId,
                        errorIdJsonParse
                            ? errorReplacements
                            : jsonParseError.replacements,
                        400
                    )
                );
            }
            if (!schemaValidator(jsonData)) {
                log.error(`json ${filename} does not conform to schema`);
                errorReplacements.reason = schemaValidator.errors
                    .map((e) => `${e.dataPath} ${e.message}`)
                    .join(' ')
                    .trim();
                throw error.addError(
                    new H5pError(errorIdAnyError, errorReplacements)
                );
            }
            if (!returnContent) {
                return zipEntries;
            }

            return { zipEntries, jsonData };
        };
    }

    /**
     * Validates the libraries inside the package.
     * @param zipEntries The entries inside the h5p file
     * @param { AggregateH5pError} error The error object to use
     * @returns The unchanged zip entries
     */
    private librariesMustBeValid = async (
        zipEntries: yauzlPromise.Entry[],
        error: AggregateH5pError
    ): Promise<yauzlPromise.Entry[]> => {
        log.info(`validating libraries inside package`);
        const topLevelDirectories = PackageValidator.getTopLevelDirectories(
            zipEntries
        );
        await Promise.all(
            topLevelDirectories
                .filter((directory) => directory !== 'content')
                .map((directory) =>
                    this.validateLibrary(zipEntries, directory, error)
                )
        );
        return zipEntries;
    };

    /**
     * Factory for a rule that checks if library's directory conforms to naming standards
     * @param libraryName The name of the library (directory)
     * @returns the rule
     */
    private libraryDirectoryMustHaveValidName(
        libraryName: string
    ): (
        zipEntries: yauzlPromise.Entry[],
        error: AggregateH5pError
    ) => Promise<yauzlPromise.Entry[]> {
        log.info(`validating library's directory to naming standards`);
        return async (
            zipEntries: yauzlPromise.Entry[],
            error: AggregateH5pError
        ) => {
            if (!this.libraryDirectoryNameRegex.test(libraryName)) {
                throw error.addError(
                    new H5pError('invalid-library-name', {
                        name: libraryName
                    })
                );
            }
            return zipEntries;
        };
    }

    /**
     * Checks if the language files in the library have the correct naming schema and are valid JSON.
     * @param zipEntries zip entries in the package
     * @param jsonData jsonData of the library.json file.
     * @param error The error object to use
     * @returns {Promise<{zipEntries: yauzlPromise.Entry[], jsonData: any}>} the unchanged data passed to the rule
     */
    private libraryLanguageFilesMustBeValid = async (
        {
            zipEntries,
            jsonData
        }: { jsonData: any; zipEntries: yauzlPromise.Entry[] },
        error: AggregateH5pError
    ): Promise<{ jsonData: any; zipEntries: yauzlPromise.Entry[] }> => {
        log.info(
            `checking if language files in library ${jsonData.machineName}-${jsonData.majorVersion}.${jsonData.minorVersion} have the correct naming schema and are valid JSON`
        );
        const uberName = `${jsonData.machineName}-${jsonData.majorVersion}.${jsonData.minorVersion}`;
        const languagePath = PackageValidator.pathJoin(uberName, 'language/');
        const languageFileRegex = /^(-?[a-z]+){1,7}\.json$/i;
        for (const languageFileEntry of zipEntries.filter(
            (e) =>
                e.fileName.startsWith(languagePath) &&
                !PackageValidator.isDirectory(e.fileName)
        )) {
            const languageFileName = path.basename(languageFileEntry.fileName);
            if (!languageFileRegex.test(languageFileName)) {
                log.error(
                    `${jsonData.machineName}-${jsonData.majorVersion}.${jsonData.minorVersion}: invalid language file`
                );
                error.addError(
                    new H5pError('invalid-language-file', {
                        file: languageFileName,
                        library: uberName
                    })
                );
            }
            try {
                await this.tryParseJson(languageFileEntry);
            } catch (ignored) {
                log.error(
                    `${jsonData.machineName}-${jsonData.majorVersion}.${jsonData.minorVersion}: language json could not be parsed`
                );
                error.addError(
                    new H5pError('invalid-language-file-json', {
                        file: languageFileName,
                        library: uberName
                    })
                );
            }
        }
        return { zipEntries, jsonData };
    };

    /**
     * Factory for a check that makes sure that the directory name of the library matches the name in
     * the library.json metadata.
     * Does not throw a ValidationError.
     * @param directoryName the name of the directory in the package this library is in
     * @returns the rule
     */
    private libraryMustHaveMatchingDirectoryName(
        directoryName: string
    ): (
        {
            zipEntries,
            jsonData
        }: { jsonData: any; zipEntries: yauzlPromise.Entry[] },
        error: AggregateH5pError
    ) => Promise<{ jsonData: any; zipEntries: yauzlPromise.Entry[] }> {
        /**
         * @param zipEntries zip entries in the package
         * @param jsonData jsonData of the library.json file
         * @param error The error object to use
         * @returns {Promise<{zipEntries: yauzl.Entry[], jsonData: any}>} the unchanged data passed to the rule
         */
        log.info(
            `checking if directory names ${directoryName} of libraries match library.json metadata`
        );
        return async (
            {
                zipEntries,
                jsonData
            }: { jsonData: any; zipEntries: yauzlPromise.Entry[] },
            error: AggregateH5pError
        ) => {
            // Library's directory name must be:
            // - <machineName>
            //     - or -
            // - <machineName>-<majorVersion>.<minorVersion>
            // where machineName, majorVersion and minorVersion is read from library.json
            if (
                directoryName !== jsonData.machineName &&
                directoryName !==
                    `${jsonData.machineName}-${jsonData.majorVersion}.${jsonData.minorVersion}`
            ) {
                log.error(
                    `library directory does not match name ${directoryName}`
                );
                error.addError(
                    new H5pError('library-directory-name-mismatch', {
                        directoryName,
                        machineName: jsonData.machineName,
                        majorVersion: jsonData.majorVersion,
                        minorVersion: jsonData.minorVersion
                    })
                );
            }
            return { zipEntries, jsonData };
        };
    }

    /**
     * Checks if all JavaScript and CSS file references in the preloaded section of the library metadata are present in the package.
     * @param zipEntries zip entries in the package
     * @param jsonData data of the library.json file.
     * @param error The error object to use
     * @returns {Promise<{zipEntries: yauzlPromise.Entry[], jsonData: any}>} the unchanged data passed to the rule
     */
    private libraryPreloadedFilesMustExist = async (
        {
            zipEntries,
            jsonData
        }: { jsonData: any; zipEntries: yauzlPromise.Entry[] },
        error: AggregateH5pError
    ): Promise<{ jsonData: any; zipEntries: yauzlPromise.Entry[] }> => {
        log.info(
            `checking if all js and css file references in the preloaded section of the library metadata are present in package`
        );
        const uberName = `${jsonData.machineName}-${jsonData.majorVersion}.${jsonData.minorVersion}`;
        // check if all JavaScript files that must be preloaded are part of the package
        if (jsonData.preloadedJs) {
            await Promise.all(
                jsonData.preloadedJs.map((file) =>
                    this.fileMustExist(
                        PackageValidator.pathJoin(uberName, file.path),
                        'library-file-missing',
                        false,
                        { filename: file.path, library: uberName }
                    )(zipEntries, error)
                )
            );
        }

        // check if all CSS files that must be preloaded are part of the package
        if (jsonData.preloadedCss) {
            await Promise.all(
                jsonData.preloadedCss.map((file) =>
                    this.fileMustExist(
                        PackageValidator.pathJoin(uberName, file.path),
                        'library-file-missing',
                        false,
                        { filename: file.path, library: uberName }
                    )(zipEntries, error)
                )
            );
        }
        return { zipEntries, jsonData };
    };

    /**
     * Checks if a library is compatible to the core version running.
     * Does not throw a ValidationError.
     * @param zipEntries zip entries in the package
     * @param jsonData jsonData of the library.json file.
     * @param error The error object to use
     * @returns {Promise<{zipEntries: yauzlPromise.Entry[], jsonData: any}>} the unchanged data passed to the rule
     */
    private mustBeCompatibleToCoreVersion = async (
        {
            zipEntries,
            jsonData
        }: { jsonData: any; zipEntries: yauzlPromise.Entry[] },
        error: AggregateH5pError
    ): Promise<{ jsonData: any; zipEntries: yauzlPromise.Entry[] }> => {
        log.info(
            `checking if library is compatible with the core version running`
        );
        this.checkCoreVersion(
            jsonData,
            `${jsonData.machineName}-${jsonData.majorVersion}.${jsonData.minorVersion}`,
            error
        );
        return { zipEntries, jsonData };
    };

    /**
     * A rule that always returns true.
     */
    private async returnTrue(): Promise<boolean> {
        return true;
    }

    /**
     * Tries to open the file in the ZIP archive in memory and parse it as JSON. Will throw errors
     * if the file cannot be read or is no valid JSON.
     * @param entry The entry to read
     * @returns The read JSON as an object
     */
    private async tryParseJson(entry: yauzlPromise.Entry): Promise<any> {
        log.verbose(`parsing json ${entry.fileName}`);
        let content;
        try {
            const readStream = await entry.openReadStream();
            const writeStream = new WritableStreamBuffer({
                incrementAmount: 100 * 1024,
                initialSize: 100 * 1024
            });
            await promisepipe(readStream, writeStream);
            content = writeStream.getContentsAsString('utf8');
        } catch (ignored) {
            log.error(`unable to read package file`);
            throw new H5pError('unable-to-read-package-file', {
                fileName: entry.fileName
            });
        }

        try {
            return JSON.parse(content);
        } catch (ignored) {
            log.error(`unable to parse JSON file ${entry.fileName}`);
            throw new H5pError('unable-to-parse-package', {
                fileName: entry.fileName
            });
        }
    }

    /**
     * Checks whether the library conforms to the standard and returns its data.
     * @param zipEntries All (relevant) zip entries of the package.
     * @param libraryName The name of the library to check
     * @param error the error object
     * @returns {Promise< {semantics: any, hasIcon: boolean, language: any}|boolean >} the object from library.json with additional data from semantics.json, the language files and the icon.
     */
    private async validateLibrary(
        zipEntries: yauzlPromise.Entry[],
        libraryName: string,
        error: AggregateH5pError
    ): Promise<{ hasIcon: boolean; language: any; semantics: any } | boolean> {
        try {
            log.info(`validating library ${libraryName}`);
            return await new ValidatorBuilder()
                .addRule(this.libraryDirectoryMustHaveValidName(libraryName))
                .addRule(
                    this.jsonMustBeParsable(
                        'semantics.json',
                        'invalid-semantics-json-file',
                        true,
                        false,
                        { name: libraryName }
                    )
                )
                .addRule(
                    this.jsonMustConformToSchema(
                        `${libraryName}/library.json`,
                        this.libraryMetadataValidator,
                        'invalid-schema-library-json-file',
                        'invalid-library-json-file',
                        true,
                        { name: libraryName }
                    )
                )
                .addRule(this.mustBeCompatibleToCoreVersion)
                .addRule(this.libraryMustHaveMatchingDirectoryName(libraryName))
                .addRule(this.libraryPreloadedFilesMustExist)
                .addRule(this.libraryLanguageFilesMustBeValid)
                .validate(zipEntries, error);
        } catch (e) {
            if (e instanceof AggregateH5pError) {
                // Don't rethrow a ValidationError (and thus abort validation) as other libraries can still be validated, too. This is fine as the
                // error values are appended to the ValidationError and the error will be thrown at some point anyway.
                return false;
            }
            throw e;
        }
    }
}
