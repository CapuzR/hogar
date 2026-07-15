import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// SPA estática; se puede desplegar en Cloudflare Pages (build: `npm run build` → dist/).
export default defineConfig({
  plugins: [react()],
  base: "./",
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
