import fs from 'fs';
import path from 'path';

import PackageImporter from '../src/PackageImporter';

const contentPath = `${path.resolve('')}/test/data/hub-content`;
const extractedContentPath = `${path.resolve(
    ''
)}/test/data/hub-content-extracted/`;

fs.readdir(contentPath, (fsError, files) => {
    Promise.all(
        files.map(file => {
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
    );
});
