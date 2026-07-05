import { Hono } from "hono";
import { asc, eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { eventoPagos, eventoServicios, eventosMantenimiento as EV } from "../db/schema";
import { getEvent, queryEvents, type EventFilters } from "../lib/events";
import { newId, nowIso } from "../lib/id";
import { isKnownServiceKey } from "../lib/normalize";
import { eventInput, eventPatch } from "../lib/schemas";
import { resolveVehicleId, resolveVendorId, writeEvent } from "../lib/write-event";
import type { AppEnv } from "../types";

export const eventsRouter = new Hono<AppEnv>();

function parseFilters(c: { req: { query: (k: string) => string | undefined } }): EventFilters {
  const q = (k: string) => c.req.query(k);
  const boolp = (v: string | undefined) =>
    v === undefined ? undefined : v === "1" || v === "true";
  const intp = (v: string | undefined) => (v ? Number.parseInt(v, 10) : undefined);
  return {
    car: q("car") || undefined,
    system: q("system") || undefined,
    serviceType: q("service_type") || undefined,
    needsReview: boolp(q("needs_review")),
    from: q("from") || undefined,
    to: q("to") || undefined,
    q: q("q") || undefined,
    limit: intp(q("limit")),
    offset: intp(q("offset")),
  };
}

/** GET /api/events — lista filtrable (carro, sistema, tipo, fecha, texto). */
eventsRouter.get("/", async (c) => {
  const db = getDb(c.env.DB);
  const { events, total } = await queryEvents(db, parseFilters(c));
  return c.json({ events, total });
});

/** GET /api/events/:id */
eventsRouter.get("/:id", async (c) => {
  const db = getDb(c.env.DB);
  const event = await getEvent(db, c.req.param("id"));
  if (!event) return c.json({ error: "no encontrado" }, 404);
  return c.json({ event });
});

/** POST /api/events — alta manual (humano). */
eventsRouter.post("/", async (c) => {
  const db = getDb(c.env.DB);
  const parsed = eventInput.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "payload invalido", issues: parsed.error.issues }, 400);
  const { event, replay } = await writeEvent(db, parsed.data, c.get("principal"));
  return c.json({ event, replay }, replay ? 200 : 201);
});

/** PATCH /api/events/:id — edicion / aprobacion (cola de revision). */
eventsRouter.patch("/:id", async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param("id");
  const parsed = eventPatch.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "payload invalido", issues: parsed.error.issues }, 400);
  const body = parsed.data;

  const existing = await db.select({ id: EV.id }).from(EV).where(eq(EV.id, id)).limit(1);
  if (!existing[0]) return c.json({ error: "no encontrado" }, 404);

  // Validar service_type ANTES de escribir nada (evita borrar servicios por un typo).
  const rawKeys = body.service_type ? [body.service_type] : body.service_types;
  let newKeys: string[] | undefined;
  if (rawKeys) {
    newKeys = Array.from(new Set(rawKeys)).filter(isKnownServiceKey);
    if (newKeys.length === 0) {
      return c.json({ error: "service_type desconocido", provided: rawKeys }, 400);
    }
  }

  const set: Record<string, unknown> = {};
  if (body.date !== undefined) set.serviceDate = body.date.slice(0, 10); // normaliza a YYYY-MM-DD
  if (body.odometer !== undefined) set.odometer = body.odometer;
  if (body.title !== undefined) set.title = body.title;
  if (body.description !== undefined) set.description = body.description;
  if (body.vendor !== undefined) {
    set.vendorName = body.vendor;
    set.vendorId = resolveVendorId(body.vendor);
  }
  if (body.car !== undefined) set.vehicleId = await resolveVehicleId(db, body.car);
  if (body.confidence !== undefined) set.confidence = body.confidence;
  if (body.needs_review !== undefined) set.needsReview = body.needs_review;
  if (body.approve) {
    set.needsReview = false;
    set.confidence = 1.0;
    set.approvedAt = nowIso();
    const p = c.get("principal");
    set.loggedBy = p.type === "agent" ? `agent:${p.id}` : `human:${p.email}`;
  }
  if (Object.keys(set).length > 0) {
    await db.update(EV).set(set).where(eq(EV.id, id));
  }

  // Reemplazo de servicios (ya validados como conocidos).
  if (newKeys) {
    await db.delete(eventoServicios).where(eq(eventoServicios.eventId, id));
    for (const key of newKeys) {
      await db
        .insert(eventoServicios)
        .values({ eventId: id, serviceTypeKey: key, lineCost: null })
        .onConflictDoNothing();
    }
  }

  // Ajuste del monto total: el usuario esta fijando el TOTAL del evento, asi que
  // colapsamos a un unico pago canonico (preservando el enlace YNAB del pago mas
  // antiguo si existia). Esto mantiene sum(amount_usdt) == lo que el usuario escribio
  // sin importar cuantos pagos tuviera el evento.
  if (body.amount_usdt !== undefined) {
    const pays = await db
      .select()
      .from(eventoPagos)
      .where(eq(eventoPagos.eventId, id))
      .orderBy(asc(eventoPagos.createdAt), asc(eventoPagos.id));
    const keep = pays[0];
    await db.delete(eventoPagos).where(eq(eventoPagos.eventId, id));
    await db.insert(eventoPagos).values({
      id: keep?.id ?? newId("pay"),
      eventId: id,
      ynabTransactionId: keep?.ynabTransactionId ?? null,
      notionClientId: keep?.notionClientId ?? null,
      amount: body.amount_usdt,
      currency: "USD",
      amountUsdt: body.amount_usdt,
      rateUsed: null,
      rateSource: keep?.rateSource ?? null,
      moneySource: keep?.moneySource ?? "manual_estimate",
      createdAt: keep?.createdAt ?? nowIso(),
    });
  }

  const event = await getEvent(db, id);
  return c.json({ event });
});

/** DELETE /api/events/:id — descartar evento (borra servicios y pagos asociados). */
eventsRouter.delete("/:id", async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param("id");
  const existing = await db.select({ id: EV.id }).from(EV).where(eq(EV.id, id)).limit(1);
  if (!existing[0]) return c.json({ error: "no encontrado" }, 404);
  await db.delete(eventoServicios).where(eq(eventoServicios.eventId, id));
  await db.delete(eventoPagos).where(eq(eventoPagos.eventId, id));
  await db.delete(EV).where(eq(EV.id, id));
  return c.json({ ok: true, deleted: id });
});
