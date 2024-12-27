import eslintJs from '@eslint/js';
import eslintJsdoc from 'eslint-plugin-jsdoc';
import eslintNode from 'eslint-plugin-n';
import eslintTs from 'typescript-eslint';
import globals from 'globals';
import parserTs from '@typescript-eslint/parser';
import stylisticJs from '@stylistic/eslint-plugin';

/** @type {import('eslint').Linter.Config[]} */
export default [
  eslintJs.configs['recommended'],
  eslintJsdoc.configs['flat/recommended'],
  eslintNode.configs['flat/recommended'],
  ...eslintTs.configs['recommended'],
  stylisticJs.configs['recommended-flat'],
  {
    files: [
      '**/*.{js,mjs,cjs,ts}',
    ],
  },
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '*.config.{js,mjs,cjs,ts}',
    ],
  },
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parser: parserTs.parser,
      parserOptions: {
        ecmaVersion: 2024,
        project: 'tsconfig.json',
        sourceType: 'module',
      },
    },
  },
  {
    plugins: {
      'eslint-plugin-jsdoc': eslintJsdoc,
      'eslint-plugin-n': eslintNode,
      '@stylistic/eslint-plugin': stylisticJs,
      '@typescript-eslint/parser': eslintTs,
    },
  },
  {
    rules: {
      '@stylistic/member-delimiter-style': 'off',
      '@stylistic/semi': ['error', 'always'],
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-unused-expressions': ['error', {
        'allowShortCircuit': true,
        'allowTernary': true,
      }],
      '@typescript-eslint/no-unused-vars': 'error',
      'eslint-plugin-jsdoc/require-jsdoc': ['warn', {
        'require': {
          'ClassDeclaration': true,
          'MethodDefinition': true,
        },
      }],
      'n/no-missing-import': 'off',
      'curly': ['error', 'multi-line', 'consistent'],
      'max-nested-callbacks': ['error', { 'max': 4 }],
      'no-console': 'off',
      'no-inline-comments': 'error',
      'no-lonely-if': 'error',
      'no-undef': 'warn',
      'no-unused-vars': 'off',
      'sort-imports': 'warn',
      'yoda': 'error',
    },
  },
];