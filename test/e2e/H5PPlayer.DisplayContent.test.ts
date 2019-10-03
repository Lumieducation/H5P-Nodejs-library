import express from 'express';
import fs from 'fs';
import path from 'path';
import promiseQueue from 'promise-queue';
import puppeteer from 'puppeteer';

import H5PPlayer from '../../src/H5PPlayer';

import PackageImporter from '../../src/PackageImporter';

const contentPath = `${path.resolve('')}/test/data/hub-content`;
const extractedContentPath = `${path.resolve(
    ''
)}/test/data/hub-content-extracted/`;

fs.readdir(contentPath, (error, files) => {
    Promise.all(
        files.map(file => {
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
            const libraryLoader = (lib, maj, min) =>
                Promise.resolve(
                    require(`${dir}/${lib}-${maj}.${min}/library.json`)
                );
            const h5pObject = require(`${dir}/h5p.json`);
            const contentObject = require(`${dir}/content/content.json`);
            return new H5PPlayer(
                libraryLoader as any,
                undefined,
                undefined,
                undefined
            )
                .render(name, contentObject, h5pObject)
                .then(h5pPage => res.end(h5pPage))
                .catch(error => res.status(500).end(error.message));
        });
        server.use((error, req, res, next) => {
            if (error) {
                console.log(error);
                process.exit(1);
            }
        });
        server.listen(8080, () => {
            console.log(`server running on http://localhost: ${8080}`);
            puppeteer.launch({ devtools: true }).then(browser => {
                fs.readdir(extractedContentPath, (error, files) => {
                    files.forEach((file, index) => {
                        queue
                            .add(
                                () =>
                                    new Promise((resolve, reject) => {
                                        browser.newPage().then(page => {
                                            page.on('pageerror', msg => {
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
                                                    waitUntil: 'networkidle0'
                                                }
                                            ).then(() => {
                                                setTimeout(() => {
                                                    page.close();
                                                    console.log(`${file}: OK`);
                                                    resolve();
                                                }, 1000);
                                            });
                                        });
                                    })
                            )
                            .catch(error => {
                                console.log(error);
                                process.exit(1);
                            });
                    });
                });

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
