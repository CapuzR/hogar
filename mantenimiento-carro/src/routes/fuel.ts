import { Hono } from "hono";
import { and, desc, eq, gte, lte, sql, type SQL } from "drizzle-orm";
import { getDb } from "../db/client";
import { fuelLogs as FL, vehiculos as VE } from "../db/schema";
import type { AppEnv } from "../types";

export const fuelRouter = new Hono<AppEnv>();

/** GET /api/fuel — cargas de gasolina (filtros carro/fecha). Aparte del mantenimiento. */
fuelRouter.get("/", async (c) => {
  const db = getDb(c.env.DB);
  const q = (k: string) => c.req.query(k);
  const conds: SQL[] = [];
  const car = q("car");
  if (car) conds.push(sql`${VE.slug} = ${car}`);
  const from = q("from");
  if (from) conds.push(gte(FL.fuelDate, from));
  const to = q("to");
  if (to) conds.push(lte(FL.fuelDate, to));
  const owner = q("owner");
  if (owner) conds.push(eq(FL.owner, owner));
  const where = conds.length ? and(...conds) : undefined;

  const rows = await db
    .select({
      id: FL.id,
      vehicleId: FL.vehicleId,
      carSlug: VE.slug,
      fuelDate: FL.fuelDate,
      amountUsdt: FL.amountUsdt,
      currency: FL.currency,
      liters: FL.liters,
      vendor: FL.vendor,
      owner: FL.owner,
      source: FL.source,
      notes: FL.notes,
    })
    .from(FL)
    .leftJoin(VE, eq(FL.vehicleId, VE.id))
    .where(where)
    .orderBy(desc(FL.fuelDate))
    .limit(Number.parseInt(q("limit") ?? "500", 10));

  const total = rows.reduce((s, r) => s + (r.amountUsdt ?? 0), 0);
  return c.json({ fuel: rows, count: rows.length, totalUsdt: Math.round(total * 100) / 100 });
});
