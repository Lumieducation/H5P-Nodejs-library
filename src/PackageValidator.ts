import ajv from 'ajv';
import * as path from 'path';
import promisepipe from 'promisepipe';
import { WritableStreamBuffer } from 'stream-buffers';
import * as yauzlPromise from 'yauzl-promise';

import { formatBytes } from './helpers/StringFormatter';
import ValidationError from './helpers/ValidationError';
import {
    throwErrorsNowRule,
    ValidatorBuilder
} from './helpers/ValidatorBuilder';
import { IEditorConfig, ITranslationService } from './types';

import Logger from './helpers/Logger';
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
     * @param {ITranslationService} translationService The translation service
     * @param {EditorConfig} configurationValues Object containing all required configuration parameters
     */
    constructor(
        private translationService: ITranslationService,
        private config: IEditorConfig
    ) {
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
     * @param {yauzlPromise.Entry[]} zipEntries
     * @returns {string[]} list of top-level directories
     */
    private static getTopLevelDirectories(
        zipEntries: yauzlPromise.Entry[]
    ): string[] {
        log.verbose(
            `getting top level directories ${zipEntries
                .map(entry => entry.fileName)
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
     * @param {string} filename The filename to check
     * @param {string[]} allowedExtensions A list of extensions to check against
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
                allowedExtension => allowedExtension === actualExtension
            )
        ) {
            return true;
        }
        return false;
    }

    /**
     * Checks if a zip file path is a directory
     * @param {string} p the path to check
     * @returns {boolean} true if directory, false if not
     */
    private static isDirectory(p: string): boolean {
        log.debug(`checking if ${p} is a directory`);
        return p.endsWith('/');
    }

    /**
     * Opens the zip archive.
     * @param {string} file Path to file to open
     * @returns {Promise<yauzlPromise.ZipFile>} Zip archive object or undefined if zip file cannot be opened.
     */
    private static async openZipArchive(
        file: string
    ): Promise<yauzlPromise.ZipFile> {
        try {
            log.info(`opnening zip archive ${file}`);
            // we await the promise here because we want to catch the error and return undefined
            return await yauzlPromise.open(file, { lazyEntries: false });
        } catch (ignored) {
            log.error(`zip file ${file} could not be opened`);
            return undefined;
        }
    }

    /**
     * Similar to path.join(...) but uses slashes (/) as separators regardless of OS.
     * We have to use slashes when dealing with zip files as the specification for zips require them. If the program
     * runs on windows path.join(...) uses backslashes \ which don't work for zip files.
     * @param {...string[]} parts The parts of the path to join
     * @returns {string} the full path
     */
    private static pathJoin(...parts: string[]): string {
        const separator = '/';
        const replace = new RegExp(`${separator}{1,}`, 'g');
        return parts.join(separator).replace(replace, separator);
    }

    /**
     * Validates the H5P package located at the path passed to the method.
     * @param {string} h5pFile Path to H5P file to validate
     * @param {boolean} checkContent If true, the method will check if the content in the package conforms to the standard
     * @param {boolean} checkLibraries If true, the method will check if the libraries in the package conform to the standard
     * @returns {Promise<any>} true if the package is valid. Will throw Errors with the error in Error.message if there is a validation error.
     */
    public async validatePackage(
        h5pFile: string,
        checkContent: boolean = true,
        checkLibraries: boolean = true
    ): Promise<any> {
        log.info(`validating package ${h5pFile}`);
        await this.initializeJsonValidators();

        return new ValidatorBuilder()
            .addRule(this.mustHaveH5pExtension)
            .addRule(this.zipArchiveMustBeValid)
            .addRule(this.fileSizeMustBeWithinLimits)
            .addRule(
                this.filterOutEntries(
                    entry =>
                        path.basename(entry.fileName).startsWith('.') ||
                        path.basename(entry.fileName).startsWith('_') ||
                        path.basename(entry.fileName).endsWith('/')
                )
            )
            .addRuleWhen(
                this.fileExtensionMustBeAllowed(
                    name => name.startsWith('content/'),
                    this.contentExtensionWhitelist
                ),
                checkContent
            )
            .addRuleWhen(
                this.fileExtensionMustBeAllowed(
                    name => name.includes('/') && !name.startsWith('content/'),
                    this.libraryExtensionWhitelist
                ),
                checkLibraries
            )
            .addRuleWhen(
                this.fileMustExist(
                    'h5p.json',
                    this.translationService.getTranslation(
                        'invalid-h5p-json-file'
                    ),
                    true
                ),
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
                    this.translationService.getTranslation(
                        'invalid-content-folder'
                    ),
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
                this.filesMustBeReadable(filePath =>
                    filePath.startsWith('content/')
                ),
                checkContent
            )
            .addRuleWhen(this.librariesMustBeValid, checkLibraries)
            .addRule(throwErrorsNowRule)
            .addRule(this.returnTrue)
            .validate(h5pFile);
    }

    /**
     * Checks if the core API version required in the metadata can be satisfied by the running instance.
     * @param {{coreApi: { majorVersion: number, minorVersion: number }}} metadata The object containing information about the required core version
     * @param {string} libraryName The name of the library that is being checked.
     * @param {ValidationError} error The error object.
     * @returns {boolean} true if the core API required in the metadata can be satisfied by the running instance. Also true if the metadata doesn't require any core API version.
     */
    private checkCoreVersion(
        metadata: { coreApi: { majorVersion: number; minorVersion: number } },
        libraryName: string,
        error: ValidationError
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
                this.translationService.getTranslation(
                    'api-version-unsupported',
                    {
                        '%component': libraryName,
                        '%current': `${this.config.coreApiVersion.major}.${this.config.coreApiVersion.minor}`,
                        '%required': `${metadata.coreApi.majorVersion}.${metadata.coreApi.minorVersion}`
                    }
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
     * @param {string[]} whitelist The file extensions that are allowed for files that match the filter
     * @returns the rule
     */
    private fileExtensionMustBeAllowed(
        filter: (arg: string) => boolean,
        whitelist: string[]
    ): (
        zipEntries: yauzlPromise.Entry[],
        error: ValidationError
    ) => Promise<yauzlPromise.Entry[]> {
        return async (
            zipEntries: yauzlPromise.Entry[],
            error: ValidationError
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
                        this.translationService.getTranslation(
                            'not-in-whitelist',
                            {
                                '%filename': zipEntry.fileName,
                                '%files-allowed': this.contentExtensionWhitelist.join(
                                    ' '
                                )
                            }
                        )
                    );
                }
            }
            return zipEntries;
        };
    }

    /**
     * Factory for a rule that makes sure that a certain file must exist.
     * Does NOT throw errors but appends them to the error object.
     * @param {string} filename The filename that must exist among the zip entries (path, not case-sensitive)
     * @param {string} errorMessage The error message that is used if the file does not exist
     * @param {boolean} throwOnError If true, the rule will throw an error if the file does not exist.
     * @returns the rule
     */
    private fileMustExist(
        filename: string,
        errorMessage: string,
        throwOnError: boolean = false
    ): (
        zipEntries: yauzlPromise.Entry[],
        error: ValidationError
    ) => Promise<yauzlPromise.Entry[]> {
        log.verbose(`checking if file ${filename} exists`);
        return async (
            zipEntries: yauzlPromise.Entry[],
            error: ValidationError
        ) => {
            if (
                !zipEntries.find(
                    e =>
                        e.fileName.toLocaleLowerCase() ===
                        filename.toLocaleLowerCase()
                )
            ) {
                log.error(`file ${filename} does not exist`);
                error.addError(errorMessage);
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
     * @param {yauzlPromise.Entry[]} zipEntries The entries inside the h5p file
     * @param {ValidationError} error The error object to use
     * @returns {Promise<yauzlPromise.Entry[]>} The unchanged zip entries
     */
    private fileSizeMustBeWithinLimits = async (
        zipEntries: yauzlPromise.Entry[],
        error: ValidationError
    ): Promise<yauzlPromise.Entry[]> => {
        log.debug(`checking if file sizes exceed limit`);
        let totalFileSize = 0; // in bytes
        if (this.config.maxFileSize) {
            for (const entry of zipEntries) {
                totalFileSize += entry.uncompressedSize;
                if (entry.uncompressedSize > this.config.maxFileSize) {
                    log.error(`file ${entry.fileName} exceeds limit`);
                    error.addError(
                        this.translationService.getTranslation(
                            'file-size-too-large',
                            {
                                '%file': entry.fileName,
                                '%max': formatBytes(this.config.maxFileSize),
                                '%used': formatBytes(entry.uncompressedSize)
                            }
                        )
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
                this.translationService.getTranslation('total-size-too-large', {
                    '%max': formatBytes(this.config.maxTotalSize),
                    '%used': formatBytes(totalFileSize)
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
        error: ValidationError
    ) => Promise<yauzlPromise.Entry[]> {
        log.info(`checking if files are readable`);
        return async (
            zipEntries: yauzlPromise.Entry[],
            error: ValidationError
        ) => {
            for (const entry of zipEntries.filter(
                e =>
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
                        this.translationService.getTranslation('corrupt-file', {
                            '%file': e.fileName
                        })
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
         * @param {yauzl.Entry[]} zipEntries The zip entries in the whole H5P package
         * @returns {Promise<yauzl.Entry[]>} The zip entries without the filtered out entries
         */
        return async (
            zipEntries: yauzlPromise.Entry[]
        ): Promise<yauzlPromise.Entry[]> => {
            return zipEntries.filter(e => !filter(e));
        };
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

        const jsonValidator = new ajv();
        const h5pJsonSchema = require('./schemas/h5p-schema.json');
        const libraryNameSchema = require('./schemas/library-name-schema.json');
        const librarySchema = require('./schemas/library-schema.json');
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
     * @param {string} filename The path to the file.
     * @param {string} errorMessage An optional error message to use instead of the default
     * @param {boolean} skipIfNonExistent if true, the rule does not produce an error if the file doesn't exist.
     * @param {boolean} throwIfError if true, the rule will throw an error if the JSON file is not parsable, otherwise it will append the error message to the error object
     * @return The rule
     */
    private jsonMustBeParsable(
        filename: string,
        errorMessage?: string,
        skipIfNonExistent: boolean = false,
        throwIfError: boolean = true
    ): (
        zipEntires: yauzlPromise.Entry[],
        error: ValidationError
    ) => Promise<yauzlPromise.Entry[]> {
        log.info(`checking if json is parseable`);
        return async (
            zipEntries: yauzlPromise.Entry[],
            error: ValidationError
        ) => {
            const entry = zipEntries.find(
                e =>
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
                log.error(`json ${filename} is not parseable`);
                if (throwIfError) {
                    throw error.addError(
                        errorMessage || jsonParseError.message
                    );
                } else {
                    error.addError(errorMessage || jsonParseError.message);
                }
            }
            return zipEntries;
        };
    }

    /**
     * Factory for a rule that makes sure a JSON file is parsable and conforms to the specified JSON schema.
     * Throws an error if the JSON file can't be parsed or if it does not conform to the schema.
     * @param {string} filename The path to the file.
     * @param {ajv.ValidateFunction} schemaValidator The validator for the required schema.
     * @param {string} errorMessageId The id of the message that is emitted, when there is an error. (Allowed placeholders: %name, %reason)
     * @param {string} jsonParseMessage (optional) The message to output if the JSON file is not parsable (will default to a generíc error message)
     * @param {boolean} returnContent (optional) If true, the rule will return an object with { zipEntries, jsonData } where jsonData contains the parsed JSON of the file
     * @return The rule (return value: An array of ZipEntries if returnContent == false, otherwise the JSON content is added to the return object)
     */
    private jsonMustConformToSchema(
        filename: string,
        schemaValidator: ajv.ValidateFunction,
        errorMessageId: string,
        jsonParseMessage?: string,
        returnContent: boolean = false
    ): (
        zipEntries: yauzlPromise.Entry[],
        error: ValidationError
    ) => Promise<
        | yauzlPromise.Entry[]
        | { jsonData: any; zipEntries: yauzlPromise.Entry[] }
    > {
        log.info(`checking if json ${filename} conforms to schema`);
        return async (
            zipEntries: yauzlPromise.Entry[],
            error: ValidationError
        ) => {
            const entry = zipEntries.find(
                e =>
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
                log.error(`${jsonParseMessage || jsonParseError.message}`);
                throw error.addError(
                    jsonParseMessage || jsonParseError.message
                );
            }
            if (!schemaValidator(jsonData)) {
                log.error(`json ${filename} does not conform to schema`);
                throw error.addError(
                    this.translationService.getTranslation(errorMessageId, {
                        '%name': entry.fileName,
                        '%reason': schemaValidator.errors
                            .map(e => `${e.dataPath} ${e.message}`)
                            .join(' ')
                            .trim()
                    })
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
     * @param {yauzlPromise.Entry[]} zipEntries The entries inside the h5p file
     * @param { ValidationError} error The error object to use
     * @returns {Promise<yauzlPromise.Entry[]>} The unchanged zip entries
     */
    private librariesMustBeValid = async (
        zipEntries: yauzlPromise.Entry[],
        error: ValidationError
    ): Promise<yauzlPromise.Entry[]> => {
        log.info(`validating libraries inside package`);
        const topLevelDirectories = PackageValidator.getTopLevelDirectories(
            zipEntries
        );
        await Promise.all(
            topLevelDirectories
                .filter(directory => directory !== 'content')
                .map(directory =>
                    this.validateLibrary(zipEntries, directory, error)
                )
        );
        return zipEntries;
    };

    /**
     * Factory for a rule that checks if library's directory conforms to naming standards
     * @param {string} libraryName The name of the library (directory)
     * @returns the rule
     */
    private libraryDirectoryMustHaveValidName(
        libraryName: string
    ): (
        zipEntries: yauzlPromise.Entry[],
        error: ValidationError
    ) => Promise<yauzlPromise.Entry[]> {
        log.info(`validating library's directory to naming standards`);
        return async (
            zipEntries: yauzlPromise.Entry[],
            error: ValidationError
        ) => {
            if (!this.libraryDirectoryNameRegex.test(libraryName)) {
                throw error.addError(
                    this.translationService.getTranslation(
                        'invalid-library-name',
                        { '%name': libraryName }
                    )
                );
            }
            return zipEntries;
        };
    }

    /**
     * Checks if the language files in the library have the correct naming schema and are valid JSON.
     * @param {yauzlPromise.Entry[]} zipEntries zip entries in the package
     * @param {any} jsonData jsonData of the library.json file.
     * @param {ValidationError} error The error object to use
     * @returns {Promise<{zipEntries: yauzlPromise.Entry[], jsonData: any}>} the unchanged data passed to the rule
     */
    private libraryLanguageFilesMustBeValid = async (
        {
            zipEntries,
            jsonData
        }: { jsonData: any; zipEntries: yauzlPromise.Entry[] },
        error: ValidationError
    ): Promise<{ jsonData: any; zipEntries: yauzlPromise.Entry[] }> => {
        log.info(
            `checking if language files in library ${jsonData.machineName}-${jsonData.majorVersion}.${jsonData.minorVersion} have the correct naming schema and are valid JSON`
        );
        const dirName = `${jsonData.machineName}-${jsonData.majorVersion}.${jsonData.minorVersion}`;
        const languagePath = PackageValidator.pathJoin(dirName, 'language/');
        const languageFileRegex = /^(-?[a-z]+){1,7}\.json$/i;
        for (const languageFileEntry of zipEntries.filter(
            e =>
                e.fileName.startsWith(languagePath) &&
                !PackageValidator.isDirectory(e.fileName)
        )) {
            const languageFileName = path.basename(languageFileEntry.fileName);
            if (!languageFileRegex.test(languageFileName)) {
                log.error(
                    `${jsonData.machineName}-${jsonData.majorVersion}.${jsonData.minorVersion}: invalid language file`
                );
                error.addError(
                    this.translationService.getTranslation(
                        'invalid-language-file',
                        { '%file': languageFileName, '%library': dirName }
                    )
                );
            }
            try {
                await this.tryParseJson(languageFileEntry);
            } catch (ignored) {
                log.error(
                    `${jsonData.machineName}-${jsonData.majorVersion}.${jsonData.minorVersion}: langauge json could not be parsed`
                );
                error.addError(
                    this.translationService.getTranslation(
                        'invalid-language-file-json',
                        { '%file': languageFileName, '%library': dirName }
                    )
                );
            }
        }
        return { zipEntries, jsonData };
    };

    /**
     * Factory for a check that makes sure that the directory name of the library matches the name in
     * the library.json metadata.
     * Does not throw a ValidationError.
     * @param {string} directoryName the name of the directory in the package this library is in
     * @returns the rule
     */
    private libraryMustHaveMatchingDirectoryName(
        directoryName: string
    ): (
        {
            zipEntries,
            jsonData
        }: { jsonData: any; zipEntries: yauzlPromise.Entry[] },
        error: ValidationError
    ) => Promise<{ jsonData: any; zipEntries: yauzlPromise.Entry[] }> {
        /**
         * @param {yauzl.Entry[]} zipEntries zip entries in the package
         * @param {any} jsonData jsonData of the library.json file
         * @param {ValidationError} error The error object to use
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
            error: ValidationError
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
                    this.translationService.getTranslation(
                        'library-directory-name-mismatch',
                        {
                            '%directoryName': directoryName,
                            '%machineName': jsonData.machineName,
                            '%majorVersion': jsonData.majorVersion,
                            '%minorVersion': jsonData.minorVersion
                        }
                    )
                );
            }
            return { zipEntries, jsonData };
        };
    }

    /**
     * Checks if all JavaScript and CSS file references in the preloaded section of the library metadata are present in the package.
     * @param {yauzlPromise.Entry[]} zipEntries zip entries in the package
     * @param {any} jsonData data of the library.json file.
     * @param {ValidationError} error The error object to use
     * @returns {Promise<{zipEntries: yauzlPromise.Entry[], jsonData: any}>} the unchanged data passed to the rule
     */
    private libraryPreloadedFilesMustExist = async (
        {
            zipEntries,
            jsonData
        }: { jsonData: any; zipEntries: yauzlPromise.Entry[] },
        error: ValidationError
    ): Promise<{ jsonData: any; zipEntries: yauzlPromise.Entry[] }> => {
        log.info(
            `checking if all js and css file references in the preloaded section of the library metadata are present in package`
        );
        const dirName = `${jsonData.machineName}-${jsonData.majorVersion}.${jsonData.minorVersion}`;
        // check if all JavaScript files that must be preloaded are part of the package
        if (jsonData.preloadedJs) {
            await Promise.all(
                jsonData.preloadedJs.map(file =>
                    this.fileMustExist(
                        PackageValidator.pathJoin(dirName, file.path),
                        this.translationService.getTranslation(
                            'library-missing-file',
                            { '%file': file.path, '%name': dirName }
                        )
                    )(zipEntries, error)
                )
            );
        }

        // check if all CSS files that must be preloaded are part of the package
        if (jsonData.preloadedCss) {
            await Promise.all(
                jsonData.preloadedCss.map(file =>
                    this.fileMustExist(
                        PackageValidator.pathJoin(dirName, file.path),
                        this.translationService.getTranslation(
                            'library-missing-file',
                            { '%file': file.path, '%name': dirName }
                        )
                    )(zipEntries, error)
                )
            );
        }
        return { zipEntries, jsonData };
    };

    /**
     * Checks if a library is compatible to the core version running.
     * Does not throw a ValidationError.
     * @param {yauzlPromise.Entry[]} zipEntries zip entries in the package
     * @param {any} jsonData jsonData of the library.json file.
     * @param {ValidationError} error The error object to use
     * @returns {Promise<{zipEntries: yauzlPromise.Entry[], jsonData: any}>} the unchanged data passed to the rule
     */
    private mustBeCompatibleToCoreVersion = async (
        {
            zipEntries,
            jsonData
        }: { jsonData: any; zipEntries: yauzlPromise.Entry[] },
        error: ValidationError
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
     * Checks if the package file ends with .h5p.
     * Throws an error.
     * @param {string} h5pFile Path to the h5p file
     * @param {ValidationError} error The error object to use
     * @returns {Promise<string>} Unchanged path to the h5p file
     */
    private mustHaveH5pExtension = async (
        h5pFile: string,
        error: ValidationError
    ): Promise<string> => {
        log.info(`checking if file extension is .h5p`);
        if (path.extname(h5pFile).toLocaleLowerCase() !== '.h5p') {
            log.error(`file extension is not .h5p`);
            throw error.addError(
                this.translationService.getTranslation('missing-h5p-extension')
            );
        }
        return h5pFile;
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
     * @param {yauzlPromise.Entry} entry The entry to read
     * @returns {Promise<any>} The read JSON as an object
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
            throw new Error(
                this.translationService.getTranslation(
                    'unable-to-read-package-file',
                    { '%fileName': entry.fileName }
                )
            );
        }

        try {
            return JSON.parse(content);
        } catch (ignored) {
            log.error(`unable to parse package ${entry.fileName}`);
            throw new Error(
                this.translationService.getTranslation(
                    'unable-to-parse-package',
                    { '%fileName': entry.fileName }
                )
            );
        }
    }

    /**
     * Checks whether the library conforms to the standard and returns its data.
     * @param {yauzlPromise.Entry[]} zipEntries All (relevant) zip entries of the package.
     * @param {string} libraryName The name of the library to check
     * @param {ValidationError} error the error object
     * @returns {Promise< {semantics: any, hasIcon: boolean, language: any}|boolean >} the object from library.json with additional data from semantics.json, the language files and the icon.
     */
    private async validateLibrary(
        zipEntries: yauzlPromise.Entry[],
        libraryName: string,
        error: ValidationError
    ): Promise<{ hasIcon: boolean; language: any; semantics: any } | boolean> {
        try {
            log.info(`validating library ${libraryName}`);
            return await new ValidatorBuilder()
                .addRule(this.libraryDirectoryMustHaveValidName(libraryName))
                .addRule(
                    this.jsonMustBeParsable(
                        'semantics.json',
                        this.translationService.getTranslation(
                            'invalid-semantics-json-file',
                            { '%name': libraryName }
                        ),
                        true,
                        false
                    )
                )
                .addRule(
                    this.jsonMustConformToSchema(
                        `${libraryName}/library.json`,
                        this.libraryMetadataValidator,
                        'invalid-schema-library-json-file',
                        this.translationService.getTranslation(
                            'invalid-library-json-file',
                            { '%name': libraryName }
                        ),
                        true
                    )
                )
                .addRule(this.mustBeCompatibleToCoreVersion)
                .addRule(this.libraryMustHaveMatchingDirectoryName(libraryName))
                .addRule(this.libraryPreloadedFilesMustExist)
                .addRule(this.libraryLanguageFilesMustBeValid)
                .validate(zipEntries, error);
        } catch (e) {
            if (e instanceof ValidationError) {
                // Don't rethrow a ValidationError (and thus abort validation) as other libraries can still be validated, too. This is fine as the
                // error values are appended to the ValidationError and the error will be thrown at some point anyway.
                return false;
            }
            throw e;
        }
    }

    /**
     * Makes sure the archive can be unzipped.
     * Throws an error.
     * @param {string} h5pFile Path to the h5p file
     * @param {ValidationError} error The error object to use
     * @returns {Promise<yauzlPromise.Entry[]>} The entries inside the zip archive
     */
    private zipArchiveMustBeValid = async (
        h5pFile: string,
        error: ValidationError
    ): Promise<yauzlPromise.Entry[]> => {
        const zipArchive = await PackageValidator.openZipArchive(h5pFile);
        if (!zipArchive) {
            log.error(`zip archive not valid`);
            throw error.addError(
                this.translationService.getTranslation('unable-to-unzip')
            );
        }
        return zipArchive.readEntries();
    };
}
