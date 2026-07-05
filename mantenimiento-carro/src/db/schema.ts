/**
 * Esquema de la base (D1 / SQLite) — fuente de verdad del modelo de datos.
 * Corresponde a PLAN.md §7. IDs en TEXT (ULID o slugs legibles).
 *
 * El dinero NO es autoritativo aqui: vive en `evento_pagos` como enlace a YNAB
 * (o como monto historico para lo previo al bot). La gasolina va aparte en `fuel_logs`.
 */
import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

const nowIso = () => new Date().toISOString();

/* ────────────────────────────── 7.1 vehiculos ────────────────────────────── */
export const vehiculos = sqliteTable("vehiculos", {
  id: text("id").primaryKey(), // p.ej. car_optra_2011
  slug: text("slug").notNull().unique(), // optra | clio (resuelve el carro en el payload)
  nickname: text("nickname"),
  make: text("make"),
  model: text("model"),
  year: integer("year"),
  trim: text("trim"),
  engine: text("engine"), // 1.8L I4 | 1.6L I4
  transmissionType: text("transmission_type"), // manual | automatic
  oilSpec: text("oil_spec"), // 15W-40 sintetico | semi-sintetico
  plate: text("plate"),
  color: text("color"),
  vin: text("vin"),
  ownerName: text("owner_name"), // propietario segun el titulo
  currentOdometer: integer("current_odometer"),
  odometerUnit: text("odometer_unit").notNull().default("km"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().$defaultFn(nowIso),
});

/* ─────────────────────── 7.2 tipos_servicio (vocabulario) ─────────────────── */
export const tiposServicio = sqliteTable(
  "tipos_servicio",
  {
    key: text("key").primaryKey(), // snake_case EN, p.ej. oil_and_filter_change
    labelEs: text("label_es").notNull(),
    systemKey: text("system_key").notNull(), // sistema padre -> gasto por sistema
    nature: text("nature"), // routine | repair | inspection
    synonyms: text("synonyms", { mode: "json" }).$type<string[]>(), // ES/EN para el normalizador
    defaultIntervalKm: integer("default_interval_km"),
    defaultIntervalMonths: integer("default_interval_months"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  },
  (t) => [index("idx_tipos_system").on(t.systemKey)],
);

/* ────────────────────────────── 7.3 talleres ─────────────────────────────── */
export const talleres = sqliteTable("talleres", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  aliases: text("aliases", { mode: "json" }).$type<string[]>(),
  vendorType: text("vendor_type"), // dealer | independent_shop | chain | parts_store | mobile | diy
  defaultCarId: text("default_car_id").references(() => vehiculos.id),
  phone: text("phone"),
  location: text("location"),
  notes: text("notes"),
});

/* ────────────────── 7.4 eventos_mantenimiento (hechos mecanicos) ──────────── */
export const eventosMantenimiento = sqliteTable(
  "eventos_mantenimiento",
  {
    id: text("id").primaryKey(),
    vehicleId: text("vehicle_id").references(() => vehiculos.id), // nullable: carro desconocido -> cola de revision
    serviceDate: text("service_date").notNull(), // ISO date (fecha del servicio, no la de ingesta)
    odometer: integer("odometer"),
    odometerUnit: text("odometer_unit").notNull().default("km"),
    title: text("title"),
    description: text("description"),
    vendorId: text("vendor_id").references(() => talleres.id),
    vendorName: text("vendor_name"), // nombre crudo si aun no normalizado
    performedBy: text("performed_by"), // shop | self
    source: text("source"), // cap | maruita | manual | notion | whatsapp | ynab | merged
    clientId: text("client_id").notNull().unique(), // idempotencia (convencion de la flota)
    confidence: real("confidence"),
    needsReview: integer("needs_review", { mode: "boolean" }).notNull().default(false),
    rawText: text("raw_text"),
    loggedBy: text("logged_by"), // auditoria: humano o token de agente
    approvedAt: text("approved_at"), // se setea al aprobar desde la cola de revision
    createdAt: text("created_at").notNull().$defaultFn(nowIso),
  },
  (t) => [
    index("idx_eventos_vehicle").on(t.vehicleId),
    index("idx_eventos_date").on(t.serviceDate),
    index("idx_eventos_needs_review").on(t.needsReview),
  ],
);

/* ─────────────── 7.5 evento_servicios (varios servicios por visita) ───────── */
export const eventoServicios = sqliteTable(
  "evento_servicios",
  {
    eventId: text("event_id")
      .notNull()
      .references(() => eventosMantenimiento.id, { onDelete: "cascade" }),
    serviceTypeKey: text("service_type_key")
      .notNull()
      .references(() => tiposServicio.key),
    lineCost: real("line_cost"), // costo atribuido a la linea (opcional)
  },
  (t) => [
    primaryKey({ columns: [t.eventId, t.serviceTypeKey] }),
    index("idx_evserv_type").on(t.serviceTypeKey),
  ],
);

/* ──────────────────── 7.6 evento_pagos (enlace al dinero) ─────────────────── */
export const eventoPagos = sqliteTable(
  "evento_pagos",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => eventosMantenimiento.id, { onDelete: "cascade" }),
    ynabTransactionId: text("ynab_transaction_id"), // enlace a YNAB (autoritativo cuando existe)
    notionClientId: text("notion_client_id"),
    amount: real("amount"), // monto original
    currency: text("currency"), // USD | VES | VEF | unknown
    amountUsdt: real("amount_usdt"), // monto normalizado a USD
    rateUsed: real("rate_used"),
    rateSource: text("rate_source"), // binance-p2p | dolarapi-paralelo | manual
    moneySource: text("money_source"), // ynab | historical | manual_estimate
    voided: integer("voided", { mode: "boolean" }).notNull().default(false), // F2: deleted de YNAB
    createdAt: text("created_at").notNull().$defaultFn(nowIso),
  },
  (t) => [
    index("idx_pagos_event").on(t.eventId),
    index("idx_pagos_ynab").on(t.ynabTransactionId),
  ],
);

