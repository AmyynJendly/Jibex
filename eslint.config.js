// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // Build output, generated folders, and the gitignored working folders
    // (reference clone, live-test scripts and screenshots).
    ignores: [
      'dist/*',
      '.expo/*',
      'SynapseDriverApp/*',
      '.playwright-mcp/*',
      'web-tour/*',
      'explore-2/*',
      'test-run*/*',
    ],
  },
  {
    // Tests load each module fresh inside `jest.isolateModules`, which only
    // works with `require()`, and call `jest.mock()` above their imports.
    files: ['__tests__/**', 'jest.setup.ts'],
    rules: { '@typescript-eslint/no-require-imports': 'off', 'import/first': 'off' },
  },
]);
