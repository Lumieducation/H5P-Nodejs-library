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
 * bundled `<machineName>-<major>.<minor>/library.json` rather than being
 * hard-coded in the specs that need it. Since the package itself is a
 * committed fixture, the version this returns cannot drift out from under a
 * test the way a version copy-pasted from an upstream download could.
 *
 * The version deliberately comes from `library.json` and not from the
 * package's `h5p.json`: `h5p.json` has no top-level version at all - it
 * carries the main library's major/minor only inside the
 * `preloadedDependencies` entry whose `machineName` matches `mainLibrary`,
 * and as strings rather than numbers. `library.json` states all three
 * components once, as numbers, which is both simpler and the same source
 * the server itself validates against.
 *
 * @param machineName e.g. `H5P.Blanks`.
 */
export async function readVendoredLibraryVersion(
    machineName: string
): Promise<ILibraryVersion> {
    const filePath = path.join(vendoredContentDir, `${machineName}.h5p`);
    const zip = await yauzl.open(filePath);
    try {
        let libraryJson:
            | {
                  majorVersion: number;
                  minorVersion: number;
                  patchVersion: number;
              }
            | undefined;
        // Anchored to the main library's own directory, so the bundled
        // dependencies' library.json files cannot match.
        const libraryJsonPattern = new RegExp(
            `^${machineName}-(\\d+)\\.(\\d+)/library\\.json$`
        );

        for await (const entry of zip) {
            if (libraryJsonPattern.test(entry.filename)) {
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

        if (!libraryJson) {
            throw new Error(
                `Could not find ${machineName}-*/library.json inside ${filePath}`
            );
        }

        const version = {
            major: Number(libraryJson.majorVersion),
            minor: Number(libraryJson.minorVersion),
            patch: Number(libraryJson.patchVersion)
        };
        // Fail loudly here rather than letting a NaN propagate into an
        // ubername like "H5P.Blanks NaN.NaN", which the server rejects with
        // a much less obvious invalid-ubername-pattern error.
        if (
            Number.isNaN(version.major) ||
            Number.isNaN(version.minor) ||
            Number.isNaN(version.patch)
        ) {
            throw new Error(
                `Malformed version in ${machineName}-*/library.json inside ` +
                    `${filePath}: ${JSON.stringify(version)}`
            );
        }
        return version;
    } finally {
        await zip.close();
    }
}
