import fsExtra from 'fs-extra';
import path from 'path';
import postCss, { CssSyntaxError } from 'postcss';
import postCssUrl from 'postcss-url';
import postCssClean from 'postcss-clean';
import mimetypes from 'mime-types';
import uglifyJs from 'uglify-js';
import postCssSafeParser from 'postcss-safe-parser';

import H5PPlayer from './H5PPlayer';
import { streamToString } from './helpers/StreamHelpers';
import LibraryName from './LibraryName';
import {
    ContentId,
    IContentStorage,
    IH5PConfig,
    ILibraryName,
    ILibraryStorage,
    IPlayerModel,
    IUser
} from './types';
import { ContentFileScanner } from './ContentFileScanner';
import LibraryManager from './LibraryManager';
import postCssRemoveRedundantUrls from './helpers/postCssRemoveRedundantFontUrls';
import LibrariesFilesList from './helpers/LibrariesFilesList';

/**
 * This script is used to change the default behavior of H5P when it gets
 * resources dynamically from JavaScript. This works in most cases, but there
 * are some libraries (the H5P.SoundJS library used by single choice set) that
 * can't be modified that way.
 */
const getLibraryFilePathOverrideScript = uglifyJs.minify(
    `H5P.ContentType = function (isRootLibrary) {
    function ContentType() {}                  
    ContentType.prototype = new H5P.EventDispatcher();                  
    ContentType.prototype.isRoot = function () {
      return isRootLibrary;
    };                  
    ContentType.prototype.getLibraryFilePath = function (filePath) {
        return furtherH5PInlineResources[this.libraryInfo.versionedNameNoSpaces + '/' + filePath];
    };                  
    return ContentType;
  };`
).code;

const getContentPathOverrideScript = uglifyJs.minify(
    `H5P.getPath = function (path, contentId) {
        return path;
    };
    `
).code;

/**
 * Creates standalone HTML packages that can be used to display H5P in a browser
 * without having to use the full H5P server backend.
 *
 * The bundle includes all JavaScript files, stylesheets, fonts of the H5P core
 * and all libraries used in the content. It also includes base64 encoded
 * resources used in the content itself. This can make the files seriously big,
 * if the content includes video files or lots of high-res images.
 *
 * The bundle does NOT internalize resources that are included in the content
 * via absolute URLs but only resources that are part of the H5P package.
 *
 * The HTML exports work with all content types on the official H5P Hub, but
 * there might be unexpected issues with other content types if they behave
 * weirdly and in any kind of non-standard way.
 *
 * The exported bundle contains license information for each file put into the
 * bundle in a shortened fashion (only includes author and license name and not
 * full license text).
 *
 * (important!) You need to install these NPM packages for the exporter to work:
 * postcss, postcss-clean, postcss-url, postcss-safe-parser, uglify-js
 */

export default class HtmlExporter {
    /**
     * @param libraryStorage
     * @param contentStorage
     * @param config
     * @param coreFilePath the path on the local filesystem at which the H5P
     * core files can be found. (should contain a js and styles directory)
     * @param editorFilePath the path on the local filesystem at which the H5P
     * editor files can be found. (Should contain the scripts, styles and
     * ckeditor directories).
     */
    constructor(
        protected libraryStorage: ILibraryStorage,
        protected contentStorage: IContentStorage,
        protected config: IH5PConfig,
        protected coreFilePath: string,
        protected editorFilePath: string
    ) {
        this.player = new H5PPlayer(
            this.libraryStorage,
            this.contentStorage,
            this.config
        );
        this.coreSuffix = `${this.config.baseUrl + this.config.coreUrl}/`;
        this.editorSuffix = `${
            this.config.baseUrl + this.config.editorLibraryUrl
        }/`;
        this.contentFileScanner = new ContentFileScanner(
            new LibraryManager(this.libraryStorage)
        );
    }

    private contentFileScanner: ContentFileScanner;
    private coreSuffix: string;
    private defaultAdditionalScripts: string[] = [
        // The H5P core client creates paths to resource files using the
        // hostname of the current URL, so we have to make sure data: URLs
        // work.
        `const realH5PGetPath = H5P.getPath;
        H5P.getPath = function (path, contentId) {
            if(path.startsWith('data:')){
                return path;
            }
            else {
                return realH5PGetPath(path, contentId);
            }
        };`
    ];
    private editorSuffix: string;
    private player: H5PPlayer;

