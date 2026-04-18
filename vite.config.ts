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
        manualChunks: {
          "vendor-solid": ["solid-js", "solid-js/web", "solid-js/store"],
          "vendor-charts": ["chart.js"],
          "vendor-pdf": ["jspdf", "jspdf-autotable"],
          "vendor-xlsx": ["xlsx"],
          "vendor-dexie": ["dexie"]
        },
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js",
        assetFileNames: "assets/[ext]/[name]-[hash].[ext]"
      }
    },
    chunkSizeWarningLimit: 500,
    reportCompressedSize: true,
    treeshake: {
      moduleSideEffects: false,
      propertyReadSideEffects: false
    }
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
