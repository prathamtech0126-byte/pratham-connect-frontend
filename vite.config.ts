// import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react";
// import tailwindcss from "@tailwindcss/vite";
// import path from "path";


// export default defineConfig({
//   root: path.resolve(import.meta.dirname, "client"),
//   plugins: [react(), tailwindcss()],
//   resolve: {
//     alias: {
//       "@": path.resolve(import.meta.dirname, "client/src"),
//     },
//   },
//   build: {
//     outDir: path.resolve(import.meta.dirname, "dist"),
//     emptyOutDir: true,
//   },
//   server: {
//     host: '0.0.0.0', // Bind to all network interfaces
//     port: 5173,
//     strictPort: false, // Allow port to be changed if 5173 is taken
//     proxy: {
//       '/api': {
//         target: process.env.VITE_API_URL || "http://localhost:5000" || "http://192.168.68.64:5000",
//         // target: process.env.VITE_API_URL || "https://csm-backend-59rq.onrender.com",

//         changeOrigin: true,
//         secure: false,
//         rewrite: (path) => path, // Keep the /api prefix
//         configure: (proxy, _options) => {
//           proxy.on('error', (err, _req, res) => {
//             console.log('[Vite Proxy] Proxy error:', err);
//           });
//           proxy.on('proxyReq', (proxyReq, req, _res) => {
//             console.log('[Vite Proxy] Proxying:', req.method, req.url, '→', proxyReq.path);
//             // Preserve the original origin header for CORS
//             if (req.headers.origin) {
//               proxyReq.setHeader('Origin', req.headers.origin);
//             }
//             // Log headers for debugging
//             console.log('[Vite Proxy] Request Origin:', req.headers.origin);
//             console.log('[Vite Proxy] Target:', proxyReq.path);
//           });
//           proxy.on('proxyRes', (proxyRes, req, _res) => {
//             console.log('[Vite Proxy] Response:', proxyRes.statusCode, req.url);
//           });
//         },
//       },
//     },
//   },
//   preview: {
//     host: '0.0.0.0',
//     port: 4173,
//     strictPort: false,
//     proxy: {
//       '/api': {
//         target: process.env.VITE_API_URL || "https://csm-backend-59rq.onrender.com",
//         // target: process.env.VITE_API_URL || "http://localhost:5000" || "http://192.168.68.64:5000",
//         changeOrigin: true,
//         secure: false,
//         rewrite: (path) => path, // Keep the /api prefix
//         configure: (proxy, _options) => {
//           proxy.on('error', (err, _req, res) => {
//             console.log('[Vite Proxy] Proxy error:', err);
//           });
//           proxy.on('proxyReq', (proxyReq, req, _res) => {
//             console.log('[Vite Proxy] Proxying:', req.method, req.url, '→', proxyReq.path);
//             // Preserve the original origin header for CORS
//             if (req.headers.origin) {
//               proxyReq.setHeader('Origin', req.headers.origin);
//             }
//             // Log headers for debugging
//             console.log('[Vite Proxy] Request Origin:', req.headers.origin);
//             console.log('[Vite Proxy] Target:', proxyReq.path);
//           });
//           proxy.on('proxyRes', (proxyRes, req, _res) => {
//             console.log('[Vite Proxy] Response:', proxyRes.statusCode, req.url);
//           });
//         },
//       },
//     },
//   },
// });


/// <reference path="./vite-env.d.ts" />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "fs";

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

    plugins: [
      react(),
      tailwindcss(),
      versionPlugin(),
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
      port: 5173,

      proxy: {
        "/api": {
          target: env.VITE_API_URL,
          changeOrigin: true,
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
