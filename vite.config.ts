import { defineConfig, loadEnv } from "vite";
import { nitroV2Plugin } from "@solidjs/vite-plugin-nitro-2";
import { solidStart } from "@solidjs/start/config";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      solidStart({
        ssr: false
      }),
      nitroV2Plugin(),
    ],
    define: {
      "process.env.DATABASE_URL": JSON.stringify(env.DATABASE_URL),
      "process.env.JWT_SECRET": JSON.stringify(env.JWT_SECRET),
      "process.env.SITE_URL": JSON.stringify(env.SITE_URL),
      "process.env.SMTP_HOST": JSON.stringify(env.SMTP_HOST),
      "process.env.SMTP_PORT": JSON.stringify(env.SMTP_PORT),
      "process.env.SMTP_USER": JSON.stringify(env.SMTP_USER),
      "process.env.SMTP_PASS": JSON.stringify(env.SMTP_PASS),
      "process.env.SMTP_FROM": JSON.stringify(env.SMTP_FROM),
    },
  };
});