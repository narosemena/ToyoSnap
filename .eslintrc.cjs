/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  plugins: ["@typescript-eslint", "security"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:security/recommended-legacy",
  ],
  env: {
    browser: true,
    es2022: true,
    webextensions: true,
  },
  rules: {
    // Unused vars: allow underscore-prefixed parameters
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    // Explicit any is common at extension/DOM boundaries
    "@typescript-eslint/no-explicit-any": "warn",
    // security/detect-object-injection fires on every bracket-notation access;
    // too noisy for intentional dynamic property reads in this codebase
    "security/detect-object-injection": "off",
  },
  ignorePatterns: ["dist/", "node_modules/", ".worktrees/"],
};
