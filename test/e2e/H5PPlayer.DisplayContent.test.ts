// tslint:disable-next-line: no-implicit-dependencies
import express from 'express';
import fs from 'fs';
import path from 'path';
import promiseQueue from 'promise-queue';
import puppeteer from 'puppeteer';

import H5PPlayer from '../../src/H5PPlayer';
import H5PConfig from '../../src/implementation/H5PConfig';
import PackageImporter from '../../src/PackageImporter';
import { ILibraryName } from '../../src';

const contentPath = `${path.resolve('')}/test/data/hub-content`;
const extractedContentPath = `${path.resolve(
    ''
)}/test/data/hub-content-extracted/`;

// TODO: Replace console.log with logger.

fs.readdir(contentPath, (fsError, files) => {
    Promise.all(
        files.map((file) => {
            // tslint:disable-next-line: no-console
            console.log(`extracting: ${file}`);
            return PackageImporter.extractPackage(
                `${contentPath}/${file}`,
                `${extractedContentPath}/${file}`,
                {
                    includeContent: true,
                    includeLibraries: true,
                    includeMetadata: true
                }
            );
        })
    ).then(() => {
        const server = express();
        const queue = new promiseQueue(3, Infinity);
        server.use('/h5p/core', express.static(`${path.resolve('')}/h5p/core`));
        server.get('/examples/:name', (req, res) => {
            const { name } = req.params;
            const dir = `${extractedContentPath}/${name}`;
            server.use('/h5p/libraries', express.static(dir));
            server.use(
                `/h5p/content/${name}`,
                express.static(`${dir}/content`)
            );

            const mockLibraryStorage: any = {
                getLibrary: async (libName: ILibraryName) => {
                    return require(`${dir}/${libName.machineName}-${libName.majorVersion}.${libName.minorVersion}/library.json`);
                }
            };
            const h5pObject = require(`${dir}/h5p.json`);
            const contentObject = require(`${dir}/content/content.json`);
            return new H5PPlayer(
                mockLibraryStorage,
                undefined,
                new H5PConfig(undefined),
                undefined,
                undefined
            )
                .render(name, contentObject, h5pObject)
                .then((h5pPage) => res.end(h5pPage))
                .catch((error) => res.status(500).end(error.message));
        });
        server.use((error, req, res, next) => {
            if (error) {
                // tslint:disable-next-line: no-console
                console.log(error);
                process.exit(1);
            }
        });
        server.listen(8080, () => {
            // tslint:disable-next-line: no-console
            console.log(`server running on http://localhost: ${8080}`);
            puppeteer.launch({ devtools: true }).then((browser) => {
                fs.readdir(
                    extractedContentPath,
                    (fsExtractedError, extractedFiles) => {
                        extractedFiles.forEach((file, index) => {
                            queue
                                .add(
                                    () =>
                                        new Promise((resolve, reject) => {
                                            browser.newPage().then((page) => {
                                                page.on('pageerror', (msg) => {
                                                    // tslint:disable-next-line: no-console
                                                    console.log(
                                                        `${file}: ERROR`,
                                                        msg
                                                    );
                                                    process.exit(1);
                                                    reject(
                                                        new Error(
                                                            JSON.stringify(file)
                                                        )
                                                    );
                                                });
                                                page.goto(
                                                    `http://localhost:8080/examples/${file}`,
                                                    {
                                                        waitUntil:
                                                            'networkidle0'
                                                    }
                                                ).then(() => {
                                                    setTimeout(() => {
                                                        page.close();
                                                        // tslint:disable-next-line: no-console
                                                        console.log(
                                                            `${file}: OK`
                                                        );
                                                        resolve();
                                                    }, 1000);
                                                });
                                            });
                                        })
                                )
                                .catch((error) => {
                                    // tslint:disable-next-line: no-console
                                    console.log(error);
                                    process.exit(1);
                                });
                        });
                    }
                );

                const interval = setInterval(() => {
                    if (queue.getPendingLength() === 0) {
                        browser.close();
                        clearInterval(interval);
                        process.exit(0);
                    }
                }, 500);
            });
        });
    });
});
