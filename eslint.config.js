/**
 * Flat ESLint config (ESLint 9+). Keep this small — the bar is "catch obvious
 * footguns", not enforce a style.
 */

import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**', '.nexus-agents/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { console: 'readonly', process: 'readonly' },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // We intentionally use Record<string, unknown> for config bags everywhere.
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    files: ['src/**/__tests__/**/*.ts'],
    rules: {
      // Test files reach into globals and may declare throwaway helpers.
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
);
