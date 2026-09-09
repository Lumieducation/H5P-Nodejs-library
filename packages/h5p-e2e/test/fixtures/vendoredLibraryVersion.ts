import path from 'path';
import yauzl from 'yauzl-promise';

const vendoredContentDir = path.join(__dirname, '../data/vendored-content');

export interface ILibraryVersion {
    major: number;
    minor: number;
    patch: number;
}

/**
 * Reads a vendored `test/data/vendored-content/<machineName>.h5p` package
 * and returns the main library's exact version, taken straight from the
 * package's own `h5p.json` (major/minor) and its bundled `library.json`
 * (patch) rather than being hard-coded in the specs that need it. Since the
 * package itself is a committed fixture (see A2/A3 in the project's E2E
 * README section), the version this returns cannot drift out from under a
 * test the way a version copy-pasted from an upstream download could.
 *
 * @param machineName e.g. `H5P.Blanks`.
 */
export async function readVendoredLibraryVersion(
    machineName: string
): Promise<ILibraryVersion> {
    const filePath = path.join(vendoredContentDir, `${machineName}.h5p`);
    const zip = await yauzl.open(filePath);
    try {
        let h5pJson:
            | { majorVersion: number | string; minorVersion: number | string }
            | undefined;
        let libraryJson: { patchVersion: number } | undefined;
        const libraryJsonPattern = new RegExp(
            `^${machineName}-(\\d+)\\.(\\d+)/library\\.json$`
        );

        for await (const entry of zip) {
            if (entry.filename === 'h5p.json') {
                const readable = await entry.openReadStream();
                const chunks: Buffer[] = [];
                for await (const chunk of readable) {
                    chunks.push(chunk as Buffer);
                }
                h5pJson = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
            } else if (libraryJsonPattern.test(entry.filename)) {
                const readable = await entry.openReadStream();
                const chunks: Buffer[] = [];
                for await (const chunk of readable) {
                    chunks.push(chunk as Buffer);
                }
                libraryJson = JSON.parse(
                    Buffer.concat(chunks).toString('utf-8')
                );
            }
        }

        if (!h5pJson || !libraryJson) {
            throw new Error(
                `Could not find h5p.json and/or ${machineName}-*/library.json ` +
                    `inside ${filePath}`
            );
        }

        return {
            major: Number(h5pJson.majorVersion),
            minor: Number(h5pJson.minorVersion),
            patch: Number(libraryJson.patchVersion)
        };
    } finally {
        await zip.close();
    }
}
