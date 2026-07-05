/**
 * Cliente de Google OAuth 2.0 + Google Calendar (REST, sin SDK — corre en el Worker).
 * Flujo: connect -> consent de Google -> callback intercambia el code por un
 * refresh_token (se guarda en app_config) -> se crean eventos en el calendario
 * "Hogar" invitando a los 2 correos del hogar.
 *
 * Credenciales (las pone el usuario tras el setup de Google Cloud — ver
 * GCLOUD_SETUP.md): GOOGLE_CLIENT_ID (var) + GOOGLE_CLIENT_SECRET (secret).
 */
import type { Env } from "../types";

/** Invitados fijos del hogar (reciben la invitación en su Google Calendar). */
export const CALENDAR_INVITEES = ["capuzr@gmail.com", "mariaeugeniaalvarezb@gmail.com"];

const OAUTH_SCOPES = ["openid", "email", "https://www.googleapis.com/auth/calendar"];
const CAL_TZ = "America/Caracas";

export function googleConfigured(env: Env): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

export function buildAuthUrl(env: Env, redirectUri: string, state: string): string {
  const p = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: OAUTH_SCOPES.join(" "),
    access_type: "offline", // pide refresh_token
    prompt: "consent", // fuerza re-consent -> siempre devuelve refresh_token
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  id_token?: string;
}

export async function exchangeCode(env: Env, code: string, redirectUri: string): Promise<TokenResponse> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID ?? "",
      client_secret: env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`token exchange ${res.status}: ${await res.text()}`);
  return (await res.json()) as TokenResponse;
}

export async function refreshAccessToken(env: Env, refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID ?? "",
      client_secret: env.GOOGLE_CLIENT_SECRET ?? "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`token refresh ${res.status}: ${await res.text()}`);
  const j = (await res.json()) as TokenResponse;
  return j.access_token;
}

export async function fetchUserEmail(accessToken: string): Promise<string | null> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const j = (await res.json()) as { email?: string };
  return j.email ?? null;
}

/** Encuentra el calendario "Hogar"; si no existe, lo crea. */
export async function ensureHomeCalendar(accessToken: string): Promise<{ id: string; name: string }> {
  const listRes = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (listRes.ok) {
    const j = (await listRes.json()) as { items?: { id: string; summary: string }[] };
    const found = j.items?.find((c) => (c.summary ?? "").toLowerCase() === "hogar");
    if (found) return { id: found.id, name: found.summary };
  }
  const createRes = await fetch("https://www.googleapis.com/calendar/v3/calendars", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ summary: "Hogar", timeZone: CAL_TZ }),
  });
  if (!createRes.ok) throw new Error(`crear calendario ${createRes.status}: ${await createRes.text()}`);
  const c = (await createRes.json()) as { id: string; summary: string };
  return { id: c.id, name: c.summary };
}

export interface CalendarEventInput {
  summary: string;
  description?: string;
  date: string; // YYYY-MM-DD
  time?: string | null; // HH:MM (null = todo el día)
}

export async function createCalendarEvent(
  accessToken: string,
  calendarId: string,
  ev: CalendarEventInput,
): Promise<{ id: string; htmlLink: string }> {
  const body: Record<string, unknown> = {
    summary: ev.summary,
    description: ev.description ?? "",
    attendees: CALENDAR_INVITEES.map((email) => ({ email })),
    reminders: { useDefault: true },
  };
  if (ev.time) {
    const [h, m] = ev.time.split(":").map(Number);
    const endH = (h + 1) % 24;
    const endDate = endH <= h ? addDays(ev.date, 1) : ev.date;
    const pad = (n: number) => String(n).padStart(2, "0");
    body.start = { dateTime: `${ev.date}T${pad(h)}:${pad(m)}:00`, timeZone: CAL_TZ };
    body.end = { dateTime: `${endDate}T${pad(endH)}:${pad(m)}:00`, timeZone: CAL_TZ };
  } else {
    body.start = { date: ev.date };
    body.end = { date: addDays(ev.date, 1) }; // fin exclusivo para todo-el-día
  }
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) throw new Error(`crear evento ${res.status}: ${await res.text()}`);
  const j = (await res.json()) as { id: string; htmlLink: string };
  return { id: j.id, htmlLink: j.htmlLink };
}

export async function deleteCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
    { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } },
  );
  // 404/410 = ya no existe -> lo tratamos como éxito.
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(`borrar evento ${res.status}: ${await res.text()}`);
  }
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
