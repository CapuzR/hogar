# maruitaycap — Contexto del proyecto (handoff)

> Documento para continuar en otra sesión. Resume TODO lo trabajado.
> Archivos de trabajo/pruebas de la sesión: en `../temp/` (`worker.mjs` = fetch-exchange-rate, `ynab-worker.mjs` = write-ynab-transaction, `SKILL.canonical.md` = intento de skill unificado, descartado).
> Código final desplegable: en `./workers/`.

---

## TL;DR — dónde quedamos

Sistema de captura de gastos/ingresos por Telegram → YNAB, con 2 agentes (**Cap**=Ricardo, **Maruita**=Maru) en un droplet, y workers en Cloudflare. Esta sesión agregó: **tasa histórica por fecha**, **ingresos/comisiones/transferencias** (campo `flow`), **transfer-payees**, y **manejo de duplicados (YNAB 409)**.

### Pendiente para cerrar (orden sugerido)
1. **Desplegar `write-ynab-transaction`** con `flow` + manejo `409` → código en `workers/write-ynab-transaction.js`.
2. **Mover `transfer_payees` a top-level** en `sync-ynab-meta` y desplegar (ver §3).
3. **Aplicar al skill de Cap las ediciones A/B/C/D** (ver §“Ediciones pendientes Cap”) — quedó a medias.
4. **Corregir a mano en YNAB** el signo de ~4 ingresos que se crearon invertidos (ver §“Issue de datos”).
5. (Opcional) limpieza menor en skill de Maruita.
6. Prueba E2E con Cap: gasto hoy, gasto fecha pasada, ingreso (signo +), comisión, transferencia.

---

## Arquitectura

**Agentes** (OpenClaw en droplet DigitalOcean `164.90.132.4`, hostname `Maru-y-Capu`; **NO docker**):
- **Cap** = Ricardo (Ricardo Capuz / capuzr). Telegram id `1272922655`. Cuenta default `R - Mercantil`. Skill: `~/.openclaw/skills/ynab-capture/SKILL.md`.
- **Maruita** = Maru (María Eugenia, esposa). Telegram id `8755649339`. Cuenta default `M - Mercantil`. Skill: `~/.openclaw-maruita/skills/maruita-capture/SKILL.md`.
- Cuentas YNAB con prefijo: **`M -`** = Maru, **`R -`** = Ricardo; **`Cash`** compartida. (Mercantil, Binance, Kontigo, Panamá/MPanamá, Fondu, TdD Kontigo…)

**Flujo:** Telegram → agente (visión/razonamiento propio) → workers Cloudflare → **YNAB** (fuente de verdad, budget **"MR"**). Notion `Cap · Expenses` = cola de fallo (`status: needs-review`).

**Workers** (todos en `*.cap-tools.workers.dev`):
| Worker | Rol | Estado |
|---|---|---|
| fetch-exchange-rate | tasa Bs/USDT (hoy + histórico por fecha) | ✅ fecha desplegada; versión robusta en `workers/` |
| write-ynab-transaction | crea transacción (gasto/ingreso/comisión/transfer) | ⚠️ desplegado **VIEJO** → desplegar `workers/` |
| sync-ynab-meta | categorías+cuentas+payees+**transfer_payees** | ⚠️ transfer_payees agregado, **mover a top-level + desplegar** |
| notion-upsert-expense | cola de fallo (needs-review) | sin cambios |
| ynab-export-csv | export CSV fallback | sin cambios |
| init-notion-schema · reconcile-bank-statement | bootstrap / M6 skeleton | sin cambios |

**Auth:** TODOS los workers tienen `CAP_AUTH_TOKEN` activo. Cada request necesita `X-Cap-Auth: <token>` + `User-Agent: cap-ynab-skill/1.0` (o `maruita-skill/1.0`). Sin ellos → 401/403.

---

## Qué se hizo esta sesión

### 1. fetch-exchange-rate — tasa histórica por fecha ✅
- **Problema:** registraba gastos de fechas pasadas con la tasa de HOY.
- **Solución:** acepta `?date=YYYY-MM-DD`. Si `date == hoy` (America/Caracas) → Binance P2P en vivo (igual que antes). Si fecha pasada → tasa **paralelo** de ESE día desde **dolarapi**: `GET https://ve.dolarapi.com/v1/historicos/dolares/AAAA/MM/DD`, objeto con `fuente: "paralelo"`, campo `promedio`.
- Robustez: timeout 6s + 1 retry, walk-back hasta 5 días (fines de semana), sobre de error `ok:false` + `user_message` (en español, listo para reenviar).
- **Decisión clave:** dolarapi (NO pydolarve — pydolarve está bloqueado por DNS en VE y rechaza IPs de datacenter; dolarapi es cloud-friendly). El **paralelo ≈ Binance P2P** (difieren < 1%). Probado: 30/04/2026 → 629,97.
- Código: `workers/fetch-exchange-rate.js`.

