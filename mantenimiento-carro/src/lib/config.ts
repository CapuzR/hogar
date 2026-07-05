/**
 * Almacén clave/valor en D1 (`app_config`) para estado del servidor que no cabe
 * en secrets (p. ej. el refresh token de Google y el id del calendario "Hogar",
 * que se obtienen en runtime tras el OAuth).
 */
import { eq } from "drizzle-orm";
import type { Db } from "../db/client";
import { appConfig } from "../db/schema";
import { nowIso } from "./id";

/** Claves conocidas de `app_config`. */
export const CFG = {
  googleRefreshToken: "google_refresh_token",
  googleCalendarId: "google_calendar_id",
  googleCalendarName: "google_calendar_name",
  googleEmail: "google_email",
} as const;

export async function getConfig(db: Db, key: string): Promise<string | null> {
  const rows = await db.select().from(appConfig).where(eq(appConfig.key, key)).limit(1);
  return rows[0]?.value ?? null;
}

export async function setConfig(db: Db, key: string, value: string): Promise<void> {
  await db
    .insert(appConfig)
    .values({ key, value, updatedAt: nowIso() })
    .onConflictDoUpdate({ target: appConfig.key, set: { value, updatedAt: nowIso() } });
}

export async function deleteConfig(db: Db, keys: string[]): Promise<void> {
  for (const k of keys) await db.delete(appConfig).where(eq(appConfig.key, k));
}