    /**
     * Creates a HTML file that contains **all** scripts, styles and library
     * resources (images and fonts) inline. All resources used inside the
     * content are only listed and must be retrieved from library storage by the
     * caller.
     * @param contentId a content id that can be found in the content repository
     * passed into the constructor
     * @param user the user who wants to create the bundle
     * @param contentResourcesPrefix (optional) if set, the prefix will be added
     * to all content files in the content's parameters; example:
     * contentResourcesPrefix = '123'; filename = 'images/image.jpg' => filename
     * in parameters: '123/images/image.jpg' (the directory separated is added
     * automatically)
     * @throws H5PError if there are access violations, missing files etc.
     * @returns a HTML string that can be written into a file and a list of
     * content files used by the content; you can use the filenames in
     * IContentStorage.getFileStream. Note that the returned filenames DO NOT
     * include the prefix, so that the caller doesn't have to remove it when
     * calling getFileStream.
     */
    public async createBundleWithExternalContentResources(
        contentId: ContentId,
        user: IUser,
        contentResourcesPrefix: string = ''
    ): Promise<{ contentFiles: string[]; html: string }> {
        this.player.setRenderer(
            this.renderer(
                {
                    contentResources: 'files',
                    core: 'inline',
                    libraries: 'inline'
                },
                {
                    contentResourcesPrefix
                }
            )
        );
        return this.player.render(contentId, undefined, undefined, user);
    }

    /**
     * Creates a single HTML file that contains **all** scripts, styles and
     * resources (images, videos, etc.) inline. This bundle will grow very large
     * if there are big videos in the content.
     * @param contentId a content id that can be found in the content repository
     * passed into the constructor
     * @param user the user who wants to create the bundle
     * @throws H5PError if there are access violations, missing files etc.
     * @returns a HTML string that can be written into a file
     */
    public async createSingleBundle(
        contentId: ContentId,
        user: IUser
    ): Promise<string> {
        this.player.setRenderer(
            this.renderer({
                contentResources: 'inline',
                core: 'inline',
                libraries: 'inline'
            })
        );
        return (await this.player.render(contentId, undefined, undefined, user))
            .html;
    }

    /**
     * Finds all files in the content's parameters and returns them. Also
     * appends the prefix if necessary. Note: This method has a mutating effect
     * on model!
     * @param model
     * @param prefix this prefix will be added to all file references as
     * subdirectory
     */
    private async findAndPrefixContentResources(
        model: IPlayerModel,
        prefix: string = ''
    ): Promise<string[]> {
        const content = model.integration.contents[`cid-${model.contentId}`];
        const params = JSON.parse(content.jsonContent);
        const mainLibraryUbername = content.library;

        const fileRefs = (
            await this.contentFileScanner.scanForFiles(
                params,
                LibraryName.fromUberName(mainLibraryUbername, {
                    useWhitespace: true
                })
            )
        ).filter((ref) => this.isLocalPath(ref.filePath));
        fileRefs.forEach(
            (ref) => (ref.context.params.path = path.join(prefix, ref.filePath))
        );
        model.integration.contents[
            `cid-${model.contentId}`
        ].jsonContent = JSON.stringify(params);

        return fileRefs.map((ref) => ref.filePath);
    }

    /**
     * Generates JavaScript / CSS comments that includes license information
     * about a file. Includes: filename, author, license. Note that some H5P
     * libraries don't contain any license information.
     * @param filename
     * @param core
     * @param editor
     * @param library
     * @returns a multi-line comment with the license information. The comment
     * is marked as important and includes @license so that uglify-js and
     * postcss-clean leave it in.
     */
    private async generateLicenseText(
        filename: string,
        core?: boolean,
        editor?: boolean,
        library?: ILibraryName
    ): Promise<string> {
        if (core) {
            return `/*!@license ${filename} by Joubel and other contributors, licensed under GNU GENERAL PUBLIC LICENSE Version 3*/`;
        }
        if (editor) {
            return `/*!@license ${filename} by Joubel and other contributors, licensed under MIT license*/`;
        }
        if (library) {
            let { author, license } = await this.libraryStorage.getLibrary(
                library
            );
            if (!author || author === '') {
                author = 'unknown';
            }
            if (!license || license === '') {
                license = 'unknown license';
            }
            return `/*!@license ${LibraryName.toUberName(
                library
            )}/${filename} by ${author} licensed under ${license}*/`;
        }
        return '';
    }

