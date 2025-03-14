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
        'docs/advanced/advanced.md',
        'docs/development/development.md'
    ],
    categoryOrder: ['Guides', 'Contributing', 'Packages'],
    out: 'typedoc',
    disableSources: true,
    excludePrivate: true,
    defaultCategory: 'Packages',
    name: 'H5P NodeJS Library'
};

export default config;
