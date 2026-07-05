import { Hono } from "hono";
import { asc, eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { tiposServicio } from "../db/schema";
import { SISTEMAS } from "../seed/tipos_servicio";
import type { AppEnv } from "../types";

export const serviceTypesRouter = new Hono<AppEnv>();

/** GET /api/service-types — vocabulario controlado (activo), agrupado por sistema. */
serviceTypesRouter.get("/", async (c) => {
  const db = getDb(c.env.DB);
  const rows = await db
    .select()
    .from(tiposServicio)
    .where(eq(tiposServicio.isActive, true))
    .orderBy(asc(tiposServicio.systemKey), asc(tiposServicio.labelEs));

  const types = rows.map((t) => ({
    key: t.key,
    labelEs: t.labelEs,
    systemKey: t.systemKey,
    systemLabel: SISTEMAS[t.systemKey] ?? t.systemKey,
    nature: t.nature,
    synonyms: t.synonyms ?? [], // para que los agentes normalicen texto->tipo (§9)
    defaultIntervalKm: t.defaultIntervalKm,
    defaultIntervalMonths: t.defaultIntervalMonths,
  }));

  const systems = Object.entries(SISTEMAS).map(([key, label]) => ({ key, label }));
  return c.json({ systems, types });
});
