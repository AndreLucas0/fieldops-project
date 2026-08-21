const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

/** Globais do Jest — evita depender do pacote `globals` só por isto. */
const jestGlobals = {
  jest: 'readonly',
  describe: 'readonly',
  it: 'readonly',
  test: 'readonly',
  expect: 'readonly',
  beforeAll: 'readonly',
  beforeEach: 'readonly',
  afterAll: 'readonly',
  afterEach: 'readonly',
};

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*'],
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', 'jest.setup.js', 'src/test-utils/**'],
    languageOptions: {
      globals: jestGlobals,
    },
    rules: {
      // `jest.mock` precisa ser avaliado antes dos imports do módulo testado,
      // e as fábricas de mock só aceitam `require`.
      '@typescript-eslint/no-require-imports': 'off',
      'import/first': 'off',
    },
  },
]);
