/** Bindings del Worker (wrangler.jsonc: d1_databases, vars, secrets). */
export interface Env {
  DB: D1Database;
  // Secreto compartido con los agentes (header X-Cap-Auth). Va por wrangler secret.
  CAP_AUTH_TOKEN?: string;
  // Cloudflare Access (verificacion del JWT de humanos).
  ACCESS_TEAM_DOMAIN?: string; // p.ej. miorg.cloudflareaccess.com
  ACCESS_AUD?: string; // Application Audience (AUD) tag
  // Solo dev: deja pasar humanos sin Access (no existe Access en local).
  DEV_AUTH_BYPASS?: string;
}

/** Identidad resuelta por el middleware de auth. */
export type Principal =
  | { type: "agent"; id: string }
  | { type: "human"; email: string };

/** Variables de contexto de Hono. */
export interface Variables {
  principal: Principal;
}

export type AppEnv = { Bindings: Env; Variables: Variables };
