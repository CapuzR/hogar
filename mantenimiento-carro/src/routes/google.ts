/**
 * Rutas de conexión con Google Calendar (OAuth 2.0).
 *   GET  /api/google/status      -> estado (configurado / conectado / correo / calendario)
 *   GET  /api/google/connect     -> redirige al consent de Google
 *   GET  /api/google/callback    -> intercambia el code, guarda refresh token + calendario "Hogar"
 *   POST /api/google/disconnect  -> olvida la conexión
 */
import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { getDb } from "../db/client";
import { CFG, deleteConfig, getConfig, setConfig } from "../lib/config";
import {
  buildAuthUrl,
  CALENDAR_INVITEES,
  ensureHomeCalendar,
  exchangeCode,
  fetchUserEmail,
  googleConfigured,
} from "../lib/google";
import type { AppEnv } from "../types";
import type { Context } from "hono";

export const googleRouter = new Hono<AppEnv>();

function callbackUri(c: Context<AppEnv>): string {
  return `${new URL(c.req.url).origin}/api/google/callback`;
}

googleRouter.get("/status", async (c) => {
  const db = getDb(c.env.DB);
  const refresh = await getConfig(db, CFG.googleRefreshToken);
  return c.json({
    configured: googleConfigured(c.env),
    connected: Boolean(refresh),
    email: await getConfig(db, CFG.googleEmail),
    calendarName: await getConfig(db, CFG.googleCalendarName),
    invitees: CALENDAR_INVITEES,
  });
});

googleRouter.get("/connect", (c) => {
  if (!googleConfigured(c.env)) return c.redirect("/ajustes?google=missing");
  const state = crypto.randomUUID();
  setCookie(c, "g_oauth_state", state, {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === "https:",
    sameSite: "Lax",
    path: "/",
    maxAge: 600,
  });
  return c.redirect(buildAuthUrl(c.env, callbackUri(c), state));
});

googleRouter.get("/callback", async (c) => {
  const db = getDb(c.env.DB);
  const url = new URL(c.req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const saved = getCookie(c, "g_oauth_state");

  if (url.searchParams.get("error")) return c.redirect("/ajustes?google=denied");
  if (!code || !state || !saved || state !== saved) return c.redirect("/ajustes?google=error");

  try {
    const tok = await exchangeCode(c.env, code, callbackUri(c));
    if (!tok.refresh_token) return c.redirect("/ajustes?google=norefresh");
    const email = await fetchUserEmail(tok.access_token);
    const cal = await ensureHomeCalendar(tok.access_token);
    await setConfig(db, CFG.googleRefreshToken, tok.refresh_token);
    await setConfig(db, CFG.googleCalendarId, cal.id);
    await setConfig(db, CFG.googleCalendarName, cal.name);
    if (email) await setConfig(db, CFG.googleEmail, email);
    return c.redirect("/ajustes?google=connected");
  } catch (e) {
    console.error("google callback error:", e);
    return c.redirect("/ajustes?google=error");
  }
});

googleRouter.post("/disconnect", async (c) => {
  const db = getDb(c.env.DB);
  await deleteConfig(db, [
    CFG.googleRefreshToken,
    CFG.googleCalendarId,
    CFG.googleCalendarName,
    CFG.googleEmail,
  ]);
  return c.json({ ok: true });
});
