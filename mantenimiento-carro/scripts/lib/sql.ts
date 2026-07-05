/**
 * Helpers para emitir SQL (SQLite/D1) desde los scripts de Node.
 * Generamos archivos .sql que se aplican con `wrangler d1 execute --file`.
 */

export type SqlValue = string | number | boolean | null | undefined | object;

/** Serializa un valor JS a un literal SQL seguro. */
export function lit(v: SqlValue): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") {
    if (!Number.isFinite(v)) throw new Error(`Numero no finito en SQL: ${v}`);
    return String(v);
  }
  if (typeof v === "boolean") return v ? "1" : "0";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return `'${s.replace(/'/g, "''")}'`;
}

/** INSERT ... ON CONFLICT(pk) DO UPDATE (upsert idempotente por PK). */
export function upsert(
  table: string,
  row: Record<string, SqlValue>,
  conflictCols: string[],
): string {
  const cols = Object.keys(row);
  const values = cols.map((c) => lit(row[c]));
  const updates = cols
    .filter((c) => !conflictCols.includes(c))
    .map((c) => `${c}=excluded.${c}`);
  const onConflict =
    updates.length > 0
      ? `ON CONFLICT(${conflictCols.join(", ")}) DO UPDATE SET ${updates.join(", ")}`
      : `ON CONFLICT(${conflictCols.join(", ")}) DO NOTHING`;
  return `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${values.join(", ")}) ${onConflict};`;
}

/** INSERT OR IGNORE (idempotente ante cualquier conflicto de PK/UNIQUE). */
export function insertOrIgnore(table: string, row: Record<string, SqlValue>): string {
  const cols = Object.keys(row);
  const values = cols.map((c) => lit(row[c]));
  return `INSERT OR IGNORE INTO ${table} (${cols.join(", ")}) VALUES (${values.join(", ")});`;
}

/** INSERT ... ON CONFLICT DO NOTHING (idempotente; no pisa ediciones existentes). */
export function insertIgnore(
  table: string,
  row: Record<string, SqlValue>,
  conflictCols: string[],
): string {
  const cols = Object.keys(row);
  const values = cols.map((c) => lit(row[c]));
  return `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${values.join(
    ", ",
  )}) ON CONFLICT(${conflictCols.join(", ")}) DO NOTHING;`;
}
