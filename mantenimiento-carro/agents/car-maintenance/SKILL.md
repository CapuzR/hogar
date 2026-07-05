---
name: car-maintenance
description: Log a CAR MAINTENANCE event (mechanical fact — not money) to the Mantenimiento app whenever Ricardo or Maru mentions car work: oil change, filters, battery, tires, brakes, shocks, engine/gearbox repair, radiator, fuel pump, bodywork/paint, car wash, alignment, etc. Shared skill installed on BOTH Cap and Maruita. This does NOT capture expenses — money still goes to YNAB via the ynab-capture / maruita-capture skill. This skill records the mechanical event (service type, car, odometer, vendor, description) and, when the expense was just written to YNAB in the same turn, links it via ynab_transaction_id. Also answers maintenance questions ("¿cuándo fue el último cambio de aceite del Optra?").
---

# Car Maintenance — logging to the Mantenimiento app

Shared skill for **Cap** and **Maruita**. Sends the *mechanical* record of car work to the private Mantenimiento app (a Cloudflare Worker + D1). It is **complementary** to expense capture — it never touches YNAB or Notion directly.

## Division of labor (read this first)

| Concern | Who handles it |
|---|---|
| The **money** of a car expense (Bs→USD, YNAB write) | The existing `ynab-capture` (Cap) / `maruita-capture` (Maru) skill. **Untouched.** |
| The **mechanical fact** (service type, which car, odometer, vendor, description) | **This skill** → Mantenimiento app. |
| **Gasoline** spend | Nothing to do here — the app pulls fuel from YNAB automatically (Phase 2). Don't log fuel with this skill. |

So a typical car-maintenance message produces **two** actions in the same turn: (1) the expense skill logs the $ to YNAB, (2) this skill logs the event to the app and links them.

## When to trigger

Fire when the message describes **car maintenance/service** for the Optra or the Clio. Signals:

- A **service word**: aceite, filtro, batería, caucho/rueda/rin, alineación, balanceo, freno/pastillas/discos, amortiguador, mesa/rótula/terminal, correa, radiador/termostato/refrigerante, bomba de gasolina, pila/relé, inyectores, embrague/croche, caja/transmisión, alternador, arranque, latonería/pintura, parachoque, autolavado/lavada, escape, A/C, grúa…
- A **car mention**: "Optra", "Clio", "el negro", "el azul".
- The **mechanic**: "Yirmen", "Pachecos", "el taller".

