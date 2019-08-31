const Ajv = require('ajv');
const fs = require('fs-extra');
const AdmZip = require('adm-zip');
const path = require('path');

const { ValidationError, ValidatorBuilder } = require('./helpers/validator-builder');
const throwErrorsNow = require('./helpers/validator-builder').throwErrorsNowRule;
const { formatBytes } = require('./helpers/string-formatter');
const { getTopLevelDirectories } = require('./helpers/adm-zip-helpers');

/**
 * Performs checks if uploaded H5P packages or those from the H5P Hub are valid.
 * Call await validatePackage(...) to perform these checks.
 * 
 * The validator currently does not check if all necessary library versions will be present after performing
 * an upgrade (done in ll. 968 - 1032 of h5p.classes.php). This is not done because it would require enumerating 
 * all installed libraries and this is not possible in the extractor without introducing a dependency to the
 * core.
 */
class H5pPackageValidator {
    /**
     * @param {getTranslation: (id: string, replacements: any) => string} translationService The translation service
     * @param {contentWhitelist: string, libraryWhitelist: string, maxFileSize?: number, maxTotalSize?: number, coreApiVersion: {major: number, minor: number}} configurationValues Object containing all required configuration parameters
     */
    constructor(translationService, configurationValues) {
        this._translationService = translationService;
        this._config = configurationValues;
        this._contentExtensionWhitelist = this._config.contentWhitelist.split(" ");
        this._libraryExtensionWhitelist = this._config.libraryWhitelist.split(" ").concat(this._contentExtensionWhitelist);
        this._h5pMetadataValidator = undefined;
        this._libraryMetadataValidator = undefined;
        this._libraryDirectoryNameRegex = /^[\w0-9\-.]{1,255}$/i;
    }

    /**
     * Validates the H5P package located at the path passed to the method. 
     * @param {string} h5pFile Path to H5P file to validate
     * @param {boolean} checkContent If true, the method will check if the content in the package conforms to the standard
     * @param {boolean} checkLibraries If true, the method will check if the libraries in the package conform to the standard
     * @returns {any} true if the package is valid. Will throw Errors with the error in Error.message if there is a validation error. 
     */
    async validatePackage(h5pFile, checkContent = true, checkLibraries = true) {
        await this._initializeJsonValidators();

        return new ValidatorBuilder()
            .addRule(this._mustHaveH5pExtension.bind(this))
            .addRule(this._zipArchiveMustBeValid.bind(this))
            .addRule(this._fileSizeMustBeWithinLimits.bind(this))
            .addRule(this._filterOutEntries((entry) => entry.name.startsWith(".") || entry.name.startsWith("_")))
            .addRule(this._filterOutEntries((entry) => entry.name.endsWith("/")))
            .addRuleWhen(this._fileExtensionMustBeAllowed((name) => name.startsWith("content/"), this._contentExtensionWhitelist), checkContent)
            .addRuleWhen(this._fileExtensionMustBeAllowed((name) => name.includes("/") && !name.startsWith("content/"), this._libraryExtensionWhitelist), checkLibraries)
            .addRuleWhen(this._fileMustExist("h5p.json", this._translationService.getTranslation("invalid-h5p-json-file"), true), checkContent)
            .addRuleWhen(this._jsonMustConformToSchema("h5p.json", this._h5pMetadataValidator, "invalid-h5p-json-file-2"), checkContent)
            .addRuleWhen(this._fileMustExist("content/content.json", this._translationService.getTranslation("invalid-content-folder"), true), checkContent)
            .addRuleWhen(this._jsonMustBeParsable("content/content.json"), checkContent)
            .addRule(throwErrorsNow.bind(this))
            .addRuleWhen(this._filesMustBeReadable((filePath) => filePath.startsWith("content/")), checkContent)
            .addRuleWhen(this._librariesMustBeValid.bind(this), checkLibraries)
            .addRule(throwErrorsNow.bind(this))
            .addRule(this._returnTrue)
            .validate(h5pFile);
    }

