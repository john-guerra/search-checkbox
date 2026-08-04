import globals from "globals";
import pluginJs from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  pluginJs.configs.recommended,
  eslintConfigPrettier,
  {
    // Specs reach into the page via page.evaluate(), where the UMD bundle's
    // global is in scope even though the Node-side lint pass cannot see it.
    files: ["e2e/**/*.js"],
    languageOptions: { globals: { SearchCheckbox: "readonly" } },
  },
  {
    ignores: ["dist/", "node_modules/", "playwright-report/", "test-results/"],
  },
];
