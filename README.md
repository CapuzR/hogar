# hogar

Monorepo de la **infraestructura del hogar** en Cloudflare (cuenta `ff4771186ee248e2186f7952ae4ce944`).
Se agrupa por **dominio de vida**. Cada worker se despliega independiente a `*.cap-tools.workers.dev`.

> ⚠️ **Repo PRIVADO, sin excepción.** Contiene lógica que toca datos **financieros** y **médicos**
> (fertilidad/embarazo). Nunca commitees secretos ni datos personales. Ver [`.gitignore`](.gitignore).

## Dominios

| Carpeta | Qué es | Deploy |
|---|---|---|
| [`finanzas/`](finanzas/) | Captura de gastos/ingresos → YNAB vía bot (Cap & Maruita). 7 workers. | `*.cap-tools.workers.dev` |
| [`mantenimiento-carro/`](mantenimiento-carro/) | App (Hono + D1 + SPA), ledger de mantenimiento + captura por bot. | worker propio |
| [`fertilidad/`](fertilidad/) | Workers Notion + UI del proceso de fertilidad. | workers + Pages |
| [`embarazo/`](embarazo/) | Arranca la semana del 2026-07-06. | por definir |
| [`packages/`](packages/) | Código compartido (futuro): cliente YNAB, cliente Notion, auth `X-Cap-Auth`. | — |
| [`docs/`](docs/) | [`CONTEXT.md`](docs/CONTEXT.md) — handoff de la captura YNAB. | — |

## Cómo pegar el código de cada worker

Cada worker tiene su carpeta con `wrangler.toml` (el `name` ya coincide con el del dashboard)
y `src/index.js`. Los que dicen `TODO: pegar código`:

1. Abre el dashboard → **Workers & Pages** → el worker → **Edit code**.
2. Copia el contenido de su `src/index.js` y pégalo en el archivo local.

Los 2 de finanzas (`fetch-exchange-rate`, `write-ynab-transaction`) ya traen el **código real**
copiado de `maruitaycap/workers/`.

> ⚠️ **Compatibility date/flags:** cada `wrangler.toml` trae un `compatibility_date` placeholder.
> Antes de deployar por Git, copia el valor real desde el **dashboard (Settings)** de cada worker
> para no cambiarle el comportamiento. Descomenta `compatibility_flags` si el worker lo usa.

## Deploy (Cloudflare Workers Builds — Git)

1. Sube este repo a GitHub **privado** (sugerido: `CapuzR/hogar`).
2. Por cada worker/app: dashboard → el worker → **Settings → Builds → Connect** a `CapuzR/hogar`, con:
   - **Root directory:** ej. `finanzas/workers/fetch-exchange-rate`
   - **Build watch paths:** ej. `finanzas/workers/fetch-exchange-rate/*`
   - **Deploy command:** `npx wrangler deploy`
3. Push a `main` → deploya **solo** lo que cambió. Ramas/PR → preview automáticos.

Un repo, deploys independientes: tocar un worker no redeploya a los demás.

## Fuera de este repo (a propósito)

- **Agentes** Cap & Maruita (OpenClaw en el droplet DigitalOcean) → viven con OpenClaw; llaman a
  estos workers por HTTP con `X-Cap-Auth`. La lógica conversacional (skills) no va aquí.
- **Negocios**: `mandarina` (usamandarina.com, ya en `CapuzR/landing-mandarina`), `prixpon`,
  `prixelart` → no son "hogar"; repos aparte.
