module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "solid"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended-type-checked",
    "plugin:solid/recommended",
    "plugin:prettier/recommended",
  ],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
    tsconfigRootDir: __dirname,
    project: ["./tsconfig.json"],
    sourceMaps: true,
  },
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  rules: {
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-floating-promises": "error",
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "solid/no-dom-manipulation": "warn",
    "solid/prefer-show": "warn",
    "solid/self-closing-comp": "warn",
  },
  ignorePatterns: [
    "dist",
    "node_modules",
    ".github",
    "*.config.*",
    "drizzle/meta",
    ".qoder",
    "plans",
  ],
};
