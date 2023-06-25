const path = require('path');

module.exports = {
    extends: ['../../.eslintrc.js'],
    parserOptions: {
        project: path.join(__dirname, 'tsconfig.build.json'),
        sourceType: 'module'
    },
    rules: {
        'no-console': 0
    }
};