**Do NOT trigger** on: pure gasolina fill-ups (that's fuel, handled by the YNAB pull), non-car expenses, or anyone other than Ricardo (Cap, tg `1272922655`) / Maru (Maruita, tg `8755649339`).

You can also **log an event with no expense** (e.g. "le puse agua al radiador", a DIY task, or just noting the odometer) — money is optional.

## Identity

- On **Cap** → `source = "cap"`.
- On **Maruita** → `source = "maruita"`.

Attribution is to the **car** (Optra/Clio), not to a person — so there is no per-user account here (unlike the expense skill).

## HTTP requests — required headers

Same convention as the rest of the fleet. Every request needs:

1. `User-Agent: car-maintenance-skill/1.0` (default `Python-urllib/3.x` → 403 by Cloudflare).
2. `X-Cap-Auth: <CAP_AUTH_TOKEN>` — the **same** shared secret you already use (from env). The app reuses it; no new token.

```python
import os, json, urllib.request, urllib.error, time

CAP_AUTH_TOKEN = os.environ.get("CAP_AUTH_TOKEN", "")
BASE = os.environ.get("MANTENIMIENTO_URL", "https://mantenimiento-carro.cap-tools.workers.dev")
HEADERS = {
    "User-Agent": "car-maintenance-skill/1.0",
    "Content-Type": "application/json",
    "Accept": "application/json",
    "X-Cap-Auth": CAP_AUTH_TOKEN,
}
```

If `CAP_AUTH_TOKEN` is empty → reply once and stop: *"⚠️ No tengo `CAP_AUTH_TOKEN`; avísale a Ricardo."*

| Status | Meaning |
|---|---|
| 200 | Idempotent replay (event already existed) — header `Idempotent-Replay: true` |
| 201 | Event created |
| 401 | `X-Cap-Auth` missing/wrong |
| 403 | User-Agent blocked |
| 422 | Validation error (see `detail`) |

## Pipeline

### 1. Resolve the car (required)

From the message: "Optra"/"el negro" → `optra`; "Clio"/"el azul" → `clio`. If it's genuinely unclear **ask, short**:

> ¿Ese fue el **Optra** o el **Clio**? 🚗

Do not guess the car silently. (Get the valid slugs from `GET /api/cars` if needed.)

### 2. Extract the mechanical fields

- `date` — YYYY-MM-DD (today if not stated).
- `service_type` — map the text to a controlled key (step 3). If unsure, leave it out and send `text`.
- `description` — free text: parts, brand, quantity, symptom ("aceite 15W-40 sintético + filtro").
- `odometer` — integer km **only if mentioned** ("158.400 km"). Never nag for it; the app leaves it null otherwise.
- `vendor` — shop/mechanic as named ("Yirmen Pachecos"). Omit if DIY.
- `performed_by` — `"shop"` or `"self"` (DIY).

### 3. Normalize service_type (controlled vocabulary)

Prefer sending a resolved key. Get the catalog once and map by synonym:

```python
req = urllib.request.Request(f"{BASE}/api/service-types", headers=HEADERS)
with urllib.request.urlopen(req, timeout=30) as r:
    service_types = json.load(r)   # [{key, label_es, system_key, synonyms:[...]}, ...]
# e.g. "aceite y filtro" → oil_and_filter_change; "amortiguadores" → shock_absorber_replacement;
#      "pila de la bomba" → fuel_pump_relay_replacement; "latonería" → bodywork_and_paint;
#      "lavada"/"autolavado" → car_wash; "batería" → battery_replacement.
```

- One clear match → send `service_type` = that `key`.
- Several services in one visit (aceite + frenos + rotación) → you may send `service_type` as a **list** of keys.
- No clear match → **omit `service_type` and send `text`**; the app normalizes server-side and flags `needs_review` if it can't. (Never invent a key.)

### 4. (Optional) Link the YNAB payment

If, **in this same turn**, the expense skill already wrote this to YNAB and you have its `ynab_transaction_id`, pass it so money↔event link is instant:

```python
payments = []
if ynab_id:                     # from the ynab-capture / maruita-capture skill this turn
    payments.append({"ynab_transaction_id": ynab_id})
```

If you don't have it, omit `payments` — Phase 2's YNAB pull will match it later by car+date+amount.

### 5. Write the event (idempotent by client_id)

```python
client_id = f"mant-tg-{telegram_message_id}"   # distinct from the expense client_id (tg-{id})

payload = {
    "client_id": client_id,
    "car": car,                       # "optra" | "clio"  (required)
    "date": date,
    "odometer": odometer,             # int or omit
    "service_type": service_type,     # key, list of keys, or omit + send text
    "text": raw_message,              # helps server-side normalization / audit
    "description": description,
    "vendor": vendor,                 # or omit
    "performed_by": performed_by,     # "shop" | "self"
    "source": source,                 # "cap" | "maruita"
    "payments": payments,             # [] if none
}
payload = {k: v for k, v in payload.items() if v not in (None, "", [])}

req = urllib.request.Request(
    f"{BASE}/api/v1/events",
    data=json.dumps(payload).encode("utf-8"),
    method="POST",
    headers=HEADERS,
)

event = None; err = None
for attempt in (1, 2):
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            event = json.load(r)     # {event_id, car, service_types:[...], needs_review, ...}
        break
    except (TimeoutError, urllib.error.URLError) as e:
        err = f"{type(e).__name__}: {e}"
        if attempt == 1:
            time.sleep(2); continue
    except Exception as e:            # 4xx/JSON → don't retry
        err = f"{type(e).__name__}: {e}"; break
```

Idempotent: a repeat with the same `client_id` returns the existing event (`200`, `Idempotent-Replay: true`), never duplicates.

### 6. Confirm (short)

Success:
> 🔧 Anotado en Mantenimiento: **Optra** — Cambio de aceite y filtro (158.400 km). {"· enlazado al gasto de YNAB ✅" if payments else ""}

Failure (both retries):
> ⚠️ No pude anotar el mantenimiento ({err corto}). El gasto en YNAB sí quedó; dime "reintenta" y lo reintento.

On "reintenta" → rerun step 5 with the same `client_id`.

## Answering maintenance questions (read path)

For "¿cuándo fue el último cambio de aceite del Optra?" / "¿qué le hemos hecho al Clio?":

```python
from urllib.parse import urlencode
q = urlencode({"car": "optra", "service_type": "oil_and_filter_change", "limit": 3})
req = urllib.request.Request(f"{BASE}/api/v1/events?{q}", headers=HEADERS)
with urllib.request.urlopen(req, timeout=30) as r:
    events = json.load(r)
```

Reply short and warm with the date, odometer (if any) and cost (if the app already has it from YNAB).

## Do not

- **No captures de gasto aquí.** El dinero va por el skill de YNAB. Este skill solo manda el hecho mecánico.
- **No registres gasolina** con este skill (la app la jala de YNAB en Fase 2).
- **No inventes** el carro ni el `service_type`. Si dudas, pregunta corto o manda `text` y deja que la app decida.
- **No borres** ni edites-por-borrado eventos. (Correcciones se hacen en la UI de la app.)
- **No respondas** a nadie que no sea Ricardo (Cap) / Maru (Maruita).
- **No incluyas** `CAP_AUTH_TOKEN` en ningún mensaje ni log.

## Endpoints (Mantenimiento app)

| Método | Ruta | Rol |
|---|---|---|
| POST | `/api/v1/events` | Crear evento de mantenimiento (idempotente por `client_id`). |
| GET | `/api/service-types` | Vocabulario controlado (key, label_es, synonyms) para normalizar. |
| GET | `/api/cars` | Slugs y apodos de los carros (`optra`, `clio`). |
| GET | `/api/v1/events?car=&service_type=&limit=` | Consultar historial (última vez que…). |

Base URL: `MANTENIMIENTO_URL` (env) → default `https://mantenimiento-carro.cap-tools.workers.dev`. Ajustar al dominio real al desplegar. Auth: `X-Cap-Auth: CAP_AUTH_TOKEN` (mismo secreto de la flota).

## Install

Copiar esta carpeta a `workspace/skills/car-maintenance/` en **ambos** droplets (Cap y Maruita). No requiere secreto nuevo (reusa `CAP_AUTH_TOKEN`). Setear opcionalmente `MANTENIMIENTO_URL` en el `.env`/systemd de cada agente cuando la app tenga su dominio.
