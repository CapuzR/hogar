/**
 * Rutas de agenda: sugerencias, alta manual, edición, aprobar (crea el evento en
 * Google Calendar invitando a los 2 correos), descartar, completar y borrar.
 */
import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { agenda as A } from "../db/schema";
import { generateSuggestions, getAgendaItem, queryAgenda, type AgendaDTO } from "../lib/agenda";
import { CFG, getConfig } from "../lib/config";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  googleConfigured,
  refreshAccessToken,
} from "../lib/google";
import { newId, nowIso } from "../lib/id";
import { isKnownServiceKey } from "../lib/normalize";
import { agendaInput, agendaPatch } from "../lib/schemas";
import { resolveVehicleId } from "../lib/write-event";
import type { AppEnv } from "../types";

export const agendaRouter = new Hono<AppEnv>();

/** GET /api/agenda?status=&car= */
agendaRouter.get("/", async (c) => {
  const db = getDb(c.env.DB);
  const items = await queryAgenda(db, {
    status: c.req.query("status") || undefined,
    car: c.req.query("car") || undefined,
  });
  return c.json({ items });
});

/** POST /api/agenda/generate — corre el motor de sugerencias. */
agendaRouter.post("/generate", async (c) => {
  const db = getDb(c.env.DB);
  const created = await generateSuggestions(db);
  const items = await queryAgenda(db, {});
  return c.json({ created, items });
});

/** POST /api/agenda — alta manual. */
agendaRouter.post("/", async (c) => {
  const db = getDb(c.env.DB);
  const parsed = agendaInput.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "payload invalido", issues: parsed.error.issues }, 400);
  const b = parsed.data;
  if (b.service_type && !isKnownServiceKey(b.service_type)) {
    return c.json({ error: "service_type desconocido", provided: b.service_type }, 400);
  }
  const id = newId("agd");
  await db.insert(A).values({
    id,
    vehicleId: b.car ? await resolveVehicleId(db, b.car) : null,
    serviceTypeKey: b.service_type ?? null,
    title: b.title,
    notes: b.notes ?? null,
    scheduledDate: b.date.slice(0, 10),
    scheduledTime: b.time ?? null,
    estimatedCost: b.estimated_cost ?? null,
    serviceCenter: b.service_center ?? null,
    status: "suggested",
    source: "manual",
    createdAt: nowIso(),
  });
  const item = await getAgendaItem(db, id);
  return c.json({ item }, 201);
});

/** PATCH /api/agenda/:id — editar. */
agendaRouter.patch("/:id", async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param("id");
  const parsed = agendaPatch.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "payload invalido", issues: parsed.error.issues }, 400);
  const b = parsed.data;

  const existing = await db.select({ id: A.id }).from(A).where(eq(A.id, id)).limit(1);
  if (!existing[0]) return c.json({ error: "no encontrado" }, 404);
  if (b.service_type && !isKnownServiceKey(b.service_type)) {
    return c.json({ error: "service_type desconocido", provided: b.service_type }, 400);
  }

  const set: Record<string, unknown> = {};
  if (b.car !== undefined) set.vehicleId = b.car ? await resolveVehicleId(db, b.car) : null;
  if (b.service_type !== undefined) set.serviceTypeKey = b.service_type;
  if (b.title !== undefined) set.title = b.title;
  if (b.notes !== undefined) set.notes = b.notes;
  if (b.date !== undefined) set.scheduledDate = b.date.slice(0, 10);
  if (b.time !== undefined) set.scheduledTime = b.time;
  if (b.estimated_cost !== undefined) set.estimatedCost = b.estimated_cost;
  if (b.service_center !== undefined) set.serviceCenter = b.service_center;
  if (b.status !== undefined) set.status = b.status;
  if (Object.keys(set).length > 0) await db.update(A).set(set).where(eq(A.id, id));

  const item = await getAgendaItem(db, id);
  return c.json({ item });
});

/** POST /api/agenda/:id/approve — programar + crear evento en Google Calendar. */
agendaRouter.post("/:id/approve", async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param("id");
  const item = await getAgendaItem(db, id);
  if (!item) return c.json({ error: "no encontrado" }, 404);

  const set: Record<string, unknown> = { status: "scheduled", approvedAt: nowIso() };
  const calendar = { connected: false, created: false, error: null as string | null };

  const refresh = await getConfig(db, CFG.googleRefreshToken);
  const calId = await getConfig(db, CFG.googleCalendarId);
  if (googleConfigured(c.env) && refresh && calId) {
    calendar.connected = true;
    try {
      const accessToken = await refreshAccessToken(c.env, refresh);
      const ev = await createCalendarEvent(accessToken, calId, {
        summary: item.title,
        description: buildDescription(item),
        date: item.scheduledDate,
        time: item.scheduledTime,
      });
      set.googleEventId = ev.id;
      set.googleHtmlLink = ev.htmlLink;
      calendar.created = true;
    } catch (e) {
      calendar.error = String(e instanceof Error ? e.message : e);
    }
  }

  await db.update(A).set(set).where(eq(A.id, id));
  return c.json({ item: await getAgendaItem(db, id), calendar });
});

/** POST /api/agenda/:id/dismiss — descartar (queda registrado para no re-sugerir). */
agendaRouter.post("/:id/dismiss", async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param("id");
  const existing = await db.select({ id: A.id }).from(A).where(eq(A.id, id)).limit(1);
  if (!existing[0]) return c.json({ error: "no encontrado" }, 404);
  await db.update(A).set({ status: "dismissed" }).where(eq(A.id, id));
  return c.json({ item: await getAgendaItem(db, id) });
});

/** POST /api/agenda/:id/complete — marcar como hecho. */
agendaRouter.post("/:id/complete", async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param("id");
  const existing = await db.select({ id: A.id }).from(A).where(eq(A.id, id)).limit(1);
  if (!existing[0]) return c.json({ error: "no encontrado" }, 404);
  await db.update(A).set({ status: "done", completedAt: nowIso() }).where(eq(A.id, id));
  return c.json({ item: await getAgendaItem(db, id) });
});

/** DELETE /api/agenda/:id — borrar (y su evento de Calendar si lo tenía). */
agendaRouter.delete("/:id", async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param("id");
  const item = await getAgendaItem(db, id);
  if (!item) return c.json({ error: "no encontrado" }, 404);

  if (item.googleEventId) {
    const refresh = await getConfig(db, CFG.googleRefreshToken);
    const calId = await getConfig(db, CFG.googleCalendarId);
    if (googleConfigured(c.env) && refresh && calId) {
      try {
        const accessToken = await refreshAccessToken(c.env, refresh);
        await deleteCalendarEvent(accessToken, calId, item.googleEventId);
      } catch (e) {
        console.error("no se pudo borrar el evento de Calendar:", e);
      }
    }
  }

  await db.delete(A).where(eq(A.id, id));
  return c.json({ ok: true, deleted: id });
});

/** Descripción del evento de Calendar a partir del item de agenda. */
function buildDescription(item: AgendaDTO): string {
  const lines: string[] = [];
  if (item.carLabel) lines.push(`Carro: ${item.carLabel}`);
  if (item.reason) lines.push(item.reason);
  if (item.estimatedCost) lines.push(`Costo estimado: ${item.estimatedCost}`);
  if (item.serviceCenter) lines.push(`Taller: ${item.serviceCenter}`);
  if (item.notes) lines.push("", item.notes);
  lines.push("", "— Mantenimiento (Optra & Clio)");
  return lines.join("\n");
}
