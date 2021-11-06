module.exports = {
    env: {
        browser: true
    },
    root: true,
    extends: ['react-app', 'prettier'],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: 'tsconfig.build.json',
        sourceType: 'module'
    },
    plugins: ['prettier', '@typescript-eslint']
};
