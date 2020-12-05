import fsExtra from 'fs-extra';
import path from 'path';
import postCss, { ChildNode } from 'postcss';
import postCssUrl from 'postcss-url';
import postCssClean from 'postcss-clean';
import mimetypes from 'mime-types';
import uglifyJs from 'uglify-js';

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

export class HtmlExporter {
    /**
     *
     */
    constructor(
        protected libraryStorage: ILibraryStorage,
        protected contentStorage: IContentStorage,
        protected config: IH5PConfig,
        protected coreFilePath: string,
        protected editorFilePath: string,
        protected librariesPath: string
    ) {
        this.player = new H5PPlayer(
            this.libraryStorage,
            this.contentStorage,
            this.config
        );
        this.player.setRenderer(async (model: IPlayerModel) => {
            const scriptTexts = {};
            for (const script of model.scripts) {
                let { text } = await this.getLibraryFileAsText(script);
                text = text.replace(/<\/script>/g, '<\\/script>');
                scriptTexts[script] = text;
            }
            const fullScripts = uglifyJs.minify(scriptTexts).code;

            const styleTexts = {};
            for (const style of model.styles) {
                const {
                    text,
                    filename,
                    library,
                    editor,
                    core
                } = await this.getLibraryFileAsText(style);
                const basePath = library
                    ? path.join(
                          this.librariesPath,
                          LibraryName.toUberName(library),
                          path.dirname(filename)
                      )
                    : editor
                    ? path.join(this.editorFilePath, 'styles')
                    : path.join(this.coreFilePath, 'styles');
                const processedResult = await postCss(
                    {
                        postcssPlugin: 'postcss-remove-redundant-urls',
                        // tslint:disable-next-line: function-name typedef
                        Once(styles, { result }) {
                            styles.walkAtRules('font-face', (atRule) => {
                                const extensionmap = {
                                    eot: 'embedded-opentype',
                                    ttf: 'truetype'
                                };
                                const fontPreference = [
                                    'woff',
                                    'woff2',
                                    'truetype',
                                    'svg',
                                    'embedded-opentype'
                                ];

                                const fonts: {
                                    format: string;
                                    node: ChildNode;
                                    str: string;
                                }[] = [];
                                atRule.nodes
                                    .filter(
                                        (node) => (node as any).prop === 'src'
                                    )
                                    .forEach((node) => {
                                        const regex = /url\(["']?([^'"\)\?#]+)\.(.*?)([\?\#].+?)?["']?\)( format\(["'](.*?)["']\))?[,$]?/g;
                                        let matches;
                                        while (
                                            // tslint:disable-next-line: no-conditional-assignment
                                            (matches = regex.exec(
                                                (node as any).value
                                            ))
                                        ) {
                                            const format =
                                                matches[5] ??
                                                extensionmap[matches[2]] ??
                                                matches[2];
                                            fonts.push({
                                                format,
                                                node,
                                                str: matches[0]
                                            });
                                        }
                                    });
                                const keepFont = fonts.sort(
                                    (a, b) =>
                                        fontPreference.indexOf(a.format) -
                                        fontPreference.indexOf(b.format)
                                )[0];
                                fonts.forEach((f) => {
                                    if (f === keepFont) {
                                        // tslint:disable-next-line: no-console
                                        console.log(`keeping ${f.str}`);
                                        return;
                                    }
                                    // tslint:disable-next-line: no-console
                                    console.log(`removing ${f.str}`);
                                    (f.node as any).value = ((f.node as any)
                                        .value as string)
                                        .replace(f.str, '')
                                        .trim();
                                    if ((f.node as any).value.endsWith(',')) {
                                        (f.node as any).value = (f.node as any).value.substr(
                                            0,
                                            (f.node as any).value.length - 1
                                        );
                                    }
                                    if (
                                        ((f.node as any)
                                            .value as string).trim() === ''
                                    ) {
                                        atRule.removeChild(f.node);
                                    }
                                });
                            });
                        }
                    },
                    postCssUrl({
                        url: async (asset) => {
                            const mimetype = mimetypes.lookup(
                                path.extname(asset.relativePath)
                            );
                            if (library) {
                                const p = path.join(
                                    path.dirname(filename),
                                    asset.relativePath
                                );
                                return `data:${mimetype};base64,${await streamToString(
                                    await this.libraryStorage.getFileStream(
                                        library,
                                        p
                                    ),
                                    'base64'
                                )}`;
                            }
                            if (editor || core) {
                                return `data:${mimetype};base64,${await fsExtra.readFile(
                                    path.resolve(basePath, asset.relativePath),
                                    'base64'
                                )}`;
                            }
                        }
                    }),
                    postCssClean()
                ).process(text, {
                    from: filename
                });
                styleTexts[style] = processedResult.css;
            }

            const params = JSON.parse(
                model.integration.contents[`cid-${model.contentId}`].jsonContent
            );
            const mainLibrary =
                model.integration.contents[`cid-${model.contentId}`].library;

            const scanner = new ContentFileScanner(
                new LibraryManager(this.libraryStorage)
            );
            const contentFiles = await scanner.scanForFiles(
                params,
                LibraryName.fromUberName(mainLibrary, { useWhitespace: true })
            );
            for (const fileRef of contentFiles) {
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
            }
            model.integration.contents[
                `cid-${model.contentId}`
            ].jsonContent = JSON.stringify(params);

            model.integration.contents[`cid-${model.contentId}`].contentUrl =
                '.';
            model.integration.contents[`cid-${model.contentId}`].url = '.';

            return `<!doctype html>
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
        </script>                
        <script>
        ${
            fullScripts
            // The H5P core client creates paths to resource files using the
            // hostname of the current URL, so we have to make sure data: URLs
            // work.
        }
        </script>
        <script>
            const realH5PGetPath = H5P.getPath;
            H5P.getPath = function (path, contentId) {
                if(path.startsWith('data:')){
                    return path;
                }
                else {
                    return realH5PGetPath(path, contentId);
                }
            };
        </script>
        <style>
            ${(
                await Promise.all(
                    model.styles.map((style) => styleTexts[style])
                )
            ).join('\n')}
        </style>
        </head>
        <body>
            <div class="h5p-content lag" data-content-id="${
                model.contentId
            }"></div>                
        </body>
        </html>`;
        });
    }

    private player: H5PPlayer;

    public async export(contentId: ContentId, user: IUser): Promise<string> {
        return this.player.render(contentId, undefined, undefined, user);
    }

    private async getLibraryFileAsText(
        file: string
    ): Promise<{
        core?: boolean;
        editor?: boolean;
        filename: string;
        library?: ILibraryName;
        text: string;
    }> {
        const libraryFileMatch = new RegExp(
            `^${this.config.baseUrl}${this.config.librariesUrl}/([\\w\\.]+)-(\\d+)\\.(\\d+)\\/(.+)$`
        ).exec(file);
        if (!libraryFileMatch) {
            const coreSuffix = `${this.config.baseUrl + this.config.coreUrl}/`;
            if (file.startsWith(coreSuffix)) {
                const filename = file.substr(coreSuffix.length);
                const coreFile = await fsExtra.readFile(
                    path.resolve(this.coreFilePath, filename)
                );
                return { text: coreFile.toString(), core: true, filename };
            }
            const editorSuffix = `${
                this.config.baseUrl + this.config.editorLibraryUrl
            }/`;
            if (file.startsWith(editorSuffix)) {
                const filename = file.substr(editorSuffix.length);
                const coreFile = await fsExtra.readFile(
                    path.resolve(this.editorFilePath, filename)
                );
                return { text: coreFile.toString(), editor: true, filename };
            }
        } else {
            const library = {
                machineName: libraryFileMatch[1],
                majorVersion: Number.parseInt(libraryFileMatch[2], 10),
                minorVersion: Number.parseInt(libraryFileMatch[3], 10)
            };
            const filename = libraryFileMatch[4];
            const readable = await this.libraryStorage.getFileStream(
                library,
                filename
            );
            return { text: await streamToString(readable), library, filename };
        }
    }
}

/*
url(https://somewebsite.com/path/to/font.woff)
url(path/to/font.woff)
url(path/to/font.woff?123#2) format("woff")
url('path/to/font.woff#23')
url(path/to/svgfont.svg#example)

local(font), url(path/to/font.svg) format("svg"),
url(path/to/font.woff) format("woff"),
url(path/to/font.otf) format("opentype");

url('fontawesome-webfont.eot?#iefix&v=4.5.0') format('embedded-opentype'),url('fontawesome-webfont.woff2?v=4.5.0') format('woff2'),url('fontawesome-webfont.woff?v=4.5.0') format('woff'),url('fontawesome-webfont.ttf?v=4.5.0') format('truetype'),url('fontawesome-webfont.svg?v=4.5.0#fontawesomeregular') format('svg')
*/
