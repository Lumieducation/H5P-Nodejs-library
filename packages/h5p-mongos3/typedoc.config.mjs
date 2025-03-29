/** @type {Partial<import("typedoc").TypeDocOptions>} */
const config = {
    entryPoints: ["./src/index.ts"],
    projectDocuments: [
        "docs/*.md"
    ],
    alwaysCreateEntryPointModule: false,
    out: "doc",
    externalPattern: [
        "**/node_modules/**", "**/packages/!(h5p-mongos3)/**"
    ],
};

export default config;
