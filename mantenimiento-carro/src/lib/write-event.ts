/**
 * Alta / upsert de eventos de mantenimiento. Compartido por el POST humano y por
 * la ingesta de agentes. Idempotente por `client_id` (PLAN.md §9): un segundo
 * POST con el mismo client_id devuelve el evento existente (replay), no duplica.
 */
import { eq } from "drizzle-orm";
import type { Db } from "../db/client";
import {
  eventoPagos,
  eventoServicios,
  eventosMantenimiento as EV,
  vehiculos as VE,
} from "../db/schema";
import { TALLER_ID_BY_ALIAS } from "../seed/talleres";
import { getEvent, type EventDTO } from "./events";
import { newId, nowIso } from "./id";
import { isKnownServiceKey, normalizeService } from "./normalize";
import type { EventInput } from "./schemas";
import type { Principal } from "../types";

export interface WriteResult {
  event: EventDTO;
  replay: boolean;
}

function principalLabel(p: Principal): string {
  return p.type === "agent" ? `agent:${p.id}` : `human:${p.email}`;
}

export async function resolveVehicleId(db: Db, car?: string | null): Promise<string | null> {
  if (!car) return null;
  const slug = car.trim().toLowerCase();
  if (slug === "" || slug === "unknown") return null;
  const row = await db.select({ id: VE.id }).from(VE).where(eq(VE.slug, slug)).limit(1);
  return row[0]?.id ?? null;
}

export function resolveVendorId(vendor?: string | null): string | null {
  if (!vendor) return null;
  return TALLER_ID_BY_ALIAS[vendor.trim().toLowerCase()] ?? null;
}

/** Resuelve los service_type_key + si el evento necesita revision. */
function resolveServices(input: EventInput): { keys: string[]; needsReview: boolean } {
  // Claves explicitas: service_type puede ser string o lista; service_types es lista.
  const fromSingle = Array.isArray(input.service_type)
    ? input.service_type
    : input.service_type
      ? [input.service_type]
      : [];
  const explicit = [...fromSingle, ...(input.service_types ?? [])];
  const known = explicit.filter(isKnownServiceKey);
  if (known.length > 0) {
    const unknownGiven = explicit.length > known.length;
    return { keys: Array.from(new Set(known)), needsReview: unknownGiven };
  }
  // Texto libre -> normalizador.
  const source = input.text ?? explicit[0] ?? input.title ?? input.description ?? "";
  if (source) {
    const r = normalizeService(source);
    return { keys: [r.key], needsReview: !r.matched };
  }
  return { keys: ["other_service"], needsReview: true };
}

export async function writeEvent(
  db: Db,
  input: EventInput,
  principal: Principal,
): Promise<WriteResult> {
  const clientId = input.client_id ?? newId("evt");

  // Idempotencia.
  const existing = await db
    .select({ id: EV.id })
    .from(EV)
    .where(eq(EV.clientId, clientId))
    .limit(1);
  if (existing[0]) {
    const event = await getEvent(db, existing[0].id);
    if (event) return { event, replay: true };
  }

  const vehicleId = await resolveVehicleId(db, input.car);
  const vendorId = resolveVendorId(input.vendor);
  const { keys, needsReview: svcNeedsReview } = resolveServices(input);

  // Carro pedido pero no resuelto -> revisar.
  const carRequestedButUnknown =
    !!input.car && input.car.trim().toLowerCase() !== "unknown" && vehicleId === null;
  const needsReview = input.needs_review ?? (svcNeedsReview || carRequestedButUnknown);

  const id = newId("evt");
  const createdAt = nowIso();
  const firstUsdt = input.payments?.[0]?.amount_usdt ?? input.payments?.[0]?.amount ?? null;

  try {
    await db.insert(EV).values({
      id,
      vehicleId,
      serviceDate: input.date.slice(0, 10), // normaliza a YYYY-MM-DD (evita comparacion lexica rota)
      odometer: input.odometer ?? null,
      odometerUnit: "km",
      title: input.title ?? null,
      description: input.description ?? null,
      vendorId,
      vendorName: input.vendor ?? null,
      performedBy: input.performed_by ?? (input.vendor ? "shop" : null),
      source: input.source ?? (principal.type === "agent" ? principal.id : "manual"),
      clientId,
      confidence: input.confidence ?? (needsReview ? 0.5 : 0.9),
      needsReview,
      rawText: input.text ?? null,
      loggedBy: principalLabel(principal),
      createdAt,
    });
  } catch (e) {
    // Carrera de idempotencia: otro request con el mismo client_id gano entre el
    // SELECT y este INSERT (client_id es UNIQUE). Devolvemos el ganador como replay.
    const winner = await db
      .select({ id: EV.id })
      .from(EV)
      .where(eq(EV.clientId, clientId))
      .limit(1);
    if (winner[0] && winner[0].id !== id) {
      const event = await getEvent(db, winner[0].id);
      if (event) return { event, replay: true };
    }
    throw e;
  }

  for (const key of keys) {
    await db
      .insert(eventoServicios)
      .values({ eventId: id, serviceTypeKey: key, lineCost: keys.length === 1 ? firstUsdt : null })
      .onConflictDoNothing();
  }

  for (const p of input.payments ?? []) {
    const usdt = p.amount_usdt ?? (p.currency === "USD" || !p.currency ? p.amount ?? null : null);
    await db.insert(eventoPagos).values({
      id: newId("pay"),
      eventId: id,
      ynabTransactionId: p.ynab_transaction_id ?? null,
      notionClientId: p.notion_client_id ?? null,
      amount: p.amount ?? null,
      currency: p.currency ?? "USD",
      amountUsdt: usdt,
      rateUsed: p.rate_used ?? null,
      rateSource: p.rate_source ?? null,
      moneySource: p.money_source ?? (p.ynab_transaction_id ? "ynab" : "manual_estimate"),
      createdAt,
    });
  }

  const event = await getEvent(db, id);
  if (!event) throw new Error("no se pudo releer el evento recien creado");
  return { event, replay: false };
}
