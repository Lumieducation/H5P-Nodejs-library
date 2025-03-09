/** @type {Partial<import("typedoc").TypeDocOptions>} */
const config = {
    entryPoints: ["./src/index.ts"],
    out: "doc",
    compilerOptions: {
        resolveJsonModule: true,
    }
};

export default config;
