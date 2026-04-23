import { defineConfig, loadEnv } from "vite";
import { nitroV2Plugin } from "@solidjs/vite-plugin-nitro-2";
import { solidStart } from "@solidjs/start/config";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const port = parseInt(process.env.PORT || env.PORT || "3000");

  return {
    server: {
      port,
      strictPort: true,
      host: true,
      allowedHosts: [
        'ngepos.onrender.com',
        'ngepos-*.onrender.com',
        '*.vercel.app',
        'localhost',
        '127.0.0.1'
      ],
    },
    preview: {
      port,
      strictPort: true,
      host: true,
      allowedHosts: [
        'ngepos.onrender.com',
        'ngepos-*.onrender.com',
        '*.vercel.app',
        'localhost',
        '127.0.0.1'
      ],
    },
    plugins: [
      solidStart({
        ssr: false
      }),
      nitroV2Plugin({
        preset: process.env.NITRO_PRESET || (process.env.VERCEL ? "vercel" : process.env.CF_PAGES ? "cloudflare-pages" : "node-server"),
        baseURL: '/',
        noPublicDir: false,
        prerender: {
          crawlLinks: false
        },
        externals: {
          inline: []
        }
      }),
    ],
  };
});