/* ────────────────────── 7.7 lecturas_odometro (opcional) ──────────────────── */
export const lecturasOdometro = sqliteTable("lecturas_odometro", {
  id: text("id").primaryKey(),
  vehicleId: text("vehicle_id")
    .notNull()
    .references(() => vehiculos.id),
  reading: integer("reading").notNull(),
  unit: text("unit").notNull().default("km"),
  readAt: text("read_at").notNull(),
  source: text("source"),
  eventId: text("event_id").references(() => eventosMantenimiento.id),
});

/* ────────────────────────── 7.8 recordatorios (Fase 3) ────────────────────── */
export const recordatorios = sqliteTable("recordatorios", {
  id: text("id").primaryKey(),
  vehicleId: text("vehicle_id")
    .notNull()
    .references(() => vehiculos.id),
  serviceTypeKey: text("service_type_key")
    .notNull()
    .references(() => tiposServicio.key),
  intervalDistance: integer("interval_distance"),
  intervalMonths: integer("interval_months"),
  triggerMode: text("trigger_mode").notNull().default("whichever_first"),
  baselineDate: text("baseline_date"),
  baselineOdometer: integer("baseline_odometer"),
  leadDays: integer("lead_days"),
  leadDistance: integer("lead_distance"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

/* ───────────────────── 7.9 fuel_logs (combustible / gasolina) ─────────────── */
export const fuelLogs = sqliteTable(
  "fuel_logs",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id").unique(), // idempotencia del import (p.ej. FUEL-0001)
    vehicleId: text("vehicle_id").references(() => vehiculos.id), // nullable: la mayoria no dice el carro
    fuelDate: text("fuel_date").notNull(),
    amountUsdt: real("amount_usdt"),
    currency: text("currency").notNull().default("USD"),
    liters: real("liters"),
    vendor: text("vendor"),
    owner: text("owner"), // Ricardo | Maru | Shared
    ynabTransactionId: text("ynab_transaction_id"), // se poblara en Fase 2
    source: text("source"), // ynab-gasolina | ynab-mantenimiento(reclasificado)
    notes: text("notes"),
    createdAt: text("created_at").notNull().$defaultFn(nowIso),
  },
  (t) => [index("idx_fuel_date").on(t.fuelDate), index("idx_fuel_vehicle").on(t.vehicleId)],
);

/* ─────────────────── agenda (eventos sugeridos / programados) ─────────────────
 * Eventos FUTUROS de mantenimiento que se conectan con Google Calendar.
 * Flujo: el motor de sugerencias crea filas `suggested` -> el usuario aprueba
 * (`scheduled`, se crea el evento en el calendario "Hogar" invitando a los 2
 * correos) -> se marca `done` al completarlo. Distinto de `eventos_mantenimiento`
 * (hechos PASADOS del ledger). */
export const agenda = sqliteTable(
  "agenda",
  {
    id: text("id").primaryKey(), // agd_...
    vehicleId: text("vehicle_id").references(() => vehiculos.id),
    serviceTypeKey: text("service_type_key").references(() => tiposServicio.key),
    title: text("title").notNull(),
    notes: text("notes"),
    scheduledDate: text("scheduled_date").notNull(), // ISO date YYYY-MM-DD
    scheduledTime: text("scheduled_time"), // HH:MM (null = todo el día)
    estimatedCost: text("estimated_cost"), // texto libre ("$100 - $1000")
    serviceCenter: text("service_center"),
    status: text("status").notNull().default("suggested"), // suggested | scheduled | done | dismissed
    source: text("source").notNull().default("auto"), // auto | manual
    reason: text("reason"), // por qué se sugirió (vencido / toca pronto)
    dedupeKey: text("dedupe_key").unique(), // idempotencia de sugerencias auto
    googleEventId: text("google_event_id"),
    googleHtmlLink: text("google_html_link"),
    createdAt: text("created_at").notNull().$defaultFn(nowIso),
    approvedAt: text("approved_at"),
    completedAt: text("completed_at"),
  },
  (t) => [
    index("idx_agenda_vehicle").on(t.vehicleId),
    index("idx_agenda_status").on(t.status),
    index("idx_agenda_date").on(t.scheduledDate),
  ],
);

/* ───────────────────── app_config (clave/valor del servidor) ──────────────────
 * Almacén simple para el estado de la conexión con Google (refresh token,
 * id del calendario "Hogar", correo conectado). */
export const appConfig = sqliteTable("app_config", {
  key: text("key").primaryKey(),
  value: text("value"),
  updatedAt: text("updated_at").notNull().$defaultFn(nowIso),
});

/* Marca temporal SQL util para defaults en migraciones manuales si hiciera falta. */
export const sqlNow = sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`;

/* ───────────────────────────── Tipos inferidos ───────────────────────────── */
export type Vehiculo = typeof vehiculos.$inferSelect;
export type TipoServicio = typeof tiposServicio.$inferSelect;
export type Taller = typeof talleres.$inferSelect;
export type EventoMantenimiento = typeof eventosMantenimiento.$inferSelect;
export type EventoServicio = typeof eventoServicios.$inferSelect;
export type EventoPago = typeof eventoPagos.$inferSelect;
export type LecturaOdometro = typeof lecturasOdometro.$inferSelect;
export type Recordatorio = typeof recordatorios.$inferSelect;
export type FuelLog = typeof fuelLogs.$inferSelect;
export type Agenda = typeof agenda.$inferSelect;
export type AppConfig = typeof appConfig.$inferSelect;

export type NewEventoMantenimiento = typeof eventosMantenimiento.$inferInsert;
export type NewEventoPago = typeof eventoPagos.$inferInsert;
export type NewFuelLog = typeof fuelLogs.$inferInsert;
export type NewAgenda = typeof agenda.$inferInsert;