### 2. write-ynab-transaction — ingresos/comisiones/transfers + dedupe ⚠️ DESPLEGAR
- Campo **`flow`** opcional ("inflow"/"outflow"). El skill manda `amount_usd` como **magnitud positiva** + `flow`; el worker pone el signo. Si `flow` ausente → legacy (positive=outflow). **Retrocompatible** (el path de gastos no cambia).
- Manejo de **YNAB 409** (import_id duplicado): lo trata como `already_exists` (200, éxito idempotente) en vez de 502. YNAB en el endpoint singular `transaction:` devuelve **409** ante import_id repetido (NO dedupe silencioso) — ese era el bug que hacía ver "502 fantasma".
- `console.error` del error de YNAB → sale en Workers Logs.
- Código: `workers/write-ynab-transaction.js`. Probado: flow signos, 409→already_exists, 400→502.

### 3. sync-ynab-meta — transfer_payees ⚠️ mover + desplegar
- Ya agregaste: `const transferPayees = payeesData.payees.filter((p) => !p.deleted && p.transfer_account_id != null).map((p) => ({ id: p.id, name: p.name, transfer_account_id: p.transfer_account_id }));` ✅
- **PENDIENTE:** en el `return jsonResponse(...)` quedó DENTRO de `payees`. Muévelo a hermano (top-level) para que el skill lo lea como `meta.transfer_payees.items[]`:
```js
          payees: {
            count: payees.length,
            items: payees
          },
          transfer_payees: {
            count: transferPayees.length,
            items: transferPayees
          },
```

### 4. Skills
- **Maruita: ✅ completo** (2.5 tx_type, transfer_payees, nota por-tipo de categoría, transfer en payee, payload con flow). Limpieza menor: en `### 4` hay 2 líneas que se contradicen (nota "comision SÍ Bancos" vs vieja "Nunca Bancos") → ajustar la vieja.
- **Cap: ⚠️ a medias** (solo paso 2/tasa). Faltan A/B/C/D ↓.

---

## Ediciones PENDIENTES del skill de Cap (`~/.openclaw/skills/ynab-capture/SKILL.md`)

**A) Insertar `### 2.5` entre el Paso 2 y `### 3. Classify category`:**
```markdown
### 2.5 Tipo de movimiento (tx_type)
Default = gasto. Si dudas entre dos, pregunta corto antes de escribir:
- gasto · comision ("comisión/IGTF/fee/mantenimiento/débito") · ingreso ("me pagaron/cobré/sueldo/dividendo/depositaron") · reembolso ("me devolvieron/reembolso/reintegro") · transferencia ("transferí/moví/pasé de X a Y", entre tus cuentas).
```

**B) En `### 3`, agregar bajo el título** y ajustar la línea de Bancos:
```markdown
> Según tx_type: gasto/comision/reembolso → SÍ categoría (reembolso = la del gasto original; comision SÍ puede ir al grupo "Bancos", ej. "fee de pago móvil"; gasto sigue SIN Bancos). ingreso/transferencia → SIN categoría (no es error).
```
Reemplaza `**Never** classify into the "Bancos" group from receipts — those come from bank statement reconciliation (M6).` por:
```markdown
**Never** classify a **gasto** into "Bancos" from receipts (M6 reconciliation). **Las comisiones (tx_type=comision) SÍ** van a su categoría de fee en "Bancos".
```

**C) En `### 4.5 Payee`, agregar como paso 6:**
```markdown
6. **Si `tx_type == transferencia`** → NO busques merchant. Toma el `id` de la cuenta DESTINO en `.accounts.items[]`, busca en `.transfer_payees.items[]` (de sync-ynab-meta) el que tenga ese `transfer_account_id`, y úsalo como `transfer_payee_ynab_id`. La cuenta del payload es la de ORIGEN.
```

**D) En `### 6`, reemplazar el bloque `ynab_payload = {...}`** (el que tiene `"date": "2026-04-19"` fijo) por:
```python
flow = "inflow" if tx_type in ("ingreso", "reembolso") else "outflow"

ynab_payload = {
    "client_id": f"tg-{telegram_message_id}",
    "account_ynab_id": ynab_account_id,   # cuenta ORIGEN — .accounts.items[].id
    "date": date,
    "amount_usd": amount_usdt,            # magnitud positiva; el worker pone el signo según flow
    "flow": flow,
    "memo": memo,
    "cleared": "uncleared",
    "approved": True,
}
if tx_type in ("gasto", "comision", "reembolso") and ynab_category_id:
    ynab_payload["category_ynab_id"] = ynab_category_id   # ingreso/transferencia: sin categoría
if tx_type == "transferencia":
    ynab_payload["payee_ynab_id"] = transfer_payee_ynab_id
elif ynab_payee_id:
    ynab_payload["payee_ynab_id"] = ynab_payee_id
elif payee_name_new:
    ynab_payload["payee_name"] = payee_name_new
```

---

## Conocimiento de dominio (importante)

