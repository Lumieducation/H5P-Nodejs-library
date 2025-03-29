/** @type {Partial<import("typedoc").TypeDocOptions>} */
const config = {
    entryPoints: ["./src/SharedStateServer.ts"],
    out: "doc",
    externalPattern: [
        "**/node_modules/**", "**/packages/!(h5p-shared-state-server)/**"
    ],
};

export default config;
