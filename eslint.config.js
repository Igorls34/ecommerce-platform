const js = require('@eslint/js');
const prettier = require('eslint-config-prettier');
const importPlugin = require('eslint-plugin-import');
const jsxA11y = require('eslint-plugin-jsx-a11y');
const react = require('eslint-plugin-react');
const reactHooks = require('eslint-plugin-react-hooks');
const simpleImportSort = require('eslint-plugin-simple-import-sort');
const unusedImports = require('eslint-plugin-unused-imports');
const globals = require('globals');
const tseslint = require('typescript-eslint');

const commonPlugins = {
  import: importPlugin,
  'simple-import-sort': simpleImportSort,
  'unused-imports': unusedImports,
};

const commonRules = {
  'import/first': 'error',
  'import/newline-after-import': 'error',
  'import/no-duplicates': 'error',
  'no-console': 'off',
  'no-unused-vars': 'off',
  'simple-import-sort/exports': 'warn',
  'simple-import-sort/imports': 'warn',
  'unused-imports/no-unused-imports': 'warn',
  'unused-imports/no-unused-vars': [
    'warn',
    {
      args: 'after-used',
      argsIgnorePattern: '^_',
      vars: 'all',
      varsIgnorePattern: '^_',
    },
  ],
};

module.exports = [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.vite/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '**/backend/prisma/*.ts',
      '**/backend/prisma/migrations/**',
      '**/package-lock.json',
      '**/.env',
      '**/.env.*',
      'frontend-admin/src/pages/**/*.html',
      'frontend-store/public/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,cjs,mjs,jsx,ts,tsx}'],
    plugins: commonPlugins,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2022,
        ...globals.node,
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: commonRules,
  },
  {
    files: ['**/*.{js,cjs,mjs,jsx}'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    files: ['backend/**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    files: ['scripts/**/*.js'],
    rules: {
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },
  {
    files: ['frontend-admin/src/pages/*.js'],
    languageOptions: {
      globals: {
        createProduct: 'readonly',
        deleteProduct: 'readonly',
        getProductById: 'readonly',
        getProducts: 'readonly',
        logoutAdmin: 'readonly',
        requireAdminAuth: 'readonly',
        updateProduct: 'readonly',
        uploadProductImage: 'readonly',
      },
    },
  },
  {
    files: ['frontend-admin/src/**/*.{js,jsx}', 'frontend-store/src/**/*.{js,jsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...jsxA11y.configs.recommended.rules,
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react/prop-types': 'off',
    },
  },
  {
    files: ['**/*.test.{js,jsx,ts,tsx}', '**/tests/**/*.{js,jsx,ts,tsx}', 'e2e/**/*.{js,ts}'],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  prettier,
];
