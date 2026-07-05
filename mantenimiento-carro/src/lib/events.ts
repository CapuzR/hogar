/**
 * Consulta y serializacion de eventos de mantenimiento (con carro, taller,
 * servicios y pagos). Reutilizado por las rutas humanas y por la ingesta.
 */
import { and, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import type { Db } from "../db/client";
import {
  eventoPagos,
  eventoServicios,
  eventosMantenimiento as EV,
  talleres as TA,
  tiposServicio as TS,
  vehiculos as VE,
} from "../db/schema";

export interface ServiceRef {
  key: string;
  labelEs: string;
  systemKey: string;
  lineCost: number | null;
}
export interface PaymentRef {
  id: string;
  ynabTransactionId: string | null;
  amount: number | null;
  currency: string | null;
  amountUsdt: number | null;
  rateUsed: number | null;
  rateSource: string | null;
  moneySource: string | null;
  voided: boolean;
}
export interface EventDTO {
  id: string;
  vehicleId: string | null;
  carSlug: string | null;
  carLabel: string | null;
  carColor: string | null;
  carNickname: string | null;
  serviceDate: string;
  odometer: number | null;
  odometerUnit: string;
  title: string | null;
  description: string | null;
  vendorId: string | null;
  vendorName: string | null;
  vendorCanonical: string | null;
  performedBy: string | null;
  source: string | null;
  clientId: string;
  confidence: number | null;
  needsReview: boolean;
  rawText: string | null;
  loggedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  services: ServiceRef[];
  payments: PaymentRef[];
  totalUsdt: number;
}

export interface EventFilters {
  ids?: string[]; // restringe a estos ids
  car?: string; // slug
  system?: string; // system_key
  serviceType?: string; // key
  needsReview?: boolean;
  from?: string; // ISO date
  to?: string; // ISO date
  q?: string; // busqueda libre
  limit?: number;
  offset?: number;
}

function buildConds(f: EventFilters): SQL[] {
  const conds: SQL[] = [];
  if (f.ids) conds.push(inArray(EV.id, f.ids.length ? f.ids : ["__none__"]));
  if (f.car) conds.push(sql`${VE.slug} = ${f.car}`);
  if (f.needsReview !== undefined) conds.push(eq(EV.needsReview, f.needsReview));
  // Compara solo la parte YYYY-MM-DD: robusto aunque service_date traiga hora.
  if (f.from) conds.push(sql`substr(${EV.serviceDate}, 1, 10) >= ${f.from.slice(0, 10)}`);
  if (f.to) conds.push(sql`substr(${EV.serviceDate}, 1, 10) <= ${f.to.slice(0, 10)}`);
  if (f.q) {
    // Escapa comodines de LIKE (%, _, \) para buscar el texto literal.
    const esc = f.q.replace(/[\\%_]/g, (ch) => "\\" + ch);
    const like = `%${esc}%`;
    conds.push(
      sql`(${EV.description} LIKE ${like} ESCAPE '\\' OR ${EV.title} LIKE ${like} ESCAPE '\\' OR ${EV.vendorName} LIKE ${like} ESCAPE '\\')`,
    );
  }
  if (f.system) {
    conds.push(
      sql`EXISTS (SELECT 1 FROM evento_servicios es JOIN tipos_servicio ts ON ts.key = es.service_type_key WHERE es.event_id = ${EV.id} AND ts.system_key = ${f.system})`,
    );
  }
  if (f.serviceType) {
    conds.push(
      sql`EXISTS (SELECT 1 FROM evento_servicios es WHERE es.event_id = ${EV.id} AND es.service_type_key = ${f.serviceType})`,
    );
  }
  return conds;
}

const carLabel = (make: string | null, model: string | null, year: number | null): string | null =>
  make || model ? [make, model, year].filter(Boolean).join(" ") : null;

/** Enriquece un conjunto de eventos con sus servicios y pagos. */
async function enrich(db: Db, ids: string[]): Promise<{
  services: Map<string, ServiceRef[]>;
  payments: Map<string, PaymentRef[]>;
  totals: Map<string, number>;
}> {
  const services = new Map<string, ServiceRef[]>();
  const payments = new Map<string, PaymentRef[]>();
  const totals = new Map<string, number>();
  if (ids.length === 0) return { services, payments, totals };

  const svcRows = await db
    .select({
      eventId: eventoServicios.eventId,
      key: eventoServicios.serviceTypeKey,
      lineCost: eventoServicios.lineCost,
      labelEs: TS.labelEs,
      systemKey: TS.systemKey,
    })
    .from(eventoServicios)
    .innerJoin(TS, eq(TS.key, eventoServicios.serviceTypeKey))
    .where(inArray(eventoServicios.eventId, ids));
  for (const r of svcRows) {
    const list = services.get(r.eventId) ?? [];
    list.push({ key: r.key, labelEs: r.labelEs, systemKey: r.systemKey, lineCost: r.lineCost });
    services.set(r.eventId, list);
  }

  const payRows = await db
    .select()
    .from(eventoPagos)
    .where(inArray(eventoPagos.eventId, ids));
  for (const p of payRows) {
    const list = payments.get(p.eventId) ?? [];
    list.push({
      id: p.id,
      ynabTransactionId: p.ynabTransactionId,
      amount: p.amount,
      currency: p.currency,
      amountUsdt: p.amountUsdt,
      rateUsed: p.rateUsed,
      rateSource: p.rateSource,
      moneySource: p.moneySource,
      voided: p.voided,
    });
    payments.set(p.eventId, list);
    if (!p.voided) totals.set(p.eventId, (totals.get(p.eventId) ?? 0) + (p.amountUsdt ?? 0));
  }
  return { services, payments, totals };
}

/** Lista eventos + total de coincidencias (para paginacion). */
export async function queryEvents(
  db: Db,
  f: EventFilters,
): Promise<{ events: EventDTO[]; total: number }> {
  const conds = buildConds(f);
  const where = conds.length ? and(...conds) : undefined;

  const countRows = await db
    .select({ n: sql<number>`count(*)` })
    .from(EV)
    .leftJoin(VE, eq(EV.vehicleId, VE.id))
    .where(where);
  const total = countRows[0]?.n ?? 0;

  const base = await db
    .select({
      id: EV.id,
      vehicleId: EV.vehicleId,
      serviceDate: EV.serviceDate,
      odometer: EV.odometer,
      odometerUnit: EV.odometerUnit,
      title: EV.title,
      description: EV.description,
      vendorId: EV.vendorId,
      vendorName: EV.vendorName,
      performedBy: EV.performedBy,
      source: EV.source,
      clientId: EV.clientId,
      confidence: EV.confidence,
      needsReview: EV.needsReview,
      rawText: EV.rawText,
      loggedBy: EV.loggedBy,
      approvedAt: EV.approvedAt,
      createdAt: EV.createdAt,
      carSlug: VE.slug,
      make: VE.make,
      model: VE.model,
      year: VE.year,
      carColor: VE.color,
      carNickname: VE.nickname,
      vendorCanonical: TA.name,
    })
    .from(EV)
    .leftJoin(VE, eq(EV.vehicleId, VE.id))
    .leftJoin(TA, eq(EV.vendorId, TA.id))
    .where(where)
    .orderBy(desc(EV.serviceDate), desc(EV.id))
    .limit(f.limit ?? 500)
    .offset(f.offset ?? 0);

  const ids = base.map((b) => b.id);
  const { services, payments, totals } = await enrich(db, ids);

  const events: EventDTO[] = base.map((b) => ({
    id: b.id,
    vehicleId: b.vehicleId,
    carSlug: b.carSlug,
    carLabel: carLabel(b.make, b.model, b.year),
    carColor: b.carColor,
    carNickname: b.carNickname,
    serviceDate: b.serviceDate,
    odometer: b.odometer,
    odometerUnit: b.odometerUnit,
    title: b.title,
    description: b.description,
    vendorId: b.vendorId,
    vendorName: b.vendorName,
    vendorCanonical: b.vendorCanonical,
    performedBy: b.performedBy,
    source: b.source,
    clientId: b.clientId,
    confidence: b.confidence,
    needsReview: b.needsReview,
    rawText: b.rawText,
    loggedBy: b.loggedBy,
    approvedAt: b.approvedAt,
    createdAt: b.createdAt,
    services: services.get(b.id) ?? [],
    payments: payments.get(b.id) ?? [],
    totalUsdt: Math.round((totals.get(b.id) ?? 0) * 100) / 100,
  }));

  return { events, total };
}

/** Un evento por id (o null). */
export async function getEvent(db: Db, id: string): Promise<EventDTO | null> {
  const { events } = await queryEvents(db, { ids: [id], limit: 1 });
  return events[0] ?? null;
}