    /**
     * Checks whether the library conforms to the standard and returns its data.
     * @param {IZipEntry[]} zipEntries All (relevant) zip entries of the package.
     * @param {string} libraryName The name of the library to check
     * @returns { semantics: any, hasIcon: boolean, language: any } the object from library.json with additional data from semantics.json, the language files and the icon.
     */
    async _validateLibrary(zipEntries, libraryName, error) {
        try {
            return await (new ValidatorBuilder()
                .addRule(this._libraryDirectoryMustHaveValidName(libraryName))
                .addRule(this._jsonMustBeParsable("semantics.json",
                    this._translationService.getTranslation("invalid-semantics-json-file", { "%name": libraryName }),
                    true,
                    false))
                .addRule(this._jsonMustConformToSchema(`${libraryName}/library.json`,
                    this._libraryMetadataValidator,
                    "invalid-schema-library-json-file",
                    this._translationService.getTranslation("invalid-library-json-file", { "%name": libraryName }),
                    true))
                .addRule(this._mustBeCompatibleToCoreVersion.bind(this))
                .addRule(this._libraryMustHaveMatchingDirectoryName(libraryName))
                .addRule(this._libraryPreloadedFilesMustExist.bind(this))
                .addRule(this._libraryLanguageFilesMustBeValid.bind(this))
                .validate(zipEntries, error));
        } catch (e) {
            if (e instanceof ValidationError) {
                // Don't rethrow a ValidationError as other libraries can still be validated, too.
                return false;
            }
            throw e;
        }
    }

    /**
     * RULES METHODS
     */

    /**
     * A rule that always returns true.
     */
    async _returnTrue() {
        return true;
    }

    /**
     * Checks if the package file ends with .h5p.
     * Throws an error.
     * @param {string} h5pFile Path to the h5p file
     * @param {ValidationError} error The error object to use
     * @returns {string} Unchanged path to the h5p file
     */
    async _mustHaveH5pExtension(h5pFile, error) {
        if (path.extname(h5pFile).toLocaleLowerCase() !== '.h5p') {
            throw error.addError(this._translationService.getTranslation("missing-h5p-extension"));
        }
        return h5pFile;
    }

    /**
     * Makes sure the archive can be unzipped.
     * Throws an error.
     * @param {string} h5pFile Path to the h5p file
     * @param {ValidationError} error The error object to use
     * @returns {IZipEntry[]} The entries inside the zip archive
     */
    async _zipArchiveMustBeValid(h5pFile, error) {
        const zipArchive = H5pPackageValidator._openZipArchive(h5pFile);
        if (!zipArchive) {
            throw error.addError(this._translationService.getTranslation("unable-to-unzip"));
        }
        return zipArchive.getEntries();
    }

    /**
     * Checks file sizes (single files and all files combined)
     * Does NOT throw errors but appends them to the error object.
     * @param {IZipEntry[]} zipEntries The entries inside the h5p file
     * @param {ValidationError} error The error object to use
     * @returns {IZipEntry[]} The unchanged zip entries
     */
    async _fileSizeMustBeWithinLimits(zipEntries, error) {
        let totalFileSize = 0; // in bytes
        if (this._config.maxFileSize) {
            for (const entry of zipEntries) {
                totalFileSize += entry.header.size;
                if (entry.header.size > this._config.maxFileSize) {
                    error.addError(this._translationService.getTranslation("file-size-too-large",
                        {
                            "%file": entry.entryName,
                            "%used": formatBytes(entry.header.size),
                            "%max": formatBytes(this._config.maxFileSize)
                        }));
                }
            }
        }
        if (this._config.maxTotalSize && totalFileSize > this._config.maxTotalSize) {
            error.addError(this._translationService.getTranslation("total-size-too-large",
                {
                    "%used": formatBytes(totalFileSize),
                    "%max": formatBytes(this._config.maxTotalSize)
                }));
        }
        return zipEntries;
    }

