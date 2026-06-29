

/// <reference path="./vite-env.d.ts" />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "fs";
import { createRequire } from "module";
const _require = createRequire(import.meta.url);
const pkg = _require("./package.json") as { version: string };


import { sentryVitePlugin } from "@sentry/vite-plugin";

/** Build-time version for cache busting: new deploy = new version, so clients reload. */
function versionPlugin() {
  const version = process.env.VITE_APP_VERSION || new Date().toISOString();
  let outDir: string = path.resolve(process.cwd(), "dist");

  return {
    name: "version-file",
    config() {
      return {
        define: {
          "import.meta.env.VITE_APP_VERSION": JSON.stringify(version),
          __APP_VERSION__: JSON.stringify(pkg.version),
        },
      };
    },
    configResolved(config: { root: string; build: { outDir: string } }) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    writeBundle() {
      const file = path.join(outDir, "version.json");
      fs.writeFileSync(file, JSON.stringify({ version }));
    },
  };
}


export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const isProd = mode === "production";

  return {
    // Frontend lives in /client
    root: "client",
    publicDir: path.resolve(__dirname, "client/public"),

    plugins: [
      react(),
      tailwindcss(),
      versionPlugin(),
      sentryVitePlugin({
      org: "pratham-international",
      project: "Pratham International",
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
    ],

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "client/src"),
      },
    },

    // Build output: /client/dist
    build: {
      outDir: "../dist",
      emptyOutDir: true,
      sourcemap: !isProd,
    },

    // Dev server only (ignored in prod)
    server: {
      host: "0.0.0.0",
      port: 5172,

      proxy: {
        "/api": {
          target: env.VITE_API_URL,
          changeOrigin: true,
          secure: false,
        },
        "/socket.io": {
          target: env.VITE_API_URL,
          changeOrigin: true,
          ws: true,
          secure: false,
        },
      },
    },

    // Preview only (local testing)
    preview: {
      host: "0.0.0.0",
      port: 4173,
    },
  };
});
