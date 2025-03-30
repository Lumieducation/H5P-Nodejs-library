/** @type {Partial<import("typedoc").TypeDocOptions>} */
const config = {
    entryPointStrategy: 'packages',
    entryPoints: [
        "packages/h5p-clamav-scanner",
        "packages/h5p-express",
        "packages/h5p-html-exporter",
        'packages/h5p-mongos3',
        "packages/h5p-react",
        "packages/h5p-redis-lock",
        "packages/h5p-server",
        "packages/h5p-shared-state-server",
        "packages/h5p-svg-sanitizer",
        "packages/h5p-webcomponents"
    ],
    projectDocuments: [
        'docs/README.md',
        'docs/usage/usage.md',
        'docs/examples/examples.md',
        'docs/advanced/advanced.md',
        'docs/development/development.md'
    ],
    categoryOrder: ['Guides', 'Examples', 'Contributing', 'API'],
    out: 'typedoc',
    disableSources: true,
    excludePrivate: true,
    defaultCategory: 'API',
    name: 'H5P NodeJS Library',
    navigationLinks:
    {
        'GitHub': 'https://github.com/lumieducation/h5p-nodejs-library'
    },
    plugin: ["typedoc-plugin-missing-exports", "typedoc-plugin-rename-defaults"],
    packageOptions: {
        excludeExternals: true,
    },
    highlightLanguages: [
        // start default languages
        "bash",
        "console",
        "css",
        "html",
        "javascript",
        "json",
        "jsonc",
        "json5",
        "tsx",
        "typescript",
        // end default languages
        "jsx" // jsx is the only additional language that we need
    ],
};

export default config;
