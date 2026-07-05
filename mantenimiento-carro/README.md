# Mantenimiento de Carros — Optra & Clio

Ledger de **mantenimiento mecánico** para 2 carros (Chevrolet Optra 2011 · Renault Clio 2008).
Un solo **Cloudflare Worker** (Hono) expone la API JSON y sirve la SPA de React; los datos viven en **D1** (SQLite).

> Diseño maestro: [`PLAN.md`](PLAN.md). Este README es el manual de operación.

**Qué ES:** registra el hecho mecánico (qué servicio, a qué carro, odómetro, fecha, taller) y lo enlaza al pago que ya vive en YNAB.
**Qué NO ES:** no captura gastos ni escribe en YNAB; no maneja recibos. La gasolina va en una tabla aparte (`fuel_logs`).

---

## Stack

| Capa | Tecnología |
|---|---|
| Backend | Cloudflare Worker + **Hono** |
| Datos | **D1** (SQLite) + **Drizzle ORM** + drizzle-kit |
| Frontend | React + Vite + Tailwind + componentes estilo shadcn/ui |
| Auth | Cloudflare Access (One-time PIN) para humanos · `X-Cap-Auth` para agentes |
| Deploy | Wrangler + GitHub Actions |

---

## Estructura

```
src/                    Worker (Hono)
  index.ts              app: monta /api/* y deja la SPA a los assets
  db/schema.ts          esquema Drizzle (fuente de verdad, §7)
  db/client.ts          instancia Drizzle sobre el binding DB
  middleware/auth.ts    Access JWT (humanos) + X-Cap-Auth (agentes)
  lib/                  normalize (texto->tipo), write-event, events (query), schemas
  routes/               events, cars, service-types, ingest (v1), fuel, stats
  seed/                 vehiculos, tipos_servicio (§8), talleres (§11) — datos tipados
web/                    SPA React (Vite)
scripts/                seed.ts + import.ts -> generan SQL para wrangler d1 execute
migrations/             SQL versionado (drizzle-kit)
data/                   events.csv (45) · fuel.csv (88) · reconcile_report.md
```

---

## Puesta en marcha local

```bash
npm install

# 1) Crear la base local + esquema + datos (todo en la D1 local de miniflare)
npm run db:migrate:local     # aplica migrations/ a la D1 local
npm run db:seed:local        # carros + vocabulario + talleres
npm run db:import:local      # carga events.csv (45) y fuel.csv (88)
#    atajo de los 3:  npm run db:reset:local

# 2) Variables locales
cp .dev.vars.example .dev.vars   # deja DEV_AUTH_BYPASS=true para entrar sin Access

# 3) Levantar
npm run dev      # api (wrangler :8787) + web (vite :5173) con proxy /api
#   o solo la API:  npm run dev:api   ->  http://localhost:8787
```

En dev, `DEV_AUTH_BYPASS=true` deja pasar a los humanos sin Cloudflare Access (no existe Access en local).

Comandos útiles: `npm run typecheck` · `npm run build` (SPA → `dist/`).

---

## Despliegue a producción (una sola vez)

### 1. Crear la base D1 y pegar el id

```bash
npx wrangler d1 create mantenimiento
# copia el "database_id" que imprime -> wrangler.jsonc -> d1_databases[0].database_id
```

### 2. Bootstrap de datos remotos

```bash
npx wrangler d1 migrations apply mantenimiento --remote
npm run db:seed:remote       # referencia (idempotente)
npm run db:import:remote     # carga inicial de events.csv + fuel.csv  ← SOLO UNA VEZ
```

> El import es un bootstrap único. El GitHub Action **no** lo re-corre para no re-crear eventos
> que hayas descartado desde la UI. Las migraciones y el seed sí corren en cada deploy (idempotentes).

### 3. Secreto de agentes

```bash
npx wrangler secret put CAP_AUTH_TOKEN     # el secreto que compartirán Cap/Maruita en X-Cap-Auth
```

### 4. Cloudflare Access — One-time PIN (humanos)

En el dashboard de Cloudflare → **Zero Trust → Access → Applications**:

