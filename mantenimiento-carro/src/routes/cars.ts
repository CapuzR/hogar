import { Hono } from "hono";
import { sql } from "drizzle-orm";
import { getDb } from "../db/client";
import { vehiculos } from "../db/schema";
import type { AppEnv } from "../types";

export const carsRouter = new Hono<AppEnv>();

/** GET /api/cars — vehiculos + agregados de mantenimiento por carro. */
carsRouter.get("/", async (c) => {
  const db = getDb(c.env.DB);
  const cars = await db.select().from(vehiculos).orderBy(vehiculos.slug);

  const agg = await db.all<{
    vid: string | null;
    n: number;
    total: number;
    last: string | null;
  }>(sql`
    SELECT e.vehicle_id AS vid,
           COUNT(DISTINCT e.id) AS n,
           COALESCE(SUM(CASE WHEN p.voided = 0 THEN p.amount_usdt ELSE 0 END), 0) AS total,
           MAX(e.service_date) AS last
    FROM eventos_mantenimiento e
    LEFT JOIN evento_pagos p ON p.event_id = e.id
    GROUP BY e.vehicle_id
  `);
  const byId = new Map(agg.map((a) => [a.vid, a]));

  return c.json({
    cars: cars.map((v) => {
      const a = byId.get(v.id);
      return {
        id: v.id,
        slug: v.slug,
        nickname: v.nickname,
        make: v.make,
        model: v.model,
        year: v.year,
        trim: v.trim,
        engine: v.engine,
        transmissionType: v.transmissionType,
        oilSpec: v.oilSpec,
        plate: v.plate,
        color: v.color,
        ownerName: v.ownerName,
        currentOdometer: v.currentOdometer,
        odometerUnit: v.odometerUnit,
        isActive: v.isActive,
        label: [v.make, v.model, v.year].filter(Boolean).join(" "),
        eventCount: a?.n ?? 0,
        totalUsdt: Math.round((a?.total ?? 0) * 100) / 100,
        lastServiceDate: a?.last ?? null,
      };
    }),
  });
});
