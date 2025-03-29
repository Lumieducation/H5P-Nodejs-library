/** @type {Partial<import("typedoc").TypeDocOptions>} */
const config = {
    entryPoints: ["./src/ClamAVScanner.ts"],
    out: "doc",
    externalPattern: [
        "**/node_modules/**", "**/packages/!(h5p-clamav-scanner)/**"
    ],
};

export default config;
