import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import prettier from "eslint-plugin-prettier";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";

const browserFiles = {
  files: ["**/*.{ts,tsx}"],
  ignores: ["src/server/**/*", "dist/**", "node_modules/**", "*.config.*", "drizzle/**", ".qoder/**", "plans/**", ".github/**"],
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      project: "tsconfig.json",
    },
    globals: {
      ...globals.browser,
      ...globals.es2021,
      console: "readonly",
      setTimeout: "readonly",
      setInterval: "readonly",
      localStorage: "readonly",
      sessionStorage: "readonly",
      window: "readonly",
      document: "readonly",
      navigator: "readonly",
      fetch: "readonly",
      Promise: "readonly",
      FormData: "readonly",
      Blob: "readonly",
      URL: "readonly",
      URLSearchParams: "readonly",
      HTMLElement: "readonly",
      HTMLInputElement: "readonly",
      CustomEvent: "readonly",
      Event: "readonly",
      KeyboardEvent: "readonly",
      MouseEvent: "readonly",
      SubmitEvent: "readonly",
      Buffer: "readonly",
      process: "readonly",
    },
  },
  plugins: {
    "@typescript-eslint": tsPlugin,
  },
  rules: {
    ...tsPlugin.configs.recommended.rules,
    ...eslintConfigPrettier.rules,
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-floating-promises": "warn",
    "no-console": "off",
  },
};

const serverFiles = {
  files: ["src/server/**/*.ts"],
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      project: "tsconfig.json",
    },
    globals: {
      ...globals.node,
      console: "readonly",
    },
  },
  plugins: {
    "@typescript-eslint": tsPlugin,
  },
  rules: {
    ...tsPlugin.configs.recommended.rules,
    ...eslintConfigPrettier.rules,
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-floating-promises": "warn",
    "no-console": "off",
  },
};

export default [js.configs.recommended, browserFiles, serverFiles];