    /**
     * Gets the contents of a file as a string. Only works for text files, not
     * binary files.
     * @param filename the filename as generated by H5PPlayer. This can be a
     * path to a) a core file b) an editor file c) a library file
     * @returns an object giving more detailed information about the file:
     * - core: true if the file is a core file, undefined otherwise
     * - editor: true if the file is an editor file, undefined otherwise
     * - library: the library name if the file is a library file, undefined
     *   otherwise
     * - filename: the filename if the suffix of the core/editor/library is
     *   stripped
     * - text: the text in the file
     */
    private async getFileAsText(
        filename: string,
        usedFiles: LibrariesFilesList
    ): Promise<{
        core?: boolean;
        editor?: boolean;
        filename: string;
        library?: ILibraryName;
        text: string;
    }> {
        const libraryFileMatch = new RegExp(
            `^${this.config.baseUrl}${this.config.librariesUrl}/([\\w\\.]+)-(\\d+)\\.(\\d+)\\/(.+)$`
        ).exec(filename);

        if (!libraryFileMatch) {
            if (filename.startsWith(this.coreSuffix)) {
                // Core files
                const filenameWithoutDir = filename.substr(
                    this.coreSuffix.length
                );
                return {
                    text: (
                        await fsExtra.readFile(
                            path.resolve(this.coreFilePath, filenameWithoutDir)
                        )
                    ).toString(),
                    core: true,
                    filename: filenameWithoutDir
                };
            }

            if (filename.startsWith(this.editorSuffix)) {
                // Editor files
                const filenameWithoutDir = filename.substr(
                    this.editorSuffix.length
                );
                return {
                    text: (
                        await fsExtra.readFile(
                            path.resolve(
                                this.editorFilePath,
                                filenameWithoutDir
                            )
                        )
                    ).toString(),
                    editor: true,
                    filename: filenameWithoutDir
                };
            }
        } else {
            // Library files
            const library = {
                machineName: libraryFileMatch[1],
                majorVersion: Number.parseInt(libraryFileMatch[2], 10),
                minorVersion: Number.parseInt(libraryFileMatch[3], 10)
            };
            const filenameWithoutDir = libraryFileMatch[4];
            usedFiles.addFile(library, filenameWithoutDir);
            return {
                text: await streamToString(
                    await this.libraryStorage.getFileStream(
                        library,
                        filenameWithoutDir
                    )
                ),
                library,
                filename: filenameWithoutDir
            };
        }
        throw Error(
            `Unknown file pattern: ${filename} is neither a library file, a core file or an editor file.`
        );
    }

    /**
     * Creates a big minified bundle of all script files in the model
     * @param model
     * @param additionalScripts an array of scripts (actual script code as
     * string, not filenames!) that should be appended at the end of the bundle
     * @returns all scripts in a single bundle
     */
    private async getScriptBundle(
        model: IPlayerModel,
        usedFiles: LibrariesFilesList,
        additionalScripts: string[] = []
    ): Promise<string> {
        const texts = {};
        await Promise.all(
            model.scripts.map(async (script) => {
                const {
                    text,
                    filename,
                    core,
                    editor,
                    library
                } = await this.getFileAsText(script, usedFiles);
                const licenseText = await this.generateLicenseText(
                    filename,
                    core,
                    editor,
                    library
                );
                // We must escape </script> tags inside scripts.
                texts[script] =
                    licenseText + text.replace(/<\/script>/g, '<\\/script>');
            })
        );
        const scripts = model.scripts
            .map((script) => texts[script])
            .concat(additionalScripts);
        return uglifyJs.minify(scripts, { output: { comments: 'some' } }).code;
    }

