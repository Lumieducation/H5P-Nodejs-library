module.exports = {
    extends: ['../../.eslintrc.js'],
    parserOptions: {
        project: 'tsconfig.build.json',
        sourceType: 'module'
    },
    rules: {
        'no-console': 0
    }
};
