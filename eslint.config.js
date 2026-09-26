// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // Build output and generated / unrelated folders.
    ignores: ["dist/*", ".expo/*", "SynapseDriverApp/*", ".playwright-mcp/*"],
  },
  {
    // Tests load each module fresh inside `jest.isolateModules`, which only
    // works with `require()`.
    files: ["__tests__/**", "jest.setup.ts"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
]);