    /**
     * Creates a big minified bundle of all style files in the model. Also
     * internalizes all url(...) resources in the styles.
     * @param model
     * @returns all styles in a single bundle
     */
    private async getStylesBundle(
        model: IPlayerModel,
        usedFiles: LibrariesFilesList
    ): Promise<string> {
        const styleTexts = {};
        await Promise.all(
            model.styles.map(async (style) => {
                const {
                    text,
                    filename,
                    library,
                    editor,
                    core
                } = await this.getFileAsText(style, usedFiles);
                const licenseText = await this.generateLicenseText(
                    filename,
                    core,
                    editor,
                    library
                );
                let processedCss = '';
                const pCss = postCss(
                    postCssRemoveRedundantUrls(
                        undefined,
                        library
                            ? (f) => {
                                  usedFiles.addFile(
                                      library,
                                      path.join(path.dirname(filename), f)
                                  );
                              }
                            : undefined
                    ),
                    postCssUrl({
                        url: this.urlInternalizer(
                            filename,
                            library,
                            editor,
                            core,
                            usedFiles
                        )
                    }),
                    postCssClean()
                );

                try {
                    processedCss = (
                        await pCss.process(licenseText + text, {
                            from: filename
                        })
                    )?.css;
                } catch (error) {
                    // We retry with a more tolerant CSS parser if parsing has
                    // failed with the regular one.
                    if (error instanceof CssSyntaxError) {
                        processedCss = (
                            await pCss.process(licenseText + text, {
                                parser: postCssSafeParser,
                                from: filename
                            })
                        )?.css;
                    } else {
                        throw error;
                    }
                }
                styleTexts[style] = processedCss;
            })
        );
        return model.styles.map((style) => styleTexts[style]).join('\n');
    }

    /**
     * Gets base64 encoded contents of library files that have not been used in
     * the bundle so far. Ignores files that are only used by the editor.
     * @param libraries the libraries for which to get files
     * @returns an object with the filenames of files as keys and base64 strings
     * as values
     */
    private async getUnusedLibraryFiles(
        libraries: ILibraryName[],
        usedFiles: LibrariesFilesList
    ): Promise<{ [filename: string]: string }> {
        const result: { [filename: string]: string } = {};

        await Promise.all(
            libraries.map(async (library) => {
                const ubername = LibraryName.toUberName(library);
                const allLibraryFiles = await this.libraryStorage.listFiles(
                    library
                );
                const unusedLibraryFiles = allLibraryFiles.filter(
                    (filename) => {
                        if (
                            !usedFiles.checkFile(library, filename) &&
                            !filename.startsWith('language/') &&
                            filename !== 'library.json' &&
                            filename !== 'semantics.json' &&
                            filename !== 'icon.svg' &&
                            filename !== 'upgrades.js' &&
                            filename !== 'presave.js'
                        ) {
                            const mt = mimetypes.lookup(
                                path.basename(filename)
                            );
                            if (
                                mt &&
                                (mt.startsWith('audio/') ||
                                    mt.startsWith('video/') ||
                                    mt.startsWith('image/')) &&
                                !filename.includes('font')
                            ) {
                                return true;
                            }
                        }
                        return false;
                    }
                );
                await Promise.all(
                    unusedLibraryFiles.map(async (unusedFile) => {
                        result[
                            `${ubername}/${unusedFile}`
                        ] = `data:${mimetypes.lookup(
                            path.basename(unusedFile)
                        )};base64,${await streamToString(
                            await this.libraryStorage.getFileStream(
                                library,
                                unusedFile
                            ),
                            'base64'
                        )}`;
                    })
                );
            })
        );
        return result;
    }

    /**
     * Changes the content params by internalizing all files references with
     * base64 data strings. Has a side effect on contents[cid-xxx]!
     * @param model
     */
    private async internalizeContentResources(
        model: IPlayerModel
    ): Promise<void> {
        const content = model.integration.contents[`cid-${model.contentId}`];
        const params = JSON.parse(content.jsonContent);
        const mainLibraryUbername = content.library;

        const contentFiles = await this.contentFileScanner.scanForFiles(
            params,
            LibraryName.fromUberName(mainLibraryUbername, {
                useWhitespace: true
            })
        );
        await Promise.all(
            contentFiles.map(async (fileRef) => {
                if (this.isLocalPath(fileRef.filePath)) {
                    try {
                        const base64 = await streamToString(
                            await this.contentStorage.getFileStream(
                                model.contentId,
                                fileRef.filePath,
                                model.user
                            ),
                            'base64'
                        );
                        const mimetype =
                            fileRef.mimeType ||
                            mimetypes.lookup(path.extname(fileRef.filePath));
                        fileRef.context.params.path = `data:${mimetype};base64,${base64}`;
                    } catch (error) {
                        // We silently ignore errors, as there might be cases in
                        // which YouTube links are not detected correctly.
                    }
                }
            })
        );
        content.jsonContent = JSON.stringify(params);
        content.contentUrl = '.';
        content.url = '.';
    }

