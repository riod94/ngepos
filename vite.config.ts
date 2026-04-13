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
    include: ["dexie"]
  },
  server: {
    host: true, // Listen on all interfaces for nginx proxy
    fs: {
      allow: [".."]
    }
  }
});