1. **Add an application → Self-hosted.** Dominio: el del Worker (`mantenimiento-carro.<tu-subdominio>.workers.dev`).
2. **Identity providers:** habilita **One-time PIN** (no requiere Google ni nada más).
3. **Policy (Allow):** *Include → Emails →* agrega los 2 correos permitidos (tú y Maru).
4. **Path:** protege todo **excepto** la ruta de agentes. Deja `/(api/v1/.*)` fuera (Bypass) para que los agentes usen `X-Cap-Auth`.
   - App 1 (humanos): protege `/*`.
   - App 2 (bypass agentes): sobre `/api/v1/*` y `/api/agent/*`, política **Bypass → Everyone** (los protege el header, no Access).
5. Copia el **Team domain** (`<org>.cloudflareaccess.com`) y el **AUD** de la app humana a `wrangler.jsonc → vars`:
   - `ACCESS_TEAM_DOMAIN` = `<org>.cloudflareaccess.com`
   - `ACCESS_AUD` = el Application Audience (AUD) tag

El Worker **re-verifica** el JWT de Access contra las JWKS del team domain (defensa en profundidad).
Si `ACCESS_TEAM_DOMAIN`/`ACCESS_AUD` están vacíos y `DEV_AUTH_BYPASS` no es `"true"`, el Worker responde 401.

### 5. GitHub Actions

En el repo → Settings → Secrets and variables → Actions, agrega:

- `CLOUDFLARE_API_TOKEN` (permiso *Edit Cloudflare Workers* + *D1*).
- `CLOUDFLARE_ACCOUNT_ID`.

Cada push a `main` corre [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml): typecheck → build → migraciones remotas → seed → `wrangler deploy`.

---

## API

Base: `/api`. Todo requiere auth (Access humano **o** `X-Cap-Auth`), salvo `/api/health`.

### Humanos / SPA
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/events` | lista filtrable: `?car=optra&system=engine&service_type=oil_change&needs_review=true&from=&to=&q=` |
| GET | `/api/events/:id` | un evento |
| POST | `/api/events` | alta manual |
| PATCH | `/api/events/:id` | editar / aprobar (`{"approve":true}`) |
| DELETE | `/api/events/:id` | descartar (borra servicios y pagos) |
| GET | `/api/cars` | vehículos + agregados |
| GET | `/api/service-types` | vocabulario por sistema |
| GET | `/api/fuel` | cargas de gasolina |
| GET | `/api/stats` | dashboard (por carro / sistema / mes) |

### Agentes (Cap / Maruita) — `X-Cap-Auth`
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/v1/events` | alta **idempotente** por `client_id` (replay → 200 + `Idempotent-Replay: true`) |
| POST | `/api/v1/events:batch` | hasta 50 |
| POST | `/api/v1/events:normalize` | dry-run texto → `service_type_key` |
| GET | `/api/v1/events?client_id=…` | lookup por `client_id` |

```bash
curl -X POST https://<host>/api/v1/events \
  -H "X-Cap-Auth: $CAP_AUTH_TOKEN" -H "Content-Type: application/json" \
  -d '{
    "client_id": "cap-evt-2026-07-03-optra-aceite",
    "car": "optra", "date": "2026-07-03", "odometer": 158400,
    "service_type": "oil_and_filter_change",
    "text": "Cambio de aceite y filtro al Optra en Pachecos",
    "vendor": "Yirmen Pachecos", "performed_by": "shop", "source": "cap",
    "payments": [{ "ynab_transaction_id": "b1f2..." }]
  }'
```

Si mandas `text` en vez de `service_type`, el Worker normaliza con el lexicon ES/EN
(determinista, sin LLM). Sin match → `other_service` + `needs_review`.

---

## Cola de revisión

Los 15 eventos con `needs_review=true` (carro ambiguo, estimado vs final, tipo dudoso) se resuelven
desde la UI (**Cola de revisión**): asignar carro, editar monto/tipo, **Aprobar** (marca `confidence=1.0`,
`needs_review=0`, registra `approved_at` + `logged_by`) o **Descartar**. Hay acciones en lote.

---

## Roadmap

- **Fase 2 (YNAB):** cron pull read-only (`server_knowledge`), clasificar gasto de carro, enlazar a `evento_pagos`.
- **Fase 3:** recordatorios (`recordatorios`), reportes proactivos.

Pendiente del usuario: odómetro actual de cada carro; confirmar los `needs_review`.
