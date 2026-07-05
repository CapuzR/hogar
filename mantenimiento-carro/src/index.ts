/**
 * Worker unico (Hono): expone la API JSON en /api/* y deja que los static assets
 * (build de Vite en ./dist) sirvan la SPA. `run_worker_first: ["/api/*"]` en
 * wrangler.jsonc hace que el Worker solo corra para /api/*; el resto va a assets.
 */
import { Hono } from "hono";
import { auth } from "./middleware/auth";
import { agendaRouter } from "./routes/agenda";
import { carsRouter } from "./routes/cars";
import { eventsRouter } from "./routes/events";
import { fuelRouter } from "./routes/fuel";
import { googleRouter } from "./routes/google";
import { ingestRouter } from "./routes/ingest";
import { serviceTypesRouter } from "./routes/service-types";
import { statsRouter } from "./routes/stats";
import type { AppEnv } from "./types";

const app = new Hono<AppEnv>();

// Health check (sin auth) para smoke tests y monitoreo.
app.get("/api/health", (c) => c.json({ ok: true, service: "mantenimiento-carro", ts: Date.now() }));

// Auth doble en todo /api/* (Access humanos + X-Cap-Auth agentes; dev bypass local).
app.use("/api/*", auth());

// Rutas.
app.route("/api/v1", ingestRouter); // ingesta de agentes
app.route("/api/events", eventsRouter);
app.route("/api/cars", carsRouter);
app.route("/api/service-types", serviceTypesRouter);
app.route("/api/fuel", fuelRouter);
app.route("/api/stats", statsRouter);
app.route("/api/agenda", agendaRouter); // sugerencias + eventos programados
app.route("/api/google", googleRouter); // conexión con Google Calendar

// 404 JSON para /api/* no encontrado.
app.all("/api/*", (c) => c.json({ error: "ruta no encontrada" }, 404));

app.onError((err, c) => {
  console.error("API error:", err);
  return c.json({ error: "error interno", detail: String(err) }, 500);
});

export default app;
