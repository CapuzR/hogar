/**
 * Genera scripts/generated/import.sql desde la data base conciliada:
 *   data/events.csv (45) -> eventos_mantenimiento + evento_servicios + evento_pagos
 *   data/fuel.csv   (88) -> fuel_logs
 * Preserva confidence / needs_review / notes. Idempotente (INSERT OR IGNORE por PK).
 * Requiere que el seed ya haya corrido (FKs a vehiculos / tipos_servicio / talleres).
 *
 * Aplicar con:
 *   wrangler d1 execute mantenimiento --local --file=scripts/generated/import.sql
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";

import { VEHICULO_ID_BY_SLUG } from "../src/seed/vehiculos.ts";
import { TALLER_ID_BY_ALIAS } from "../src/seed/talleres.ts";
import { TIPO_BY_KEY } from "../src/seed/tipos_servicio.ts";
import { insertOrIgnore } from "./lib/sql.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const OUT = resolve(__dirname, "generated", "import.sql");
const nowIso = new Date().toISOString();

const num = (s: string | undefined): number | null => {
  if (s === undefined) return null;
  const t = s.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};
const clean = (s: string | undefined): string | null => {
  const t = (s ?? "").trim();
  return t === "" ? null : t;
};
const isTrue = (s: string | undefined): boolean => /^true$/i.test((s ?? "").trim());

const warnings: string[] = [];

/* ─────────────────────────── events.csv ─────────────────────────── */
type EventRow = Record<string, string>;
const eventsCsv = readFileSync(resolve(root, "data", "events.csv"), "utf8");
const events: EventRow[] = parse(eventsCsv, {
  columns: true,
  skip_empty_lines: true,
  trim: false,
});

const lines: string[] = [
  "-- GENERADO por scripts/import.ts — no editar a mano.",
  "-- Carga inicial: eventos_mantenimiento + evento_servicios + evento_pagos + fuel_logs.",
  "-- ⚠️  BOOTSTRAP DE UNA SOLA VEZ. Es INSERT OR IGNORE por PK: si un evento fue",
  "--     descartado (DELETE) desde la UI, re-correr este import lo RESUCITA.",
  "--     No lo corras en cada deploy (el GitHub Action no lo hace). Ver README.",
  // Sin PRAGMA/BEGIN TRANSACTION: D1 remoto rechaza transacciones explicitas.
  // Es FK-safe por construccion (padres del seed + orden evento->servicio->pago)
  // y todo es INSERT OR IGNORE (idempotente).
  "",
  "-- eventos_mantenimiento (+ servicios + pagos)",
];

let evCount = 0;
for (const r of events) {
  const eventId = clean(r.event_id);
  if (!eventId) continue;
  const car = (r.car ?? "").trim().toLowerCase();
  const vehicleId = car === "optra" || car === "clio" ? VEHICULO_ID_BY_SLUG[car] : null;

  const key = (r.service_type_key ?? "").trim();
  if (!TIPO_BY_KEY[key]) {
    warnings.push(`${eventId}: service_type_key desconocido "${key}"`);
  }

  const vendorRaw = clean(r.vendor);
  const vendorId = vendorRaw ? (TALLER_ID_BY_ALIAS[vendorRaw.toLowerCase()] ?? null) : null;

  const source = clean(r.source);
  const moneySource = source === "ynab" || source === "merged" ? "ynab" : "historical";
  const label = clean(r.service_type_label);

  // Evento (idempotente por PK id / UNIQUE client_id).
  lines.push(
    insertOrIgnore("eventos_mantenimiento", {
      id: eventId,
      vehicle_id: vehicleId,
      service_date: clean(r.date),
      odometer: num(r.odometer_km),
      odometer_unit: "km",
      title: label,
      description: clean(r.description),
      vendor_id: vendorId,
      vendor_name: vendorRaw,
      performed_by: vendorRaw ? "shop" : null,
      source,
      client_id: eventId,
      confidence: num(r.confidence),
      needs_review: isTrue(r.needs_review),
      raw_text: clean(r.notes),
      logged_by: "import",
      approved_at: null,
      created_at: nowIso,
    }),
  );

  // Servicio (puente evento<->tipo). Costo de linea = monto del evento.
  // Solo si la key existe en el vocabulario: evita filas huerfanas (FK a tipos_servicio
  // no se enforcea con PRAGMA foreign_keys=OFF).
  if (key && TIPO_BY_KEY[key]) {
    lines.push(
      insertOrIgnore("evento_servicios", {
        event_id: eventId,
        service_type_key: key,
        line_cost: num(r.amount_usdt) ?? num(r.amount),
      }),
    );
  }

  // Pago (enlace al dinero). ynab_transaction_id vacio en el export -> se llena en F2.
  lines.push(
    insertOrIgnore("evento_pagos", {
      id: `${eventId}-pay1`,
      event_id: eventId,
      ynab_transaction_id: clean(r.ynab_transaction_id),
      notion_client_id: null,
      amount: num(r.amount),
      currency: clean(r.currency) ?? "USD",
      amount_usdt: num(r.amount_usdt),
      rate_used: num(r.rate_used),
      rate_source: clean(r.rate_source),
      money_source: moneySource,
      voided: false,
      created_at: nowIso,
    }),
  );
  evCount++;
}

/* ─────────────────────────── fuel.csv ─────────────────────────── */
const fuelCsv = readFileSync(resolve(root, "data", "fuel.csv"), "utf8");
const fuel: EventRow[] = parse(fuelCsv, {
  columns: true,
  skip_empty_lines: true,
  trim: false,
});

lines.push("", "-- fuel_logs (gasolina — aparte del mantenimiento)");
let fuelCount = 0;
for (const r of fuel) {
  const fuelId = clean(r.fuel_id);
  if (!fuelId) continue;
  const car = (r.car ?? "").trim().toLowerCase();
  const vehicleId = car === "optra" || car === "clio" ? VEHICULO_ID_BY_SLUG[car] : null;
  lines.push(
    insertOrIgnore("fuel_logs", {
      id: fuelId,
      client_id: fuelId,
      vehicle_id: vehicleId,
      fuel_date: clean(r.date),
      amount_usdt: num(r.amount_usd),
      currency: clean(r.currency) ?? "USD",
      liters: num(r.liters),
      vendor: clean(r.vendor),
      owner: clean(r.owner),
      ynab_transaction_id: null,
      source: clean(r.source),
      notes: clean(r.notes),
      created_at: nowIso,
    }),
  );
  fuelCount++;
}

lines.push("");

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, lines.join("\n"), "utf8");

console.log(`import.sql escrito: ${evCount} eventos, ${fuelCount} cargas de gasolina -> ${OUT}`);
if (warnings.length) {
  console.warn(`\n⚠️  ${warnings.length} advertencias:`);
  for (const w of warnings) console.warn("  - " + w);
} else {
  console.log("Sin advertencias (todos los service_type_key existen en el vocabulario).");
}
