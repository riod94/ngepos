import { defineConfig } from "vite";
import { nitroV2Plugin as nitro } from "@solidjs/vite-plugin-nitro-2";
import { solidStart } from "@solidjs/start/config";

export default defineConfig({
  plugins: [
    solidStart({
      ssr: false
    }),
    nitro()
  ],
  optimizeDeps: {
    // Pre-bundle dependency utama agar tidak diproses ulang setiap cold start
    // Menambahkan library besar ke sini mencegah reload saat navigasi di dev mode
    include: [
      "dexie",
      "solid-js",
      "solid-js/web",
      "solid-js/store",
      "xlsx",
      "jspdf",
      "jspdf-autotable",
      "chart.js"
    ]
  },
  build: {
    // Target modern browser untuk bundle lebih kecil
    target: "es2020",
    // Minifikasi lebih agresif
    minify: "esbuild",
    // Nonaktifkan sourcemap untuk menghilangkan peringatan jspdf/html5-qrcode yang rusak
    sourcemap: false,
  },
  server: {
    host: true, // Listen on all interfaces for nginx proxy
    port: 5173,
    fs: {
      allow: [".."]
    }
  },
  preview: {
    port: 3000,
  }
});

