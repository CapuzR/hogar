import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

// Vite corre con root=web/. Build -> ../dist (lo sirven los assets del Worker).
// En dev, proxy /api -> wrangler dev (:8787) para quedar same-origin.
export default defineConfig({
  root: here,
  plugins: [react()],
  resolve: { alias: { "@": resolve(here, "src") } },
  build: {
    outDir: resolve(here, "..", "dist"),
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:8787" },
  },
});