    /**
    * Factory for the file extension rule: Checks if the file extensions of the files in the array are
    * in the whitelists. 
    * Does NOT throw errors but appends them to the error object.
    * @param {(string) => boolean} filter The filter function must return true if the filename passed to it should be checked
    * @param {string[]} whitelist The file extensions that are allowed for files that match the filter
    * @returns the rule
    */
    _fileExtensionMustBeAllowed(filter, whitelist) {
        /**
         * @param {IZipEntry[]} zipEntries The zip entries
         * @param {ValidationError} error The error object
         * @returns {IZipEntry[]} The unchanged zip entries
         */
        return async (zipEntries, error) => {
            for (const zipEntry of zipEntries) {
                const lowercaseName = zipEntry.entryName.toLocaleLowerCase();

                // Skip files that aren't matched by the filter and directories
                if (filter(lowercaseName)
                    && !zipEntry.isDirectory
                    && !H5pPackageValidator._isAllowedFileExtension(lowercaseName, whitelist)) {
                    error.addError(this._translationService.getTranslation("not-in-whitelist", {
                        "%filename": zipEntry.entryName,
                        "%files-allowed": this._contentExtensionWhitelist.join(" ")
                    }));
                }
            }
            return zipEntries;
        }
    }

    /**
     * Factory for a rule that makes sure that a certain file must exist.
     * Does NOT throw errors but appends them to the error object.
     * @param {string} filename The filename that must exist among the zip entries (path, not case-sensitive)
     * @param {string} errorMessage The error message that is used if the file does not exist
     * @param {boolean} throwOnError If true, the rule will throw an error if the file does not exist. 
     * @returns the rule
     */
    // eslint-disable-next-line class-methods-use-this
    _fileMustExist(filename, errorMessage, throwOnError = false) {
        /**
         * @param {IZipEntry[]} zipEntries The zip entries in the whole package
         * @param {ValidationError} error The error object
         * @returns {IZipEntry[]} The unchanged zip entries 
         */
        return async (zipEntries, error) => {
            if (!zipEntries.find(e => e.entryName.toLocaleLowerCase() === filename.toLocaleLowerCase())) {
                error.addError(errorMessage);
                if (throwOnError) {
                    throw error;
                }
            }
            return zipEntries;
        }
    }

