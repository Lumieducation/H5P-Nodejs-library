const path = require('path');

module.exports = {
    env: {
        browser: true,
        node: true
    },
    root: true,
    extends: [
        //'eslint:recommended',
        //'plugin:@typescript-eslint/recommended',
        'airbnb-typescript',
        'prettier'
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: path.join(__dirname, 'tsconfig.json'),
        sourceType: 'module'
    },
    plugins: ['prettier', '@typescript-eslint', 'import', 'react'],
    rules: {
        'no-script-url': 0,
        'no-restricted-syntax': 0,
        '@typescript-eslint/lines-between-class-members': 0,
        'no-await-in-loop': 1,
        '@typescript-eslint/no-loop-func': 0,
        'no-return-assign': 1,
        'import/prefer-default-export': 0, // TODO: change to 1 later
        '@typescript-eslint/no-unused-vars': 1,
        'class-methods-use-this': 1,
        'no-param-reassign': 1,
        'no-nested-ternary': 1,
        'no-continue': 0,
        'no-case-declarations': 0,
        'prettier/prettier': 'error',
        '@typescript-eslint/typedef': [
            'error',
            {
                parameter: true,
                propertyDeclaration: true,
                memberVariableDeclaration: true,
                variableDeclarationIgnoreFunction: true
            }
        ],
        '@typescript-eslint/explicit-module-boundary-types': [
            'error',
            {
                allowArgumentsExplicitlyTypedAsAny: true,
                allowHigherOrderFunctions: true,
                allowTypedFunctionExpressions: true
            }
        ],
        '@typescript-eslint/explicit-function-return-type': [
            'error',
            {
                allowExpressions: true
            }
        ],
        '@typescript-eslint/member-ordering': [
            'error',
            {
                default: [
                    'public-constructor',
                    'private-constructor',
                    'public-static-field',
                    'private-static-field',
                    'public-instance-field',
                    'private-instance-field',
                    'public-static-method',
                    'private-static-method',
                    'public-instance-method',
                    'private-instance-method'
                ]
            }
        ],
        'class-methods-use-this': 0
    },
    settings: {
        react: {
            version: '17.0'
        }
    }
};
