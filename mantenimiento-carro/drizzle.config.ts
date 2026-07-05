import { defineConfig } from "drizzle-kit";

// drizzle-kit genera SQL de migracion a ./migrations desde el esquema.
// Aplicamos con `wrangler d1 migrations apply mantenimiento --local|--remote`.
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./migrations",
});