**Tipos de movimiento:**
| tipo | flow | categoría | payee | cuenta |
|---|---|---|---|---|
| gasto | outflow | de gasto (**NO** Bancos) | merchant | la afectada |
| comision | outflow | de fee (**Bancos OK**) | banco/none | la afectada |
| ingreso (sueldo/dividendo) | inflow | **NINGUNA** (Ready to Assign) | fuente | donde entró |
| reembolso | inflow | la del **gasto original** | merchant orig. | donde entró |
| transferencia | outflow | **NINGUNA** | transfer-payee de la cuenta **DESTINO** | **ORIGEN** |

**Resolución de cuenta:** default = Mercantil del dueño. "mi X"/X → `{PREFIJO} - X`. La del otro (explícito) → otro prefijo. `Cash` compartida. Match tolerante contra `accounts.items[]` ("M-"/"M -").

**IDs (crítico — evita 404):** payload a YNAB usa `items[].id` (YNAB id). Payload a Notion usa `items[].notion_page_id`. Cruzarlos = 404.

**YNAB 409:** import_id duplicado (endpoint singular) → 409 conflict, NO dedupe silencioso. El worker (nuevo) lo trata como `already_exists`. Un re-POST **NO actualiza** la existente — si está mal, corregir a mano en YNAB.

**flow/signo:** `amount_usd` siempre magnitud positiva; el worker invierte según `flow`. Sin `flow` desplegado, un ingreso se guarda como GASTO (signo invertido) — ¡por eso importa desplegar el worker!

---

## ⚠️ Issue de datos abierto

6 transacciones del batch `tg-1602-*` que el agente reportó como "fallaron 502" en realidad **YA están en YNAB** (eran 409 conflict). De esas:
- **2 "IVF en CMDLT"** (outflow, ~$1304,40) → bien.
- **4 inflows**: "intereses Banco Mercantil" (+$1,57), 2× "ingreso Perdido", "reembolso de Daniel" → **probablemente con signo invertido** (creadas por el worker viejo sin `flow` → quedaron como gasto).

**Acción:** abrir YNAB, buscar esas 4, y si están como gasto (−), **editar el signo a inflow a mano**. (El worker no las corrige: 409 = no actualiza.) Luego "reintenta los 6" → volverán como `already_exists` y el agente los marca hechos.

---

## Validación (comandos)

**Skills (en el droplet, sin token):**
```bash
for f in $(find ~ -path '*skills*/SKILL.md' 2>/dev/null); do
  echo "===== $f ====="
  for m in tx_type flow inflow transferencia transfer_payee; do
    printf "  %-16s %s\n" "$m" "$(grep -c -- "$m" "$f")"
  done
done
```
Cap debe mostrar tx_type/flow > 0 (si están en 0, faltan A/B/C/D).

**Workers (con token):**
```bash
TOKEN='...'; H="X-Cap-Auth: $TOKEN"
curl -s -H "$H" https://write-ynab-transaction.cap-tools.workers.dev/ | grep -o '"flow"'           # debe imprimir "flow"
curl -s -H "$H" "https://sync-ynab-meta.cap-tools.workers.dev/sync-ynab-meta?dry=1" | grep -o 'transfer_payees'
curl -s -H "$H" "https://fetch-exchange-rate.cap-tools.workers.dev/fetch-exchange-rate?date=2026-04-30" | grep -o 'dolarapi-paralelo'
```

---

## Gotchas / entorno
- Droplet `164.90.132.4` (Maru-y-Capu), SSH. OpenClaw, **no docker**. Home casi vacío (el código vive donde corre OpenClaw).
- `~/700` en el droplet = carpeta basura de un typo de setup → `cd ~ && rmdir 700` (inofensivo).
- Dev local: Windows + WSL Ubuntu (`DESKTOP-E12CJVO`). Workers = Cloudflare. Skills se editan en el droplet (VS Code Remote-SSH o nano).
- Cuenta Cloudflare: `ff4771186ee248e2186f7952ae4ce944`.
- Los workers se editan como `src/index.ts` (esbuild añade boilerplate `__name`/`__defProp` en el bundle — es normal, no es código tuyo). Los `.js` en `./workers/` son fuente limpia equivalente.

---

## Checklist para cerrar
- [ ] Desplegar `workers/write-ynab-transaction.js` (flow + 409).
- [ ] Mover `transfer_payees` a top-level en sync-ynab-meta + desplegar.
- [ ] (Confirmar) desplegar versión robusta de fetch-exchange-rate si no está (`grep dolarapi-paralelo` + que dé `user_message` en error).
- [ ] Aplicar Cap skill A/B/C/D + reiniciar/recargar el agente.
- [ ] Corregir signo de las 4 inflows en YNAB.
- [ ] Limpieza menor skill Maruita (línea Bancos).
- [ ] Prueba E2E con Cap: gasto hoy · gasto fecha pasada · ingreso (signo +) · comisión · transferencia.
- [ ] (Opcional futuro) PATCH-on-409 en write-ynab-transaction (corregir signo/monto auto en vez de solo "already_exists").