    /**
     * Returns true if the filename is not an absolute URL or empty.
     * @param filename
     */
    private isLocalPath = (filename: string): boolean =>
        !(
            filename === '' ||
            filename.toLocaleLowerCase().startsWith('http://') ||
            filename.toLocaleLowerCase().startsWith('https://')
        );

    /**
     * Creates HTML strings out of player models.
     * @param model the player model created by H5PPlayer
     * @returns a string with HTML markup
     */
    private renderer = (
        mode: {
            contentResources: 'files' | 'inline';
            core: 'files' | 'inline';
            libraries: 'files' | 'inline';
        },
        options?: {
            contentResourcesPrefix?: string;
        }
    ) => async (
        model: IPlayerModel
    ): Promise<{ contentFiles?: string[]; html: string }> => {
        if (mode.core === 'files') {
            throw new Error('Core mode "files" not supported yet.');
        }
        if (mode.libraries === 'files') {
            throw new Error('Library mode "files" not supported yet.');
        }

        const usedFiles = new LibrariesFilesList();
        // tslint:disable-next-line: prefer-const
        let [scriptsBundle, stylesBundle] = await Promise.all([
            this.getScriptBundle(
                model,
                usedFiles,
                this.defaultAdditionalScripts
            ),
            this.getStylesBundle(model, usedFiles),
            mode?.contentResources === 'inline'
                ? this.internalizeContentResources(model)
                : undefined
        ]);

        // Look for files in the libraries which haven't been included in the
        // bundle so far.
        const unusedFiles = await this.getUnusedLibraryFiles(
            model.dependencies,
            usedFiles
        );
        // If there are files in the directory of a library that haven't been
        // included in the bundle yet, we add those as base64 encoded variables
        // and rewire H5P.ContentType.getLibraryFilePath to return these files
        // as data urls. (needed for resource files of H5P.BranchingScenario)
        if (Object.keys(unusedFiles).length) {
            scriptsBundle = scriptsBundle.concat(
                ` var furtherH5PInlineResources=${JSON.stringify(
                    unusedFiles
                )};`,
                getLibraryFilePathOverrideScript
            );
        }

        // If the user wants to put content resources into files, we must get
        // these files and
        let contentFiles: string[];
        if (mode.contentResources === 'files') {
            contentFiles = await this.findAndPrefixContentResources(
                model,
                options?.contentResourcesPrefix
            );
            scriptsBundle = scriptsBundle.concat(getContentPathOverrideScript);
        }

        const html = `<!doctype html>
            <html class="h5p-iframe">
            <head>
                <meta charset="utf-8">                    
                <script>H5PIntegration = ${JSON.stringify({
                    ...model.integration,
                    baseUrl: '.',
                    url: '.',
                    ajax: { setFinished: '', contentUserData: '' },
                    saveFreq: false,
                    libraryUrl: ''
                })};
                ${scriptsBundle}</script>
                <style>${stylesBundle}</style>
            </head>
            <body>
                <div class="h5p-content lag" data-content-id="${
                    model.contentId
                }"></div>                
            </body>
            </html>`;
        return { html, contentFiles };
    };

    /**
     * A factory method that returns functions that can be passed to the url
     * option of postcss-url. The function returns the base64 encoded resource.
     * @param filename the filename of the css file being internalized
     * @param library the library name if the css file is a library file
     * @param editor true if the css file is a editor file
     * @param core true if the css file is a core file
     * @param asset the object received from the postcss-url plugin call
     */
    private urlInternalizer = (
        filename: string,
        library: ILibraryName,
        editor: boolean,
        core: boolean,
        usedFiles: LibrariesFilesList
    ) => async (asset) => {
        const mimetype = mimetypes.lookup(path.extname(asset.relativePath));

        if (library) {
            const p = path.join(path.dirname(filename), asset.relativePath);
            try {
                usedFiles.addFile(library, p);
                return `data:${mimetype};base64,${await streamToString(
                    await this.libraryStorage.getFileStream(library, p),
                    'base64'
                )}`;
            } catch {
                // There are edge cases in which there are non-existent files in
                // stylesheets as placeholders (H5P.BranchingScenario), so we
                // have to leave them in.
                return asset.relativePath;
            }
        }

        if (editor || core) {
            const basePath = editor
                ? path.join(this.editorFilePath, 'styles')
                : path.join(this.coreFilePath, 'styles');
            return `data:${mimetype};base64,${await fsExtra.readFile(
                path.resolve(basePath, asset.relativePath),
                'base64'
            )}`;
        }
    };
}
