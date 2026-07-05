/**
 * Agenda: eventos FUTUROS de mantenimiento (sugeridos / programados / hechos) que
 * se conectan con Google Calendar. Incluye el motor de sugerencias, que compara el
 * último servicio de cada tipo (del ledger) contra su intervalo por defecto en
 * meses y propone lo que toca pronto o está vencido.
 */
import { and, asc, eq, isNotNull, sql, type SQL } from "drizzle-orm";
import type { Db } from "../db/client";
import { agenda as A, tiposServicio as TS, vehiculos as VE } from "../db/schema";
import { newId, nowIso } from "./id";

export interface AgendaDTO {
  id: string;
  vehicleId: string | null;
  carSlug: string | null;
  carLabel: string | null;
  serviceTypeKey: string | null;
  serviceLabel: string | null;
  systemKey: string | null;
  title: string;
  notes: string | null;
  scheduledDate: string;
  scheduledTime: string | null;
  estimatedCost: string | null;
  serviceCenter: string | null;
  status: string;
  source: string;
  reason: string | null;
  googleEventId: string | null;
  googleHtmlLink: string | null;
  approvedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

const SELECTION = {
  id: A.id,
  vehicleId: A.vehicleId,
  carSlug: VE.slug,
  make: VE.make,
  model: VE.model,
  serviceTypeKey: A.serviceTypeKey,
  serviceLabel: TS.labelEs,
  systemKey: TS.systemKey,
  title: A.title,
  notes: A.notes,
  scheduledDate: A.scheduledDate,
  scheduledTime: A.scheduledTime,
  estimatedCost: A.estimatedCost,
  serviceCenter: A.serviceCenter,
  status: A.status,
  source: A.source,
  reason: A.reason,
  googleEventId: A.googleEventId,
  googleHtmlLink: A.googleHtmlLink,
  approvedAt: A.approvedAt,
  completedAt: A.completedAt,
  createdAt: A.createdAt,
};

type Row = {
  make: string | null;
  model: string | null;
} & Omit<AgendaDTO, "carLabel">;

function mapRow(r: Row): AgendaDTO {
  const carLabel = r.make || r.model ? [r.make, r.model].filter(Boolean).join(" ") : null;
  const { make: _make, model: _model, ...rest } = r;
  return { ...rest, carLabel };
}

export async function queryAgenda(
  db: Db,
  f: { status?: string; car?: string },
): Promise<AgendaDTO[]> {
  const conds: SQL[] = [];
  if (f.status) conds.push(eq(A.status, f.status));
  if (f.car) conds.push(eq(VE.slug, f.car));
  const rows = await db
    .select(SELECTION)
    .from(A)
    .leftJoin(VE, eq(A.vehicleId, VE.id))
    .leftJoin(TS, eq(A.serviceTypeKey, TS.key))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(asc(A.scheduledDate), asc(A.createdAt));
  return rows.map(mapRow);
}

export async function getAgendaItem(db: Db, id: string): Promise<AgendaDTO | null> {
  const rows = await db
    .select(SELECTION)
    .from(A)
    .leftJoin(VE, eq(A.vehicleId, VE.id))
    .leftJoin(TS, eq(A.serviceTypeKey, TS.key))
    .where(eq(A.id, id))
    .limit(1);
  return rows[0] ? mapRow(rows[0]) : null;
}

/**
 * Genera sugerencias `suggested` a partir de los intervalos en MESES (los que no
 * necesitan odómetro). Para cada carro × tipo con intervalo: busca el último
 * servicio de ese tipo, calcula el próximo vencimiento y, si cae dentro del
 * horizonte (o ya venció), crea una sugerencia. Idempotente por `dedupeKey`
 * (mismo carro+tipo+mes de vencimiento nunca se duplica ni resucita descartes).
 */
// Familias: servicios que resetean el mismo "reloj" (para la línea base del
// próximo vencimiento). El aceite y el aceite+filtro cuentan como lo mismo.
const BASELINE_FAMILY: Record<string, string[]> = {
  oil_and_filter_change: ["oil_change", "oil_and_filter_change"],
};
// No sugerir estos: los cubre un representante de su familia (evita duplicar).
const SKIP_SUGGEST = new Set(["oil_change"]); // cubierto por oil_and_filter_change

export async function generateSuggestions(db: Db, horizonDays = 180): Promise<number> {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const horizon = new Date(today.getTime());
  horizon.setUTCDate(horizon.getUTCDate() + horizonDays);
  const horizonStr = horizon.toISOString().slice(0, 10);

  const cars = await db
    .select({ id: VE.id, make: VE.make, model: VE.model })
    .from(VE)
    .where(eq(VE.isActive, true));
  const types = await db
    .select({ key: TS.key, labelEs: TS.labelEs, months: TS.defaultIntervalMonths })
    .from(TS)
    .where(and(eq(TS.isActive, true), isNotNull(TS.defaultIntervalMonths)));

  let created = 0;
  for (const car of cars) {
    for (const t of types) {
      if (t.months == null) continue;
      if (SKIP_SUGGEST.has(t.key)) continue;
      const baselineKeys = BASELINE_FAMILY[t.key] ?? [t.key];
      const keysSql = sql.join(
        baselineKeys.map((k) => sql`${k}`),
        sql`, `,
      );
      const last = await db.get<{ last: string | null }>(sql`
        SELECT MAX(e.service_date) AS last
        FROM eventos_mantenimiento e
        JOIN evento_servicios es ON es.event_id = e.id
        WHERE e.vehicle_id = ${car.id} AND es.service_type_key IN (${keysSql})
      `);
      const lastDate = last?.last ? last.last.slice(0, 10) : null;
      if (!lastDate) continue; // sin baseline no se sugiere

      const nextDue = addMonths(lastDate, t.months);
      if (nextDue > horizonStr) continue; // aún lejos

      const dedupeKey = `auto:${car.id}:${t.key}:${nextDue.slice(0, 7)}`;
      const existing = await db.select({ id: A.id }).from(A).where(eq(A.dedupeKey, dedupeKey)).limit(1);
      if (existing[0]) continue; // ya sugerido/aprobado/descartado antes

      const overdue = nextDue < todayStr;
      const carName = [car.make, car.model].filter(Boolean).join(" ");
      await db.insert(A).values({
        id: newId("agd"),
        vehicleId: car.id,
        serviceTypeKey: t.key,
        title: carName ? `${t.labelEs} · ${carName}` : t.labelEs,
        scheduledDate: overdue ? todayStr : nextDue,
        status: "suggested",
        source: "auto",
        reason: overdue
          ? `Vencido: tocaba ${fmtEs(nextDue)} (cada ${t.months} meses)`
          : `Toca pronto: última vez ${fmtEs(lastDate)} (cada ${t.months} meses)`,
        dedupeKey,
        createdAt: nowIso(),
      });
      created++;
    }
  }
  return created;
}

function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + months, d)).toISOString().slice(0, 10);
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function fmtEs(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MESES[m - 1]} ${y}`;
}
