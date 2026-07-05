/**
 * Frontera de auth doble (PLAN.md §6):
 *   - Agentes (Cap/Maruita): header `X-Cap-Auth: <secreto>` == CAP_AUTH_TOKEN.
 *   - Humanos: JWT de Cloudflare Access (re-verificado contra las JWKS del team,
 *     con chequeo de `aud`). En local, DEV_AUTH_BYPASS deja pasar sin Access.
 *
 * Defensa en profundidad: aunque Access ya filtra en el borde, el Worker
 * re-verifica el JWT para no confiar ciegamente en headers.
 */
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { MiddlewareHandler } from "hono";
import type { AppEnv, Principal } from "../types";

// Cache de JWKS por team domain (se reusa entre requests en el mismo isolate).
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getJwks(teamDomain: string) {
  let jwks = jwksCache.get(teamDomain);
  if (!jwks) {
    const url = new URL(`https://${teamDomain}/cdn-cgi/access/certs`);
    jwks = createRemoteJWKSet(url);
    jwksCache.set(teamDomain, jwks);
  }
  return jwks;
}

/** Comparacion en tiempo constante para el secreto de agentes. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function verifyAccessJwt(
  token: string,
  teamDomain: string,
  aud: string,
): Promise<Principal | null> {
  try {
    const jwks = getJwks(teamDomain);
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `https://${teamDomain}`,
      audience: aud,
    });
    const email = (payload.email as string | undefined) ?? "unknown";
    return { type: "human", email };
  } catch {
    return null;
  }
}

export const auth = (): MiddlewareHandler<AppEnv> => async (c, next) => {
  const env = c.env;

  // 1) Agente por header compartido.
  const capAuth = c.req.header("X-Cap-Auth");
  if (capAuth && env.CAP_AUTH_TOKEN && timingSafeEqual(capAuth, env.CAP_AUTH_TOKEN)) {
    c.set("principal", { type: "agent", id: "x-cap-auth" });
    return next();
  }
  // Si mandaron X-Cap-Auth pero no coincide, rechazamos de una.
  if (capAuth) {
    return c.json({ error: "X-Cap-Auth invalido" }, 401);
  }

  // 2) Humano por Cloudflare Access JWT.
  const jwt =
    c.req.header("Cf-Access-Jwt-Assertion") ?? getCookie(c.req.header("Cookie"), "CF_Authorization");
  if (jwt && env.ACCESS_TEAM_DOMAIN && env.ACCESS_AUD) {
    const principal = await verifyAccessJwt(jwt, env.ACCESS_TEAM_DOMAIN, env.ACCESS_AUD);
    if (principal) {
      c.set("principal", principal);
      return next();
    }
    return c.json({ error: "JWT de Access invalido" }, 401);
  }

  // 3) Bypass de desarrollo (no hay Access en local).
  if (env.DEV_AUTH_BYPASS === "true") {
    c.set("principal", { type: "human", email: "dev@localhost" });
    return next();
  }

  return c.json({ error: "No autenticado" }, 401);
};

function getCookie(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return undefined;
}
