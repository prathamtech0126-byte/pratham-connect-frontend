/// <reference types="vite/client" />

declare module "@tailwindcss/vite" {
  import type { Plugin } from "vite";
  interface PluginOptions {
    optimize?: boolean | { minify?: boolean };
  }
  function tailwindcss(opts?: PluginOptions): Plugin[];
  export default tailwindcss;
}

declare module "@vitejs/plugin-react" {
  import type { Plugin } from "vite";
  function react(opts?: unknown): Plugin[];
  export default react;
}
