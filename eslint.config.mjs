import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import eslintConfigPrettier from "eslint-config-prettier";

/** @type {import('eslint').Linter.Config[]} */
export default [
    {
        files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    },
    {
        ignores: [
            '**/build/',
            '**/build-ide/',
            '**/coverage/',
            '**/test/data/',
            'scripts/',
            'packages/h5p-examples/h5p/',
            'packages/h5p-examples/public/',
            'packages/h5p-rest-example-server/h5p/',
            '**/node_modules/',
            '**/*.d.ts',
            '**/*.config.js',
            'packages/h5p-html-exporter/src/**/*.js',
            'packages/h5p-examples/public']
    },
    { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
    pluginReact.configs.flat.recommended,
    {
        settings: {
            react: {
                "version": "18"
            }
        }
    },
    eslintConfigPrettier,
    {
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unused-vars": ["warn",
                { "argsIgnorePattern": "^_" }
            ],
            "no-console": "warn",
            "no-await-in-loop": "warn", // TODO : make error later
            "no-param-reassign": "error",
            "react/prop-types": "warn", // TODO : make error later
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

        }
    }
];