/** @type {Partial<import("typedoc").TypeDocOptions>} */
const config = {
    entryPoints: ["./src/index.ts"],
    projectDocuments: [
        "docs/*.md"
    ],
    alwaysCreateEntryPointModule: false,
    out: "doc",
};

export default config;
