import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettierConfig from 'eslint-config-prettier/flat';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  // 1. Global ignores
  globalIgnores([
    '**/node_modules/**',
    'apps/web/.next/**',
    'apps/web/out/**',
    'apps/web/next-env.d.ts',
    'apps/api/dist/**',
    '**/build/**',
  ]),

  // 2. Base configs — all files
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // 3. Import sorting — all files
  {
    files: ['**/*.{js,mjs,cjs,jsx,ts,tsx}'],
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },

  // 4. NestJS backend — apps/api only
  {
    files: ['apps/api/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-empty-object-type': [
        'error',
        { allowInterfaces: 'with-single-extends' },
      ],
    },
  },

  // 5. Next.js frontend — apps/web only
  // `extends` inside a config object scopes the entire array to `files`
  {
    files: ['apps/web/**/*.{js,jsx,ts,tsx}'],
    extends: [nextVitals, nextTs],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    settings: {
      react: { version: 'detect' },
      next: { rootDir: 'apps/web/' },
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
  },

  // 6. Prettier — must be last
  prettierConfig,
]);
