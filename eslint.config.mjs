import babelParser from '@babel/eslint-parser';
import syntaxTypescript from '@babel/plugin-syntax-typescript';
import eslint from '@eslint/js';
import next from '@next/eslint-plugin-next';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

const nextRecommendedRules = Object.fromEntries(
  Object.entries(next.configs.recommended.rules).map(([rule, severity]) => [
    rule,
    severity === 'warn' ? 'error' : severity,
  ]),
);

export default [
  {
    ignores: ['.next/**', 'dist/**', 'node_modules/**', 'out/**', 'next-env.d.ts'],
  },
  eslint.configs.recommended,
  {
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx}'],
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          babelrc: false,
          configFile: false,
          plugins: [[syntaxTypescript, { isTSX: true }]],
        },
      },
    },
    plugins: {
      '@next/next': next,
      react,
      'react-hooks': reactHooks,
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat['jsx-runtime'].rules,
      ...reactHooks.configs.flat.recommended.rules,
      ...nextRecommendedRules,
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // Babel parses TypeScript syntax but has no TypeScript-aware scope manager.
      'no-undef': 'off',
      'no-unused-vars': 'off',
    },
  },
  {
    files: ['src/scripts/**/*.mjs'],
    languageOptions: {
      // Node.js globals for the dev companion scripts.
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        URL: 'readonly',
      },
    },
  },
];
