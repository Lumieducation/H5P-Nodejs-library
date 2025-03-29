/** @type {Partial<import("typedoc").TypeDocOptions>} */
const config = {
    entryPoints: ["./src/SvgSanitizer.ts"],
    out: "doc",
    externalPattern: [
        "**/node_modules/**", "**/packages/!(h5p-svg-sanitizer)/**"
    ],
};

export default config;
