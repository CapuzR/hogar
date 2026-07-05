/**
 * API de ingesta para agentes (PLAN.md §9). Auth por X-Cap-Auth (o Access).
 *   POST /api/v1/events            alta idempotente por client_id
 *   POST /api/v1/events:batch      <=50 en un request
 *   POST /api/v1/events:normalize  dry-run texto -> service_type_key
 *   GET  /api/v1/events?client_id= lookup por client_id
 */
import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { eventosMantenimiento as EV } from "../db/schema";
import { getEvent, queryEvents } from "../lib/events";
import { normalizeService } from "../lib/normalize";
import { batchInput, eventInput, normalizeInput } from "../lib/schemas";
import { TIPO_BY_KEY } from "../seed/tipos_servicio";
import { writeEvent } from "../lib/write-event";
import type { AppEnv } from "../types";

export const ingestRouter = new Hono<AppEnv>();

/**
 * GET /api/v1/events
 *   ?client_id=...                       -> lookup idempotente (un evento)
 *   ?car=&service_type=&from=&to=&limit=  -> consulta de historial (lista)
 *   (sin query)                           -> self-doc
 */
ingestRouter.get("/events", async (c) => {
  const db = getDb(c.env.DB);
  const clientId = c.req.query("client_id");
  if (clientId) {
    const row = await db.select({ id: EV.id }).from(EV).where(eq(EV.clientId, clientId)).limit(1);
    if (!row[0]) return c.json({ error: "no encontrado", client_id: clientId }, 404);
    const event = await getEvent(db, row[0].id);
    return c.json({ event });
  }

  const car = c.req.query("car");
  const serviceType = c.req.query("service_type");
  const from = c.req.query("from");
  const to = c.req.query("to");
  const limitStr = c.req.query("limit");
  if (car || serviceType || from || to || limitStr) {
    const { events, total } = await queryEvents(db, {
      car: car || undefined,
      serviceType: serviceType || undefined,
      from: from || undefined,
      to: to || undefined,
      limit: limitStr ? Number.parseInt(limitStr, 10) : 20,
    });
    return c.json({ events, total });
  }

  return c.json({
      endpoint: "POST /api/v1/events",
      auth: "header X-Cap-Auth: <secreto>",
      idempotency: "client_id unico; replay devuelve el evento existente (200)",
      complements: ["/api/v1/events:batch", "/api/v1/events:normalize", "GET ?client_id="],
      example: {
        client_id: "cap-evt-2026-07-03-optra-aceite",
        car: "optra",
        date: "2026-07-03",
        odometer: 158400,
        service_type: "oil_and_filter_change",
        text: "Cambio de aceite y filtro al Optra en Pachecos",
        vendor: "Yirmen Pachecos",
        performed_by: "shop",
        source: "cap",
        payments: [{ ynab_transaction_id: "b1f2..." }],
      },
  });
});

/** POST /api/v1/events — alta idempotente. */
ingestRouter.post("/events", async (c) => {
  const parsed = eventInput.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "payload invalido", issues: parsed.error.issues }, 400);
  if (!parsed.data.client_id) return c.json({ error: "client_id requerido para ingesta" }, 400);

  const db = getDb(c.env.DB);
  const { event, replay } = await writeEvent(db, parsed.data, c.get("principal"));
  if (replay) {
    c.header("Idempotent-Replay", "true");
    return c.json({ event, replay: true }, 200);
  }
  return c.json({ event, replay: false }, 201);
});

/** POST /api/v1/events:batch — hasta 50 eventos. */
ingestRouter.post("/events:batch", async (c) => {
  const parsed = batchInput.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "payload invalido", issues: parsed.error.issues }, 400);

  // Idempotencia: cada item del batch necesita client_id (igual que el POST simple).
  const missing = parsed.data.events.findIndex((e) => !e.client_id);
  if (missing >= 0) {
    return c.json({ error: `client_id requerido en cada evento (falta en el indice ${missing})` }, 400);
  }

  const db = getDb(c.env.DB);
  const principal = c.get("principal");
  const results: Array<{ client_id: string | null; id: string; replay: boolean }> = [];
  for (const ev of parsed.data.events) {
    const { event, replay } = await writeEvent(db, ev, principal);
    results.push({ client_id: ev.client_id ?? null, id: event.id, replay });
  }
  return c.json({ count: results.length, results }, 201);
});

/** POST /api/v1/events:normalize — dry-run texto -> tipo (sin escribir). */
ingestRouter.post("/events:normalize", async (c) => {
  const parsed = normalizeInput.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "payload invalido", issues: parsed.error.issues }, 400);
  const r = normalizeService(parsed.data.text);
  const tipo = TIPO_BY_KEY[r.key];
  return c.json({
    text: parsed.data.text,
    key: r.key,
    label_es: tipo?.labelEs ?? null,
    system_key: tipo?.systemKey ?? null,
    matched: r.matched,
    matched_term: r.matchedTerm ?? null,
    confidence: r.confidence,
    needs_review: !r.matched,
  });
});
