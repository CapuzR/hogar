/**
 * GET /api/stats — agregados para el dashboard (gasto por carro / sistema / mes).
 * El gasto por sistema se atribuye al servicio primario del evento (MIN key) para
 * que la suma por sistema cuadre con el total (los eventos importados tienen 1 servicio).
 */
import { Hono } from "hono";
import { sql } from "drizzle-orm";
import { getDb } from "../db/client";
import { SISTEMAS } from "../seed/tipos_servicio";
import type { AppEnv } from "../types";

export const statsRouter = new Hono<AppEnv>();

statsRouter.get("/", async (c) => {
  const db = getDb(c.env.DB);

  const totalsRow = await db.get<{
    maint: number;
    fuel: number;
    events: number;
    fuels: number;
    review: number;
  }>(sql`
    SELECT
      (SELECT COALESCE(SUM(amount_usdt),0) FROM evento_pagos WHERE voided = 0) AS maint,
      (SELECT COALESCE(SUM(amount_usdt),0) FROM fuel_logs) AS fuel,
      (SELECT COUNT(*) FROM eventos_mantenimiento) AS events,
      (SELECT COUNT(*) FROM fuel_logs) AS fuels,
      (SELECT COUNT(*) FROM eventos_mantenimiento WHERE needs_review = 1) AS review
  `);

  const byCar = await db.all<{
    slug: string | null;
    make: string | null;
    model: string | null;
    year: number | null;
    n: number;
    total: number;
  }>(sql`
    SELECT v.slug AS slug, v.make AS make, v.model AS model, v.year AS year,
           COUNT(DISTINCT e.id) AS n,
           COALESCE(SUM(CASE WHEN p.voided = 0 THEN p.amount_usdt ELSE 0 END), 0) AS total
    FROM eventos_mantenimiento e
    LEFT JOIN vehiculos v ON v.id = e.vehicle_id
    LEFT JOIN evento_pagos p ON p.event_id = e.id
    GROUP BY e.vehicle_id
    ORDER BY total DESC
  `);

  const bySystem = await db.all<{ sys: string; n: number; total: number }>(sql`
    WITH primary_service AS (
      SELECT event_id, MIN(service_type_key) AS key FROM evento_servicios GROUP BY event_id
    ),
    event_total AS (
      SELECT event_id, SUM(CASE WHEN voided = 0 THEN amount_usdt ELSE 0 END) AS total
      FROM evento_pagos GROUP BY event_id
    )
    SELECT ts.system_key AS sys, COUNT(DISTINCT e.id) AS n, COALESCE(SUM(et.total),0) AS total
    FROM eventos_mantenimiento e
    JOIN primary_service ps ON ps.event_id = e.id
    JOIN tipos_servicio ts ON ts.key = ps.key
    LEFT JOIN event_total et ON et.event_id = e.id
    GROUP BY ts.system_key
    ORDER BY total DESC
  `);

  const maintMonths = await db.all<{ m: string; total: number }>(sql`
    SELECT substr(e.service_date, 1, 7) AS m,
           COALESCE(SUM(CASE WHEN p.voided = 0 THEN p.amount_usdt ELSE 0 END), 0) AS total
    FROM eventos_mantenimiento e
    LEFT JOIN evento_pagos p ON p.event_id = e.id
    GROUP BY m ORDER BY m
  `);
  const fuelMonths = await db.all<{ m: string; total: number }>(sql`
    SELECT substr(fuel_date, 1, 7) AS m, COALESCE(SUM(amount_usdt),0) AS total
    FROM fuel_logs GROUP BY m ORDER BY m
  `);

  const months = new Map<string, { month: string; maintenance: number; fuel: number }>();
  for (const r of maintMonths) {
    if (!r.m) continue;
    months.set(r.m, { month: r.m, maintenance: round(r.total), fuel: 0 });
  }
  for (const r of fuelMonths) {
    if (!r.m) continue;
    const e = months.get(r.m) ?? { month: r.m, maintenance: 0, fuel: 0 };
    e.fuel = round(r.total);
    months.set(r.m, e);
  }

  return c.json({
    totals: {
      maintenanceUsdt: round(totalsRow?.maint ?? 0),
      fuelUsdt: round(totalsRow?.fuel ?? 0),
      eventCount: totalsRow?.events ?? 0,
      fuelCount: totalsRow?.fuels ?? 0,
      needsReviewCount: totalsRow?.review ?? 0,
    },
    byCar: byCar.map((r) => ({
      carSlug: r.slug,
      carLabel: r.slug ? [r.make, r.model, r.year].filter(Boolean).join(" ") : "Sin carro",
      count: r.n,
      totalUsdt: round(r.total),
    })),
    bySystem: bySystem.map((r) => ({
      systemKey: r.sys,
      systemLabel: SISTEMAS[r.sys] ?? r.sys,
      count: r.n,
      totalUsdt: round(r.total),
    })),
    byMonth: [...months.values()].sort((a, b) => a.month.localeCompare(b.month)),
  });
});

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