    /**
     * Factory for a rule that makes sure a JSON file is parsable and conforms to the specified JSON schema.
     * Throws an error if the JSON file can't be parsed or if it does not conform to the schema.
     * @param {string} filename The path to the file.
     * @param {ajv.ValidateFunction} schemaValidator The validator for the required schema.
     * @param {string} errorMessageId The id of the message that is emitted, when there is an error. (Allowed placeholders: %name, %reason)
     * @param {string} jsonParseMessage (optional) The message to output if the JSON file is not parsable (will default to a generíc error message)
     * @param {boolean} returnContent (optional) If true, the rule will return an object with { zipEntries, jsonData } where jsonData contains the parsed JSON of the file
     * @return The rule
     */
    _jsonMustConformToSchema(filename, schemaValidator, errorMessageId, jsonParseMessage, returnContent = false) {
        /**
         * @param {IZipEntry[]} zipEntries
         * @param {ValidationError} error
         * @returns {ZipEntry[] | { zipEntries: ZipEntry[], jsonData: any }} An array of ZipEntries if returnContent == false, otherwise the JSON content is added to the return object
         */
        return async (zipEntries, error) => {
            const entry = zipEntries.find(e => e.entryName.toLocaleLowerCase() === filename.toLocaleLowerCase());
            if (!entry) {
                throw new Error(`File ${filename} missing from H5P package. Make sure to use the fileMustExistRule before using jsonMustConformToSchemaRule!`);
            }
            let jsonData;
            try {
                jsonData = this._tryParseJson(entry);
            }
            catch (jsonParseError) {
                throw error.addError(jsonParseMessage || jsonParseError.message);
            }
            if (!schemaValidator(jsonData)) {
                throw error.addError(this._translationService.getTranslation(errorMessageId,
                    {
                        "%name": entry.entryName,
                        "%reason": schemaValidator.errors.map(e => `${e.dataPath} ${e.message}`).join(" ").trim()
                    }));
            }
            if (!returnContent) {
                return zipEntries;
            }

            return { zipEntries, jsonData };
        }
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
    _jsonMustBeParsable(filename, errorMessage = undefined, skipIfNonExistent = false, throwIfError = true) {
        /**
         * @param {IZipEntry[]} zipEntries The zip entries in the H5P package
         * @param {ValidationError} error The error object
         * @returns {IZipEntry[]} The unchanged zip entries
         */
        return async (zipEntries, error) => {
            const entry = zipEntries.find(e => e.entryName.toLocaleLowerCase() === filename.toLocaleLowerCase());
            if (!entry) {
                if (skipIfNonExistent) {
                    return zipEntries;
                }
                throw new Error(`File ${filename} missing from H5P package. Make sure to use the fileMustExistRule before using jsonMustBeParsableRule!`);
            }
            try {
                this._tryParseJson(entry);
            }
            catch (jsonParseError) {
                if (throwIfError) {
                    throw error.addError(errorMessage || jsonParseError.message);
                } else {
                    error.addError(errorMessage || jsonParseError.message);
                }
            }
            return zipEntries;
        }
    }

    /**
     * Factory for a rule that tries reading the files that are matched by the filter.
     * Does not throw errors.
     * @param {(path: string) => boolean} filter Returns true for files that should be readable.
     * @returns the rule
     */
    _filesMustBeReadable(filter) {
        /**
        * @param {IZipEntry[]} zipEntries The zip entries in the H5P package
        * @param {ValidationError} error The error object
        * @returns {IZipEntry[]} The unchanged zip entries
        */
        return async (zipEntries, error) => {
            for (const entry of zipEntries.filter((e) => filter(e.entryName.toLocaleLowerCase()) && !e.isDirectory)) {
                try {
                    entry.getData();
                } catch (e) {
                    error.addError(this._translationService.getTranslation("corrupt-file", { "%file": e.entryName }));
                }
            }
            return zipEntries;
        }
    }

    /**
     * Factory for a rule that filters out files from the validation.
     * @param {(IZipEntry) => boolean} filter The filter. Filenames matched by this filter will be filtered out.
     * @returns the rule
     */
    // eslint-disable-next-line class-methods-use-this
    _filterOutEntries(filter) {
        /**
        * @param {IZipEntry[]} zipEntries The zip entries in the whole H5P package
        * @returns {IZipEntry[]} The zip entries without the filtered out entries
        */
        return async (zipEntries) => {
            return zipEntries.filter(e => !filter(e));
        }
    }

    /**
     * Validates the libraries inside the package.
     * @param {IZipEntry[]} zipEntries The entries inside the h5p file
     * @param { ValidationError} error The error object to use
     * @returns {IZipEntry[]} The unchanged zip entries
     */
    async _librariesMustBeValid(zipEntries, error) {
        const tld = getTopLevelDirectories(zipEntries);
        await Promise.all(tld.filter(d => d !== "content").map(directory => this._validateLibrary(zipEntries, directory, error)));
        return zipEntries;
    }

    /**
     * Factory for rule that checks if library's directory conforms to naming standards
     * @param {string} libraryName The name of the library (directory)
     * @returns the rule
     */
    _libraryDirectoryMustHaveValidName(libraryName) {
        /**
        * @param {IZipEntry[]} zipEntries The entries inside the h5p file
        * @param {ValidationError} error The error object to use
        * @returns {IZipEntry[]} The unchanged zip entries
         */
        return async (zipEntries, error) => {
            if (!this._libraryDirectoryNameRegex.test(libraryName)) {
                throw error.addError(this._translationService.getTranslation("invalid-library-name",
                    { "%name": libraryName }));
            }
            return zipEntries;
        }
    }

    /**
     * Checks if a library is compatible to the core version running.
     * Does not throw a ValidationError.
     * @param {ZipEntry[]} zipEntries zip entries in the package
     * @param {any} jsonData jsonData of the library.json file.
     * @param {ValidationError} error The error object to use
     * @returns {zipEntries: ZipEntry[], jsonData: any} the unchanged data passed to the rule
     */
    async _mustBeCompatibleToCoreVersion({ zipEntries, jsonData }, error) {
        this._checkCoreVersion(jsonData, `${jsonData.machineName}-${jsonData.majorVersion}.${jsonData.minorVersion}`, error);
        return { zipEntries, jsonData };
    }

    /**
     * Factory for a check that makes sure that the directory name of the library matches the name in
     * the library.json metadata.
     * Does not throw a ValidationError.
     * @param {string} directoryName the name of the directory in the package this library is in
     * @returns the rule
     */
    _libraryMustHaveMatchingDirectoryName(directoryName) {
        /**
         * @param {ZipEntry[]} zipEntries zip entries in the package
         * @param {any} jsonData jsonData of the library.json file
         * @param {ValidationError} error The error object to use
         * @returns {zipEntries: ZipEntry[], jsonData: any} the unchanged data passed to the rule
         */
        return async ({ zipEntries, jsonData }, error) => {
            // Library's directory name must be:
            // - <machineName>
            //     - or -
            // - <machineName>-<majorVersion>.<minorVersion>
            // where machineName, majorVersion and minorVersion is read from library.json
            if (directoryName !== jsonData.machineName && directoryName !== `${jsonData.machineName}-${jsonData.majorVersion}.${jsonData.minorVersion}`) {
                error.addError(this._translationService.getTranslation("library-directory-name-mismatch", {
                    "%directoryName": directoryName,
                    "%machineName": jsonData.machineName,
                    "%majorVersion": jsonData.majorVersion,
                    "%minorVersion": jsonData.minorVersion
                }));
            }
            return { zipEntries, jsonData };
        }
    }

    /**
     * Checks if all JavaScript and CSS file references in the preloaded section of the library metadata are present in the package.
     * @param {ZipEntry[]} zipEntries zip entries in the package
     * @param {any} jsonData data of the library.json file.
     * @param {ValidationError} error The error object to use
     * @returns {zipEntries: ZipEntry[], jsonData: any} the unchanged data passed to the rule
     */
    async _libraryPreloadedFilesMustExist({ zipEntries, jsonData }, error) {
        const dirName = `${jsonData.machineName}-${jsonData.majorVersion}.${jsonData.minorVersion}`;
        // check if all JavaScript files that must be preloaded are part of the package
        if (jsonData.preloadedJs) {
            await Promise.all(jsonData.preloadedJs.map(file => this._fileMustExist(path.join(dirName, file.path), this._translationService.getTranslation("library-missing-file", { "%file": file.path, "%name": dirName }))(zipEntries, error)));
        }

        // check if all CSS files that must be preloaded are part of the package
        if (jsonData.preloadedCss) {
            await Promise.all(jsonData.preloadedCss.map(file => this._fileMustExist(path.join(dirName, file.path), this._translationService.getTranslation("library-missing-file", { "%file": file.path, "%name": dirName }))(zipEntries, error)));
        }
        return { zipEntries, jsonData };
    }

    /**
     * Checks if the language files in the library have the correct naming schema and are valid JSON.
     * @param {ZipEntry[]} zipEntries zip entries in the package
     * @param {any} jsonData jsonData of the library.json file.
     * @param {ValidationError} error The error object to use
     * @returns {zipEntries: ZipEntry[], jsonData: any} the unchanged data passed to the rule
     */
    async _libraryLanguageFilesMustBeValid({ zipEntries, jsonData }, error) {
        const dirName = `${jsonData.machineName}-${jsonData.majorVersion}.${jsonData.minorVersion}`;
        const languagePath = path.join(dirName, "language/");
        const languageFileRegex = /^(-?[a-z]+){1,7}\.json$/i;
        for (const languageFileEntry of zipEntries.filter(e => e.entryName.startsWith(languagePath) && !e.isDirectory)) {
            if (!languageFileRegex.test(languageFileEntry.name)) {
                error.addError(this._translationService.getTranslation("invalid-language-file", { "%file": languageFileEntry.name, "%library": dirName }));
            }
            try {
                this._tryParseJson(languageFileEntry);
            }
            catch (ignored) {
                error.addError(this._translationService.getTranslation("invalid-language-file-json", { "%file": languageFileEntry.name, "%library": dirName }));
            }
        }
        return { zipEntries, jsonData };
    }

    /**
     * HELPER METHODS
     */

    /**
     * Initializes the JSON schema validators _h5pMetaDataValidator and _libraryMetadataValidator.
     * Can be called multiple times, as it only creates new validators when it hasn't been called before.
     */
    async _initializeJsonValidators() {
        if (this._h5pMetadataValidator && this._libraryMetadataValidator) {
            return;
        }

        const jsonValidator = new Ajv();
        const h5pJsonSchema = require('./schemas/h5p-schema.json');
        const libraryNameSchema = require('./schemas/library-name-schema.json');
        const librarySchema = require('./schemas/library-schema.json');
        jsonValidator.addSchema([h5pJsonSchema, libraryNameSchema, librarySchema]);
        this._h5pMetadataValidator = jsonValidator.compile(h5pJsonSchema);
        this._libraryMetadataValidator = jsonValidator.compile(librarySchema);
    }

    /**
     * Opens the zip archive.
     * @param {string} file Path to file to open
     * @returns {AdmZip} Zip archive object or undefined if zip file cannot be opened.
     */
    static _openZipArchive(file) {
        try {
            return new AdmZip(file);
        }
        catch (ignored) {
            return undefined;
        }
    }

    /**
     * Checks if the passed filename has an extension that is in the passed list.
     * @param {string} filename The filename to check
     * @param {string[]} allowedExtensions A list of extensions to check against
     */
    static _isAllowedFileExtension(filename, allowedExtensions) {
        let actualExtension = path.extname(filename);
        if (actualExtension === "") {
            return false;
        }
        actualExtension = actualExtension.substr(1);
        if (allowedExtensions.some(allowedExtension => allowedExtension === actualExtension)) {
            return true;
        }
        return false;
    }

    /**
     * Tries to open the file in the ZIP archive in memory and parse it as JSON. Will throw errors
     * if the file cannot be read or is no valid JSON.
     * @param {AdmZip.IZipEntry} entry The entry to read
     * @returns {Object} The read JSON
     */
    _tryParseJson(entry) {
        let content;
        try {
            content = entry.getData().toString('utf8');
        }
        catch (ignored) {
            throw new Error(this._translationService.getTranslation("unable-to-read-package-file", { "%fileName": entry.entryName }));
        }

        try {
            return JSON.parse(content);
        }
        catch (ignored) {
            throw new Error(this._translationService.getTranslation("unable-to-parse-package", { "%fileName": entry.entryName }));
        }
    }

    /**
     * Checks if the core API version required in the metadata can be satisfied by the running instance. 
     * @param {{coreApi: { majorVersion: number, minorVersion: number }}} metadata The object containing information about the required core version
     * @param {string} libraryName The name of the library that is being checked.
     * @param {ValidationError} error The error object.
     * @returns {boolean} true if the core API required in the metadata can be satisfied by the running instance. Also true if the metadata doesn't require any core API version.
     */
    _checkCoreVersion(metadata, libraryName, error) {
        if (!metadata.coreApi || !metadata.coreApi.majorVersion || !metadata.coreApi.minorVersion) {
            return true;
        }
        if (metadata.coreApi.majorVersion > this._config.coreApiVersion.major
            || (metadata.coreApi.majorVersion === this._config.coreApiVersion.major
                && metadata.coreApi.minorVersion > this._config.coreApiVersion.minor)) {
            error.addError(this._translationService.getTranslation("api-version-unsupported", {
                "%component": libraryName,
                "%current": `${this._config.coreApiVersion.major}.${this._config.coreApiVersion.minor}`,
                "%required": `${metadata.coreApi.majorVersion}.${metadata.coreApi.minorVersion}`
            }));
        }
        return true;
    }
}

module.exports = H5pPackageValidator;