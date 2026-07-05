/**
 * Genera scripts/generated/seed.sql con la data de referencia:
 *   vehiculos (2) + tipos_servicio (todo §8) + talleres (§11.0).
 * Idempotente (upsert por PK). Aplicar con:
 *   wrangler d1 execute mantenimiento --local --file=scripts/generated/seed.sql
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { VEHICULOS } from "../src/seed/vehiculos.ts";
import { TIPOS_SERVICIO } from "../src/seed/tipos_servicio.ts";
import { TALLERES } from "../src/seed/talleres.ts";
import { upsert } from "./lib/sql.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "generated", "seed.sql");
const nowIso = new Date().toISOString();

const lines: string[] = [
  "-- GENERADO por scripts/seed.ts — no editar a mano.",
  "-- Data de referencia: vehiculos + tipos_servicio + talleres.",
  "PRAGMA foreign_keys=OFF;",
  "BEGIN TRANSACTION;",
  "",
];

// ── vehiculos ──
lines.push("-- vehiculos");
for (const v of VEHICULOS) {
  lines.push(
    upsert(
      "vehiculos",
      {
        id: v.id,
        slug: v.slug,
        nickname: v.nickname,
        make: v.make,
        model: v.model,
        year: v.year,
        trim: v.trim,
        engine: v.engine,
        transmission_type: v.transmissionType,
        oil_spec: v.oilSpec,
        plate: v.plate,
        color: v.color,
        vin: v.vin,
        owner_name: v.ownerName,
        current_odometer: v.currentOdometer,
        odometer_unit: "km",
        is_active: true,
        created_at: nowIso,
      },
      ["id"],
    ),
  );
}
lines.push("");

// ── tipos_servicio ──
lines.push("-- tipos_servicio (vocabulario controlado §8)");
for (const t of TIPOS_SERVICIO) {
  lines.push(
    upsert(
      "tipos_servicio",
      {
        key: t.key,
        label_es: t.labelEs,
        system_key: t.systemKey,
        nature: t.nature,
        synonyms: t.synonyms, // -> JSON.stringify por el helper lit()
        default_interval_km: t.defaultIntervalKm ?? null,
        default_interval_months: t.defaultIntervalMonths ?? null,
        is_active: true,
      },
      ["key"],
    ),
  );
}
lines.push("");

// ── talleres ──
lines.push("-- talleres (§11.0)");
for (const s of TALLERES) {
  lines.push(
    upsert(
      "talleres",
      {
        id: s.id,
        name: s.name,
        aliases: s.aliases,
        vendor_type: s.vendorType,
        default_car_id: null,
        phone: null,
        location: s.location ?? null,
        notes: s.notes ?? null,
      },
      ["id"],
    ),
  );
}

lines.push("", "COMMIT;", "PRAGMA foreign_keys=ON;", "");

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, lines.join("\n"), "utf8");
console.log(
  `seed.sql escrito: ${VEHICULOS.length} vehiculos, ${TIPOS_SERVICIO.length} tipos_servicio, ${TALLERES.length} talleres -> ${OUT}`,
);
