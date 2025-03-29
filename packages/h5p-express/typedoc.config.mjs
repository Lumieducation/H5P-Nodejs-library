/** @type {Partial<import("typedoc").TypeDocOptions>} */
const config = {
    entryPoints: ["./src/index.ts"],
    out: "doc",
    externalPattern: [
        "**/node_modules/**", "**/packages/!(h5p-express)/**"
    ],
};

export default config;
