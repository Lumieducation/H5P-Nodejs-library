/** @type {Partial<import("typedoc").TypeDocOptions>} */
const config = {
    entryPoints: ["./src/index.ts"],
    projectDocuments: [
        "README.md",
        "docs/*.md"
    ],
    out: "doc",
};

export default config;
