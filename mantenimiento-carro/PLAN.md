# Plan — App de Mantenimiento de Carros

> **Estado:** v3 · **DEFINITIVO para desarrollo** · 2026-07-04
> **Decisiones confirmadas:** Hono (solo para el worker del app) · Cloudflare Access con **One-time PIN** (OTP por correo) para humanos · `X-Cap-Auth` (secreto compartido) para agentes · ambos carros **automáticos** · Optra **2011**.
> **Data base lista:** [`data/events.csv`](data/events.csv) (45 eventos de mantenimiento, $8.899) + [`data/fuel.csv`](data/fuel.csv) (88 cargas de gasolina, $1.069) + [`data/reconcile_report.md`](data/reconcile_report.md). Crudos en `raw/`, pipeline en `scripts/reconcile/`.
> **Siguiente:** desarrollar la Fase 1 en una sesión nueva (ver §15). Después, integrar los agentes OpenClaw.

Documento maestro de diseño. Reemplaza la propuesta visual v1 (que tenía R2/recibos y captura de gasto — ya corregido aquí).

---

## Tabla de contenido

1. [Contexto y alcance](#1-contexto-y-alcance)
2. [Principios de diseño](#2-principios-de-diseño)
3. [Arquitectura](#3-arquitectura)
4. [Cómo encaja con la flota existente](#4-cómo-encaja-con-la-flota-existente)
5. [Stack y estructura del repo](#5-stack-y-estructura-del-repo)
6. [Autenticación](#6-autenticación)
7. [Modelo de datos](#7-modelo-de-datos)
8. [Vocabulario de servicios](#8-vocabulario-de-servicios)
9. [API de ingesta (agentes)](#9-api-de-ingesta-agentes)
10. [Integración con YNAB (Fase 2)](#10-integración-con-ynab-fase-2)
11. [Carga inicial: CSV y conciliación](#11-carga-inicial-csv-y-conciliación)
12. [Roadmap](#12-roadmap)
13. [Decisiones abiertas](#13-decisiones-abiertas)
14. [Insumos que necesito del usuario](#14-insumos-que-necesito-del-usuario)
15. [Arranque en sesión nueva (Fase 1)](#15-arranque-en-sesión-nueva-fase-1)

---

## 1. Contexto y alcance

App privado para que **Ricardo y Maru** (esposa) lleven el historial de mantenimiento de **2 carros**:

| Slug | Carro | Transmisión | Color | Placa | Año |
|---|---|---|---|---|---|
| `optra` | Chevrolet Optra 1.8L Advance | Automática | Negro | AC374GA | 2011 ⚠️ |
| `clio` | Renault Clio 1.6L Hatchback | Automática | Azul | AHD31V | 2008 |

> ⚠️ **Optra:** el título dice **2011**; el perfil inicial decía 2009 — *confirmar*. Ambos carros son **automáticos**.

### Ficha de vehículos (semilla)

| Campo | Optra | Clio |
|---|---|---|
| Motor | 1.8L I4 | 1.6L I4 |
| Aceite | 15W-40 **sintético** | 15W-40 **semi-sintético** |
| Propietario (título) | Ruben Jose Anzart Arasme | Maria Elena Alvarez Bermudez |
| Puestos / ejes / peso | 5 / 2 ejes / 420 kg | 5 / 2 ejes / 435 kg |
| Odómetro actual | *pendiente (el usuario baja a mirar el tablero)* | *pendiente* |

Se trackea desde lo rutinario (aceite, aceite+filtro, batería, autolavado) hasta lo complejo (motor, caja, radiador, bomba de gasolina y su pila/relé, amortiguadores, latonería y pintura, etc.).

### Qué ES y qué NO ES este app

**ES** un **ledger de mantenimiento mecánico**: registra el *hecho* físico — qué servicio, a qué carro, con qué odómetro, en qué fecha, en qué taller, con qué descripción — y **enlaza** ese hecho con el *pago* que ya vive en YNAB.

**NO ES** un capturador de gastos. El registro de dinero ya lo hace tu flota existente (`notion-upsert-expense` → Notion, `write-ynab-transaction` → YNAB). Este app:

- ❌ nunca registra gastos ni escribe en YNAB;
- ❌ nunca maneja recibos/facturas (se eliminó R2 del plan);
- ✅ **enlaza** cada evento de mantenimiento con la(s) transacción(es) de YNAB que lo pagaron (`ynab_transaction_id`);
- ✅ en Fase 2 **jala** ese monto de YNAB en solo-lectura para mostrarlo.

La autoridad del dinero es **YNAB**. La autoridad del hecho mecánico es **este app**.

> **Alcance ampliado (2026-07-04):** el app también lleva un **registro de gasolina** (combustible) como dataset/tabla **aparte** de los eventos de mantenimiento — no se mezclan. Ver `fuel_logs` (§7.9) y `data/fuel.csv`.

---

## 2. Principios de diseño

- **Encaja con tu flota, no la reemplaza.** Mismo house style: idempotencia por `client_id`, auth por header, helper `jsonResponse`, chequeos defensivos de secretos, GET con self-doc.
- **Reutilizar antes que reimplementar.** Se apoya en `fetch-exchange-rate` (tasas) y en los patrones de `sync-ynab-meta` (pull de YNAB).
- **Alinear vocabulario con tus workers:** `client_id`, `amount_usdt`, `rate_used`, `rate_source`, `attributed_to`, `ynab_transaction_id`.
- **Taxonomía de servicios controlada** (Sistema → Tipo) para reportar gasto por sistema y no caer en texto libre.
- **Moneda por registro** con monto original preservado (dualidad USD/VES en Venezuela).
- **Todo en free tier de Cloudflare** ($0/mes).

---

## 3. Arquitectura

Un **único Cloudflare Worker** (Hono) que expone la API JSON **y** sirve la SPA de React. Frontera de auth doble: Access (humanos) + `X-Cap-Auth` (agentes).

```
┌─────────────┐   ┌──────────────┐   ┌───────────────────────────┐   ┌──────────────┐
│  EMISORES   │   │    AUTH      │   │      WORKER ÚNICO (Hono)   │   │ PERSISTENCIA │
├─────────────┤   ├──────────────┤   ├───────────────────────────┤   ├──────────────┤
│ Cap         │──▶│ X-Cap-Auth   │──▶│ /api/v1/events  (ingesta) │──▶│ D1 (SQLite)  │
│ Maruita     │   │ (secreto)    │   │ /api/events, /cars, ...   │   │  + Drizzle   │
├─────────────┤   ├──────────────┤   │ normaliza texto→service   │   │              │
│ Tú + Maru   │──▶│ Access OTP   │──▶│ sirve SPA React (assets)  │   │              │
│ (navegador) │   │ (correo, 2   │   │ run_worker_first:[/api/*] │   │              │
│             │   │  emails)     │   │                           │   │              │
├─────────────┤   └──────────────┘   ├───────────────────────────┤   └──────────────┘
│ YNAB (F2)   │◀───── Cron pull ─────│ jala transacciones (RO)   │
└─────────────┘   (server_knowledge) └───────────┬───────────────┘
                                                  │ reutiliza
                                                  ▼
                                   fetch-exchange-rate (tasas USD/VES, histórico)
```

**Nota:** un `POST` repetido con el mismo `client_id` devuelve el evento existente (`200`, `Idempotent-Replay: true`), nunca duplica. El worker del app es **el único con Hono**; los 6 workers existentes se quedan raw.

---

## 4. Cómo encaja con la flota existente

| Worker existente | Relación con el app |
|---|---|
| `notion-upsert-expense` | Sigue siendo el system-of-record del **gasto** (Notion). El app referencia estos gastos por `ynab_transaction_id` (y opcionalmente su `client_id` de Notion). |
| `write-ynab-transaction` | Espeja el gasto a YNAB (budget **"MR"**, denominado en **USD** → milliunits ×1000). El app **lee** esas transacciones; nunca escribe. |
| `sync-ynab-meta` | El app **copia sus patrones** para el pull de Fase 2 (mismo `YNAB_TOKEN`, budget "MR", milliunits, chunking por subrequests). |
| `fetch-exchange-rate` | El app lo **llama** para convertir montos históricos en Bs → USD durante la carga inicial. (Los montos que vienen de YNAB ya están en USD.) |
| `notion-export-ynab-csv` | Sin relación directa; referencia de estilo. |
| `reconcile-bank-statement` | Sin relación directa; referencia de patrón de matching. |

> Dado que el budget "MR" está en USD, **el dinero enlazado desde YNAB ya es USD** (milliunits/1000). La tasa solo hace falta para montos históricos en Bs.

---

## 5. Stack y estructura del repo

**Backend:** Cloudflare Worker + **Hono** · **D1** (SQLite) + **Drizzle ORM** + drizzle-kit (migraciones) · Workers static assets para servir la SPA.
**Frontend:** React + Vite + **Tailwind** + **shadcn/ui** (componentes copiados al repo).
**Deploy:** Wrangler + GitHub Actions (build Vite → `dist`, `d1 migrations apply --remote`, `wrangler deploy`).

```
mantenimiento-carro/
├─ wrangler.jsonc            # assets + d1_databases + vars/secrets + cron (F2)
├─ package.json
├─ drizzle.config.ts
├─ migrations/               # SQL versionado (drizzle-kit)
├─ src/
│  ├─ index.ts              # app Hono (monta rutas + assets)
│  ├─ middleware/
│  │  └─ auth.ts            # Access JWT (humanos) + X-Cap-Auth (agentes)
│  ├─ routes/
│  │  ├─ events.ts         # CRUD eventos + /api/v1/events (ingesta)
│  │  ├─ cars.ts           # GET /api/cars
│  │  ├─ service-types.ts  # GET /api/service-types
│  │  └─ ynab.ts           # F2: pull + linking
│  ├─ db/
│  │  └─ schema.ts         # Drizzle: fuente de verdad del esquema
│  ├─ lib/
│  │  └─ normalize.ts      # texto libre → service_type (lexicon ES/EN)
│  └─ seed/                 # vehiculos + tipos_servicio (+ sinónimos)
├─ web/                      # SPA React + Vite + Tailwind + shadcn/ui
│  └─ src/...
└─ scripts/
   └─ reconcile/            # pipeline Notion+WhatsApp+YNAB → events.csv
```

---

## 6. Autenticación

**Humanos (Ricardo + Maru).** Cloudflare Access delante de la SPA y las rutas humanas, con método de login **One-time PIN**: escribes tu correo → llega un código de 6 dígitos (expira 10 min) → solo entran los 2 correos del allowlist. Nativo, **gratis**, sin Google ni Resend. El worker re-verifica el JWT de Access contra las JWKS del team domain (defensa en profundidad, chequeo de `aud`).

**Agentes (Cap / Maruita).** La ruta de ingesta (`/api/v1/events` y `/api/agent/*`) queda **exenta de Access** y se protege con el header **`X-Cap-Auth`** (secreto compartido) — idéntico a tus 6 workers. Opcional a futuro: tokens distintos por agente para poder revocar/auditar por separado.

> Se descartó la propuesta anterior de service tokens de Access + firma HMAC para los agentes: era ceremonia innecesaria para un ledger que no mueve plata.

---

## 7. Modelo de datos

Tablas en D1 (SQLite), esquema en Drizzle. IDs `ULID` (TEXT). El **dinero no es autoritativo aquí**: vive en `evento_pagos` como enlace a YNAB (o como monto histórico para lo previo al bot).

### 7.1 `vehiculos`

| Columna | Tipo | Nota |
|---|---|---|
| `id` | TEXT PK | p. ej. `car_optra_2009` |
| `slug` | TEXT UNIQUE | `optra` \| `clio` (resuelve el carro en el payload) |
| `nickname` | TEXT | "el azul", "el de mi esposa" |
| `make` / `model` / `year` / `trim` | TEXT/INT | Chevrolet Optra 1.8 Advance 2009 · Renault Clio 1.6 2008 |
| `engine` | TEXT | `1.8L I4` \| `1.6L I4` |
| `transmission_type` | TEXT | manual \| automatic · **a confirmar** |
| `plate` / `color` / `vin` | TEXT | ayudan a atribuir eventos ("el rojo") |
| `current_odometer` | INTEGER | última lectura cacheada |
| `odometer_unit` | TEXT DEFAULT `km` | heredado por los registros |
| `is_active` | INT (bool) DEFAULT 1 | 0 si se vende/retira |
| `created_at` | TEXT (ISO dt) | |

### 7.2 `tipos_servicio` (vocabulario controlado)

| Columna | Tipo | Nota |
|---|---|---|
| `key` | TEXT PK | snake_case EN, p. ej. `oil_and_filter_change` |
| `label_es` | TEXT | "Cambio de aceite y filtro" |
| `system_key` | TEXT | sistema padre → gasto por sistema |
| `nature` | TEXT | routine \| repair \| inspection |
| `synonyms` | TEXT (JSON) | ES/EN para el normalizador |
| `default_interval_km` / `_months` | INTEGER | para recordatorios (F3), nullable |
| `is_active` | INT (bool) | retirar sin borrar historial |

### 7.3 `talleres`

| Columna | Tipo | Nota |
|---|---|---|
| `id` | TEXT PK | |
| `name` | TEXT | nombre canónico |
| `aliases` | TEXT (JSON) | variantes vistas en WhatsApp/YNAB |
| `vendor_type` | TEXT | dealer \| independent_shop \| chain \| parts_store \| mobile \| diy |
| `default_car_id` | TEXT FK → vehiculos | si solo atiende un carro (nullable) |
| `phone` / `location` / `notes` | TEXT | opcionales |

### 7.4 `eventos_mantenimiento` (tabla central — hechos mecánicos)

| Columna | Tipo | Nota |
|---|---|---|
| `id` | TEXT PK | asignado por el servidor |
| `vehicle_id` | TEXT FK → vehiculos | carro del evento |
| `service_date` | TEXT (ISO date) | fecha del servicio (no la de ingesta) |
| `odometer` / `odometer_unit` | INT / TEXT | lectura al momento del servicio |
| `title` | TEXT | "Servicio 100.000 km" |
| `description` | TEXT | detalle libre: partes, marca, cantidad, síntoma |
| `vendor_id` | TEXT FK → talleres | nullable si DIY |
| `vendor_name` | TEXT | nombre crudo si aún no normalizado |
| `performed_by` | TEXT | shop \| self |
| `source` | TEXT | cap \| maruita \| manual \| notion \| whatsapp \| ynab \| merged |
| `client_id` | TEXT UNIQUE | **idempotencia** (convención de tu flota) |
| `confidence` | REAL | 0–1, confianza de extracción/atribución (carga inicial) |
| `needs_review` | INT (bool) | 1 si carro/fecha ambiguo o `confidence < 0.70` |
| `raw_text` | TEXT | texto NL original preservado |
| `logged_by` | TEXT | auditoría: humano o token de agente |
| `created_at` | TEXT (ISO dt) | distinto de `service_date` |

### 7.5 `evento_servicios` (puente: varios servicios por visita)

| Columna | Tipo | Nota |
|---|---|---|
| `event_id` | TEXT FK → eventos_mantenimiento | |
| `service_type_key` | TEXT FK → tipos_servicio | |
| `line_cost` | REAL | costo atribuido a la línea (opcional) |
| **PK** | (event_id, service_type_key) | evita duplicar el mismo servicio |

### 7.6 `evento_pagos` (puente: enlace al dinero)

Un evento puede tener 0..N pagos (repuestos + mano de obra, cuotas). Cada fila es un enlace a YNAB **o** un monto histórico (previo al bot).

| Columna | Tipo | Nota |
|---|---|---|
| `id` | TEXT PK | |
| `event_id` | TEXT FK → eventos_mantenimiento | |
| `ynab_transaction_id` | TEXT | enlace a YNAB (nullable) · autoritativo cuando existe |
| `notion_client_id` | TEXT | enlace opcional al gasto en tu Notion Expenses |
| `amount` | REAL | monto original |
| `currency` | TEXT | USD \| VES \| VEF \| unknown |
| `amount_usdt` | REAL | monto normalizado a USD (convención de tu flota) |
| `rate_used` | REAL | tasa usada (de `fetch-exchange-rate`), nullable |
| `rate_source` | TEXT | binance-p2p \| dolarapi-paralelo \| manual |
| `money_source` | TEXT | ynab (real) \| historical \| manual_estimate |
| `created_at` | TEXT (ISO dt) | |

> Costo total del evento = Σ `amount_usdt` de sus `evento_pagos`. En MVP suele haber 1 fila; una reparación con partes+labor tiene varias.

### 7.7 `lecturas_odometro` (opcional)

Histórico de lecturas independientes (anotadas por un agente). Alimenta `current_odometer` y los recordatorios por distancia. Columnas: `id`, `vehicle_id` FK, `reading` INT, `unit`, `read_at`, `source`, `event_id` FK (opcional).

### 7.8 `recordatorios` (Fase 3)

La **regla** recurrente, separada del evento. Columnas: `id`, `vehicle_id` FK, `service_type_key` FK, `interval_distance`, `interval_months`, `trigger_mode` (default `whichever_first`), `baseline_date`, `baseline_odometer`, `lead_days`, `lead_distance`, `active`.

### 7.9 `fuel_logs` (combustible / gasolina)

Registro de cargas de gasolina, **separado** de los eventos de mantenimiento (distinta naturaleza y frecuencia — casi semanal). Fuente: YNAB categoría "⛽️ Gasolina".

| Columna | Tipo | Nota |
|---|---|---|
| `id` | TEXT (ULID) PK | |
| `vehicle_id` | TEXT FK → vehiculos | nullable: la mayoría de cargas no dicen el carro. |
| `fuel_date` | TEXT (ISO date) | |
| `amount_usdt` | REAL | monto en USD. |
| `currency` | TEXT | USD (budget "MR"). |
| `liters` | REAL | nullable (no está en la data histórica). |
| `vendor` | TEXT | Bomba Gasolina Trinidad, Gasolinera El Hatillo, etc. |
| `owner` | TEXT | Ricardo \| Maru \| Shared (según la cuenta). |
| `ynab_transaction_id` | TEXT | se poblará en Fase 2. |
| `source` | TEXT | ynab-gasolina \| ynab-mantenimiento(reclasificado). |

> **Eliminada** del plan la tabla `adjuntos`/R2: el app no maneja recibos.

---

## 8. Vocabulario de servicios

Taxonomía controlada (clave `snake_case` EN · etiqueta ES). Incluye todo lo que mencionó el usuario.

| Sistema (`system_key`) | Tipos (`key` → label_es) |
|---|---|
| **engine** (Motor) | `oil_change` Cambio de aceite · `oil_and_filter_change` Aceite y filtro · `air_filter_replacement` Filtro de aire · `spark_plugs_replacement` Bujías · `timing_belt_replacement` Correa de tiempo · `engine_tuneup` Afinamiento · `engine_repair_general` Reparación de motor · `engine_overhaul` Overhaul · `cylinder_head_repair` Culata/empaque · `oil_leak_repair` Fuga de aceite |
| **transmission** (Caja) | `transmission_fluid_change` Aceite de caja · `clutch_replacement` Embrague/croche · `transmission_repair_general` Reparación de caja · `transmission_rebuild` Reconstrucción · `cv_axle_replacement` Homocinética/palier |
| **brakes** (Frenos) | `brake_pads_replacement` Pastillas · `brake_rotors_replacement` Discos · `brake_shoes_replacement` Bandas/zapatas · `brake_fluid_change` Líquido de frenos · `brake_caliper_repair` Caliper |
| **suspension_steering** (Suspensión/Dirección) | `shock_absorber_replacement` Amortiguadores · `control_arm_replacement` Mesas/tijeretas · `ball_joint_replacement` Rótulas · `tie_rod_replacement` Terminales de dirección · `wheel_alignment` Alineación · `steering_rack_repair` Cremallera · `bushings_replacement` Bujes/gomas |
| **electrical_battery** (Eléctrico/Batería) | `battery_replacement` Batería · `alternator_repair` Alternador · `starter_repair` Arranque · `fuse_relay_replacement` Fusibles/relés · `wiring_repair` Cableado · `lights_bulbs_replacement` Bombillos · `ecu_diagnostics` Escaneo/diagnóstico |
| **cooling** (Refrigeración/Radiador) | `coolant_change` Refrigerante · `radiator_replacement` Cambio de radiador · `radiator_repair` Reparación de radiador · `water_pump_replacement` Bomba de agua · `thermostat_replacement` Termostato · `cooling_hose_replacement` Mangueras |
| **fuel_system** (Combustible) | `fuel_pump_replacement` Bomba de gasolina · `fuel_pump_relay_replacement` Pila/relé de la bomba · `fuel_filter_replacement` Filtro de gasolina · `fuel_injector_service` Inyectores · `throttle_body_cleaning` Cuerpo de aceleración |
| **body_paint** (Latonería/Pintura) | `bodywork_and_paint` Latonería y pintura · `dent_repair` Abolladuras · `bumper_repair` Parachoques · `windshield_glass_replacement` Parabrisas/vidrios |
| **cleaning_detailing** (Limpieza) | `car_wash` Autolavado · `full_detailing` Detallado/pulitura · `interior_cleaning` Interiores · `engine_bay_cleaning` Lavado de motor |
| **tires_wheels** (Cauchos) | `tire_replacement` Cambio de cauchos · `tire_rotation` Rotación · `tire_balancing` Balanceo · `flat_tire_repair` Pinchazo |
| **hvac** (Aire) | `ac_recharge` Recarga de gas · `ac_compressor_repair` Compresor A/C · `ac_system_repair` Sistema A/C |
| **inspections** (General) | `general_inspection` Revisión general · `ecu_diagnostics_scan` Scanner · `insurance` Seguro/póliza · `other_service` Otro |

---

## 9. API de ingesta (agentes)

**`POST /api/v1/events`** — write path primario de Cap/Maruita.

- **Auth:** header `X-Cap-Auth: <secreto>` (igual que tu flota). Ruta exenta de Access.
- **Idempotencia:** `client_id` único. Un segundo POST con el mismo `client_id` devuelve el evento existente (`200`, `Idempotent-Replay: true`), no duplica.
- **Normalización:** `service_type` puede venir como clave ya resuelta, o texto libre en `text` → el worker mapea con el lexicon ES/EN (determinista; sin LLM en el server). Sin match → `other_service` + `needs_review`.
- **Dinero:** normalmente **no** viaja monto (vive en YNAB). El agente puede pasar `payments[].ynab_transaction_id` para enlazar; o un `amount` para casos históricos sin transacción aún.

Complementos: `POST /api/v1/events:batch` (≤50) · `POST /api/v1/events:normalize` (dry-run texto→tipo) · `GET /api/cars` · `GET /api/service-types` · `GET /api/v1/events?client_id=…`.

```jsonc
// payload de ejemplo
{
  "client_id": "cap-evt-2026-07-03-optra-aceite",   // idempotencia
  "car": "optra",
  "date": "2026-07-03",
  "odometer": 158400,
  "service_type": "oil_and_filter_change",           // o "text" para normalizar
  "text": "Cambio de aceite y filtro al Optra en Taller José Luis, 158.400 km",
  "description": "Aceite 20W-50 sintético + filtro",
  "vendor": "Taller José Luis",
  "performed_by": "shop",
  "source": "cap",
  "payments": [
    { "ynab_transaction_id": "b1f2…" }               // enlace al pago (opcional)
  ]
}
```

```bash
# ejemplo curl (agente)
curl -X POST https://mant.example.workers.dev/api/v1/events \
  -H "X-Cap-Auth: $CAP_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$BODY"
```

---

### 9.1 Skill compartido de los agentes (Cap & Maruita)

Los agentes NO usan sus skills de gastos (`ynab-capture`, `maruita-capture`) para esto — esos quedan intactos y siguen mandando el **dinero** a YNAB. Se instala un **skill nuevo y compartido**: [`agents/car-maintenance/SKILL.md`](agents/car-maintenance/SKILL.md), que manda el **hecho mecánico** a esta app.

- **Reusa `CAP_AUTH_TOKEN`** (mismo secreto de la flota `*.cap-tools.workers.dev`) + header `User-Agent`. Sin token nuevo.
- **Complementario:** en un mismo turno, el skill de gastos escribe el $ a YNAB y este skill registra el evento; si tiene el `ynab_transaction_id` a mano, lo pasa en `payments[]` para enlazar al instante (si no, la Fase 2 lo casa por carro+fecha+monto).
- **Gasolina:** no se registra por el skill — la app la jala de YNAB en Fase 2.
- `source = cap | maruita`; la atribución es al **carro**, no a la persona.

**Endpoints que la app debe exponer para el skill** (además de la ingesta de §9):

| Método | Ruta | Rol |
|---|---|---|
| POST | `/api/v1/events` | Crear evento (idempotente por `client_id = mant-tg-{msg_id}`). |
| GET | `/api/service-types` | Vocabulario (key, label_es, synonyms) para normalizar texto→tipo. |
| GET | `/api/cars` | Slugs/apodos (`optra`, `clio`). |
| GET | `/api/v1/events?car=&service_type=&limit=` | Historial (para "¿cuándo fue el último cambio de aceite?"). |

Instalación: copiar la carpeta a `workspace/skills/car-maintenance/` en **ambos** droplets; opcional `MANTENIMIENTO_URL` en cada `.env`.

## 10. Integración con YNAB (Fase 2)

Pull **read-only** que reutiliza los patrones de `sync-ynab-meta`.

- **Cron Trigger** (mismo worker) hace pull delta de `transactions` vía `last_knowledge_of_server`, persistiendo el cursor tras procesar el batch.
- **Identifica gasto de carro** en capas: category group ("Carros"/"Transporte"), flag color, mapeo payee→carro, tag en memo (`#optra`/`#clio`). → **necesito que me digas cómo separas los carros en YNAB.**
- **Enlaza** cada transacción de carro a un evento existente (match por carro + fecha ±ventana; el budget "MR" está en USD, así que el monto ya es USD). Si no hay evento → lo deja como "gasto de carro sin enlazar" para un enlace de un tap, o crea un stub.
- Guarda el enlace en `evento_pagos` (`ynab_transaction_id`, `amount_usdt`, `money_source=ynab`).
- Maneja `deleted:true` de YNAB → marca el pago `voided`, sin hard-delete.

---

## 11. Carga inicial: CSV y conciliación

### 11.0 Insumos recibidos (2026-07-04)

| Fuente | Archivo | Contenido | Rol |
|---|---|---|---|
| YNAB | `Selected Transactions for MR ….tsv` | **79 transacciones** de la categoría "🚗 Mantenimiento Del Carro", Ene-2025 → Jul-2026, Outflow en **USD**, memo con Bs + descripción + a veces el carro. | **Verdad del dinero** (2025-2026). |
| Notion | `Historial de Mantenimiento ….md` | Cronología de **ambos carros** Oct-2022 → Abr-2026, con desglose Mano/Repuestos/Otros/Total en USD. | Verdad **mecánica** + dinero pre-bot (2022-2024). |
| Notion | `Historial - Optra ….csv` | Historial estructurado **solo del Optra** (8 eventos), se solapa con el `.md`. | Estructura de alta confianza (Optra). |
| Notion | `Checklist de Mantenimiento ….md` | Intervalos de referencia (aceite 5-8k km/6m, etc.). | Alimenta `default_interval_*` de `tipos_servicio`. |
| WhatsApp | `Chat … Yirmen Pachecos ….txt` | 2.140 líneas con el mecánico; presupuestos detallados intercalados. Notion ya lo destiló. | Respaldo de detalle/fecha. |
| YNAB (gasolina) | `Selected Transactions … 12-28.tsv` | **77 cargas** de la categoría "⛽️ Gasolina" + 11 reclasificadas de mantenimiento = **88**. | → `data/fuel.csv` (aparte del mantenimiento). |

**Cobertura temporal complementaria:** Notion/WhatsApp cubren 2022-2024 (pre-bot, sin transacción YNAB → pago histórico); YNAB cubre 2025-2026 (con `ynab_transaction_id`). El solapamiento 2025-2026 es la zona de dedup/enlace evento↔pago.

**Mapa de atribución:** literal — se menciona "Optra" o "Clio" en los textos. El principal taller es **Yirmen Pachecos** (Multiservicios Pachecos). Otros vendors vistos: Autolavado Piedra Azul, Cauchera Baruta, Bomba Gasolina Trinidad, Multirepuestos La Guairita, Carlos Azuaje A/C, Latonería y Pintura Yeiker, Duncan (batería), Multiservicios Barutech.

### 11.1 Esquema del CSV

`event_id · car · date · odometer_km · service_type_key · service_type_label · description · amount · currency · amount_usdt · rate_used · rate_source · vendor · ynab_transaction_id · source · source_ref · confidence · needs_review · notes`

```csv
event_id,car,date,odometer_km,service_type_key,description,amount,currency,amount_usdt,vendor,ynab_transaction_id,source,confidence,needs_review
MRG-20240315-001,optra,2024-03-15,142350,oil_and_filter_change,Aceite 20W-50 + filtro,45.00,USD,45.00,Taller José Luis,b1f2…,merged,0.95,false
YNB-20240402-003,clio,2024-04-02,,brake_pads_replacement,Pastillas delanteras,42.30,USD,42.30,Repuestos El Rápido,c3a9…,ynab,0.90,false
WA-20231102-004,clio,2023-11-02,,tire_replacement,2 cauchos rin 15,120.00,USD,120.00,Cauchera La Nacional,,whatsapp,0.70,true
NOT-20220820-001,optra,2022-08-20,128900,timing_belt_replacement,Correa + tensor + bba agua,300.00,USD,300.00,Taller José Luis,,notion,0.85,false
```

### 11.2 Proceso de conciliación (mejorado por tu stack)

**Insight clave:** como tu Notion Expenses / YNAB ya tiene los gastos de carro **estructurados** (con `amount_usdt`, `rate`, `ynab_transaction_id`), para los períodos que cubre tu bot puedo **jalar filas limpias directamente** (alta confianza, ya en USD, ya enlazadas a YNAB). Las otras fuentes cubren solo los huecos y los datos mecánicos.

1. **Congelar crudos** en `raw/` (solo-lectura) + manifest (sha256, conteos) para re-corridas reproducibles.
2. **Fuente monetaria = YNAB/Notion:** extraer las transacciones de carro ya estructuradas → estas traen `amount_usdt` + `ynab_transaction_id` (confianza alta, sin OCR).
3. **Fuente mecánica = WhatsApp + Notion-notas:** extraer odómetro, qué se hizo, taller, fecha del servicio (lo que el gasto no tiene).
4. **Normalizar:** fechas `dd/mm/yyyy` (VE) → ISO; servicio → `service_type_key` vía lexicon; Bs → USD con `fetch-exchange-rate` solo para lo previo al bot.
5. **Atribuir carro** (primer hit gana): clave explícita → mapa de apodos/placa/color → especificidad de parte → estructura YNAB → contexto WhatsApp → `unknown` + review.
6. **Enlazar hecho ↔ pago:** casar el evento mecánico (WhatsApp/Notion) con su transacción de YNAB (fecha ±ventana + carro + monto) → `evento_pagos`.
7. **Scoring de confianza** + `needs_review` para lo ambiguo.
8. **Emitir** `out/events.csv` + `out/events_review_queue.csv` + `dedupe_report.md`, y validar (enums, fechas ≤ hoy, sin `client_id` duplicados).

---

## 12. Roadmap

### Fase 1 — MVP (carga histórica + UI + ingesta)
- Scaffolding Worker (Hono) + D1 + Drizzle + `wrangler.jsonc` (assets + d1).
- Esquema y migraciones + seed de los 2 carros y del vocabulario (con sinónimos).
- Pipeline de conciliación → `events.csv` + `fuel.csv` + importador a D1.
- **Cola de revisión** en la UI: aprobar/editar/descartar cada evento `needs_review` (marca `confidence=1.0`, registra `logged_by` + `approved_at`); acciones en lote.
- Cloudflare Access (One-time PIN, 2 emails) + `X-Cap-Auth` en la ruta de ingesta.
- API `/api/v1/events` (+ `:batch`, `:normalize`, `GET /cars`, `GET /service-types`) con idempotencia por `client_id`.
- SPA React+Tailwind+shadcn/ui: tabla filtrable por carro/sistema, alta/edición, cola de `needs_review`, enlace manual a `ynab_transaction_id`.
- Deploy con GitHub Actions.

### Fase 2 — YNAB (pull read-only + linking)
- Cron delta (`server_knowledge`), clasificador de gasto de carro, enlace a eventos vía `evento_pagos`, manejo de `deleted`.
- Reutiliza `YNAB_TOKEN` / budget "MR" / patrones de `sync-ynab-meta`.

### Fase 3 — Proactivo (recordatorios + reportes)
- Tabla `recordatorios` ("lo que ocurra primero"), intervalos por defecto editables, estado OVERDUE/DUE_SOON/OK.
- Notificaciones + avisos de Cap/Maruita al registrar.
- Dashboard: gasto por carro, por sistema, por mes (con `amount_usdt`), timeline por carro.

---

## 13. Decisiones abiertas

| # | Pregunta | Estado / Recomendación |
|---|---|---|
| 1 | Transmisión de cada carro | ✅ **Resuelto:** ambos **automáticos**. |
| 1b | Año del Optra: 2009 (perfil) vs 2011 (título) | ⚠️ **Confirmar.** Se usa 2011 (título) por defecto. |
| 2 | Unidad de cuenta canónica del histórico | ✅ USD (`amount_usdt`) como unidad estable — confirmado por los datos: el budget YNAB "MR" está en USD y el historial de Notion ya está en USD. |
| 3 | ¿Trackear gasolina? | ✅ **Sí (nuevo):** se trackea en dataset/tabla **aparte** (`fuel.csv` / `fuel_logs`), separada del mantenimiento. 88 cargas ($1.069) cargadas. |
| 4 | Atribución de carro | ✅ **Resuelto:** mención literal "Optra"/"Clio". Autolavados → **4 Clio / 3 Optra** (alternan). Resto sin mención → cola de revisión. |
| 5 | Dominio | Arrancar con `*.workers.dev` (cero costo); dominio propio después es trivial. |
| 6 | ¿El `.md` de Historial cubre TODO el Clio? | Solo hay CSV estructurado del Optra; el Clio vive en el `.md` general. **Confirmar** si es el registro completo del Clio. |

---

## 14. Insumos que necesito del usuario

Prefiero exports (CSV/TXT) sobre capturas (el OCR corrompe montos/nombres en silencio).

1. **YNAB** → export del *Register* en **CSV** (Date, Payee, Category, Memo, Outflow…). Y dime **qué categorías/flags/#tags marcan gasto de carro** y **cómo distingues Optra vs Clio**.
2. **Notion** → export **Markdown & CSV** de las páginas/DB de mantenimiento (con subpáginas). Si tu Notion Expenses ya trae `ynab_transaction_id` para lo de carros, aún mejor: lo uso como fuente monetaria estructurada.
3. **WhatsApp** → *Exportar chat → Sin archivos multimedia → .txt*. Dime la **zona horaria** y el **locale** del teléfono (3:42 p. m. vs 15:42).
4. **Mapa de atribución** (mayor palanca): `optra → placa/color/apodos`; `clio → placa/color/apodos`.
5. **Semilla de vehículos:** transmisión (manual/auto), odómetro actual aprox., color, año/trim confirmados.

---

## 15. Arranque en sesión nueva (Fase 1)

Este documento es autosuficiente para levantar la Fase 1 desde cero. Orden sugerido para la sesión de desarrollo:

**Paso 0 — Scaffolding**
- `npm create cloudflare@latest` (Worker + assets) o Vite en `web/` + Worker en `src/`.
- Instalar: `hono`, `drizzle-orm`, `drizzle-kit`, `@cloudflare/workers-types`. Frontend: React, Vite, Tailwind, shadcn/ui.
- `wrangler.jsonc`: binding `DB` (D1), `assets` con `not_found_handling: single-page-application` y `run_worker_first: ["/api/*"]`, vars/secrets (`CAP_AUTH_TOKEN`, `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`).

**Paso 1 — Esquema (Drizzle) → §7**
- `src/db/schema.ts` con: `vehiculos`, `tipos_servicio`, `talleres`, `eventos_mantenimiento`, `evento_servicios`, `evento_pagos`, `lecturas_odometro`, `recordatorios`.
- `drizzle-kit generate` → `migrations/` → `wrangler d1 migrations apply`.

**Paso 2 — Seeds**
- `vehiculos`: 2 filas con la ficha de §1 (Optra 2011 AC374GA Negro automático; Clio 2008 AHD31V Azul automático).
- `tipos_servicio`: todo el vocabulario de §8 (con `synonyms` y `default_interval_*` del Checklist).
- `talleres`: los vendors de §11.0 (Yirmen Pachecos como principal).

**Paso 3 — Importar la data base**
- Cargar [`data/events.csv`](data/events.csv) (45 eventos) a `eventos_mantenimiento` + `evento_servicios` + `evento_pagos`, y [`data/fuel.csv`](data/fuel.csv) (88 cargas) a `fuel_logs`. Preservar `confidence`, `needs_review`, `notes`.
- Los 15 `needs_review=true` alimentan la **cola de revisión** de la UI (flujo de aprobación descrito en `data/reconcile_report.md`).

**Paso 4 — API (Hono) → §9**
- Middleware auth: Access JWT (humanos) + `X-Cap-Auth` (agentes, en `/api/agent/*` y `/api/v1/events`).
- Rutas: `GET /api/events` (filtros carro/sistema/fecha), `POST/PATCH /api/events`, `GET /api/cars`, `GET /api/service-types`, ingesta `POST /api/v1/events` (idempotente por `client_id`, normalizador texto→tipo).

**Paso 5 — SPA (React + shadcn/ui)**
- Tabla de eventos filtrable, dialog de alta/edición, **cola de revisión** (`needs_review`), campo para enlazar `ynab_transaction_id` a mano, vista por carro.

**Paso 6 — Deploy**
- Cloudflare Access: app humana (One-time PIN, allowlist 2 emails) + app de agentes sobre `/api/agent/*`. GitHub Actions: build Vite → `dist`, `d1 migrations apply --remote`, `wrangler deploy`.

**Después de Fase 1:** integrar los agentes OpenClaw (el usuario pasará sus archivos) y luego la Fase 2 (pull de YNAB) → §10.

---

*Fin del plan v3 (definitivo para desarrollo). La data base vive en `data/events.csv`; la cola de revisión (23 eventos) se resuelve desde la UI una vez montada la Fase 1.*
