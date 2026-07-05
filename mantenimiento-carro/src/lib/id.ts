import { ulid } from "ulidx";

/** ULID en minusculas con prefijo, p.ej. `evt_01j...`. Ordenable por tiempo. */
export function newId(prefix: string): string {
  return `${prefix}_${ulid().toLowerCase()}`;
}

/** Fecha-hora ISO (UTC) para columnas *_at. */
export function nowIso(): string {
  return new Date().toISOString();
}
