/** @type {Partial<import("typedoc").TypeDocOptions>} */
const config = {
    entryPoints: ["./src/HtmlExporter.ts"],
    out: "doc",
    externalPattern: [
        "**/node_modules/**", "**/packages/!(h5p-html-exporter)/**"
    ],
};

export default config;
