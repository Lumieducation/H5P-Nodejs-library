module.exports = {
    extends: ['../../.eslintrc.js'],
    parserOptions: {
        project: ['tsconfig.client.json', 'tsconfig.server.json'],
        sourceType: 'module',
        tsconfigRootDir: __dirname
    },
    rules: {
        'no-console': 0
    }
};
