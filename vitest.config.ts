/// <reference types="vitest" />
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [solid()],
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", "dist", ".github"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules",
        "dist",
        ".github",
        "*.config.*",
        "**/*.d.ts",
        "**/*.db.ts",
        "**/db.ts",
        "**/seed.ts",
        "**/mock*.ts",
        "**/migrations/**",
        "**/meta/**",
      ],
      thresholds: {
        lines: 10,
        functions: 20,
        branches: 10,
        statements: 10,
      },
    },
    setupFiles: ["./tests/setup.ts"],
    reporters: ["default", "verbose"],
    outputFile: {
      json: "./tests/output/test-results.json",
    },
    mockReset: true,
  },
  resolve: {
    alias: {
      "~": "/src",
    },
  },
});
