import { defineConfig } from "vite";
import { nitroV2Plugin as nitro } from "@solidjs/vite-plugin-nitro-2";
import { solidStart } from "@solidjs/start/config";

export default defineConfig({
  plugins: [
    solidStart({
      ssr: false,
    }),
    nitro()
  ],
  optimizeDeps: {
    include: [
      "dexie",
      "solid-js",
      "solid-js/web",
      "solid-js/store",
      "xlsx",
      "jspdf",
      "jspdf-autotable",
      "chart.js"
    ],
    exclude: [
      "@solidjs/router"
    ]
  },
  build: {
    target: "es2020",
    minify: "esbuild",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules")) {
            if (id.includes("chart.js")) return "vendor-charts";
            if (id.includes("jspdf") || id.includes("jspdf-autotable")) return "vendor-pdf";
            if (id.includes("xlsx")) return "vendor-xlsx";
            if (id.includes("dexie")) return "vendor-dexie";
          }
        },
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js",
        assetFileNames: "assets/[ext]/[name]-[hash].[ext]"
      }
    },
    chunkSizeWarningLimit: 500,
    reportCompressedSize: true
  },
  server: {
    host: true,
    port: 5173,
    fs: {
      allow: [".."]
    }
  },
  preview: {
    port: 3000,
  }
});
