/** @type {Partial<import("typedoc").TypeDocOptions>} */
const config = {
    entryPoints: ["./src/index.ts"],
    out: "doc",
    compilerOptions: {
        resolveJsonModule: true,
    },
    externalPattern: [
        "**/node_modules/**", "**/packages/!(h5p-react)/**"
    ],
    highlightLanguages: ["jsx", "javascript", "shellscript", "typescript"],
};

export default config;
