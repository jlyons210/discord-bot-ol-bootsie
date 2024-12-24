import eslintJs from '@eslint/js';
import eslintJsdoc from 'eslint-plugin-jsdoc';
import eslintNode from 'eslint-plugin-n';
import eslintTs from 'typescript-eslint';
import globals from 'globals';
import parserTs from '@typescript-eslint/typescript-estree';

/** @type {import('eslint').Linter.Config[]} */
export default [
  eslintJs.configs.recommended,
  eslintJsdoc.configs['flat/recommended'],
  eslintNode.configs['flat/recommended'],
  ...eslintTs.configs.recommended,
  {
    files: [
      '**/*.{js,mjs,cjs,ts}',
    ],
    ignores: [
      'dist/**',
      'node_modules/**',
    ],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parser: parserTs.parser,
      parserOptions: {
        ecmaVersion: 2024,
        sourceType: 'module',
      },
    },
    plugins: {
      typescript: eslintTs,
      jsdoc: eslintJsdoc,
      node: eslintNode,
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'warn',
      'jsdoc/require-jsdoc': ['warn', {
        'require': {
          'ClassDeclaration': true,
          'MethodDefinition': true,
        },
      }],
      'arrow-spacing': ['warn', { 'before': true, 'after': true }],
      'brace-style': ['error', 'stroustrup', { 'allowSingleLine': true }],
      'comma-dangle': ['error', 'always-multiline'],
      'comma-spacing': 'error',
      'comma-style': 'error',
      'curly': ['error', 'multi-line', 'consistent'],
      'dot-location': ['error', 'property'],
      'indent': ['error', 2, { 'SwitchCase': 1 }],
      'keyword-spacing': 'error',
      'max-nested-callbacks': ['error', { 'max': 4 }],
      'max-statements-per-line': ['error', { 'max': 2 }],
      'no-console': 'off',
      'no-floating-decimal': 'error',
      'no-inline-comments': 'error',
      'no-lonely-if': 'error',
      'no-multi-spaces': 'error',
      'no-multiple-empty-lines': ['error', { 'max': 2, 'maxEOF': 1, 'maxBOF': 0 }],
      'no-trailing-spaces': ['error'],
      'no-undef': 'warn',
      'no-unused-vars': 'warn',
      'object-curly-spacing': ['error', 'always'],
      'quotes': ['error', 'single'],
      'sort-imports': 'warn',
      'space-before-blocks': 'error',
      'space-before-function-paren': ['error', {
        'anonymous': 'never',
        'named': 'never',
        'asyncArrow': 'always',
      }],
      'space-in-parens': 'error',
      'space-infix-ops': 'error',
      'space-unary-ops': 'error',
      'spaced-comment': 'error',
      'yoda': 'error',
    },
  },
];