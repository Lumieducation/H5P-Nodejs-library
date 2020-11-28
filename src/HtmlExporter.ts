import fsExtra from 'fs-extra';
import path from 'path';

import H5PPlayer from './H5PPlayer';
import { streamToString } from './helpers/StreamHelpers';
import {
    ContentId,
    IContentStorage,
    IH5PConfig,
    ILibraryStorage
} from './types';

export class HtmlExporter {
    /**
     *
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
        this.player.setRenderer(async (model) => {
            const scriptTexts = {};
            for (const script of model.scripts) {
                let text = await this.getLibraryFileAsText(script);
                text = text.replace(/<\/script>/g, '<\\/script>');
                scriptTexts[script] = text;
            }

            const styleTexts = {};
            for (const style of model.styles) {
                styleTexts[style] = await this.getLibraryFileAsText(style);
            }

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
        ${(
            await Promise.all(
                model.scripts.map(
                    (script) => `<script>${scriptTexts[script]}</script>`
                )
            )
        ).join('\n')}
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

    public async export(contentId: ContentId): Promise<string> {
        return this.player.render(contentId);
    }

    private async getLibraryFileAsText(file: string): Promise<string> {
        const libraryFileMatch = new RegExp(
            `^${this.config.baseUrl}${this.config.librariesUrl}/([\\w\\.]+)-(\\d+)\\.(\\d+)\\/(.+)$`
        ).exec(file);
        if (!libraryFileMatch) {
            const coreSuffix = `${this.config.baseUrl + this.config.coreUrl}/`;
            if (file.startsWith(coreSuffix)) {
                const coreFile = await fsExtra.readFile(
                    path.resolve(
                        this.coreFilePath,
                        file.substr(coreSuffix.length)
                    )
                );
                return coreFile.toString();
            }
            const editorSuffix = `${
                this.config.baseUrl + this.config.editorLibraryUrl
            }/`;
            if (file.startsWith(editorSuffix)) {
                const coreFile = await fsExtra.readFile(
                    path.resolve(
                        this.editorFilePath,
                        file.substr(editorSuffix.length)
                    )
                );
                return coreFile.toString();
            }
        } else {
            const readable = await this.libraryStorage.getFileStream(
                {
                    machineName: libraryFileMatch[1],
                    majorVersion: Number.parseInt(libraryFileMatch[2], 10),
                    minorVersion: Number.parseInt(libraryFileMatch[3], 10)
                },
                libraryFileMatch[4]
            );
            return streamToString(readable);
        }
    }
}
