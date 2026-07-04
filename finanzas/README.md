# finanzas

Captura de gastos/ingresos → **YNAB** (budget "MR", fuente de verdad) vía bot de Telegram
(agentes **Cap** = Ricardo, **Maruita** = Maru). Notion `Cap · Expenses` = cola de fallo.
Detalle completo en [`../docs/CONTEXT.md`](../docs/CONTEXT.md).

**Auth (todos):** header `X-Cap-Auth: <CAP_AUTH_TOKEN>` + `User-Agent: cap-ynab-skill/1.0`.

## Workers (`*.cap-tools.workers.dev`)

| Worker | Rol | Código |
|---|---|---|
| `fetch-exchange-rate` | Tasa Bs/USDT (hoy = Binance P2P; histórico por fecha = dolarapi paralelo) | ✅ real |
| `write-ynab-transaction` | Crea transacción (gasto/ingreso/comisión/transfer), maneja 409 | ✅ real |
| `sync-ynab-meta` | Categorías + cuentas + payees + `transfer_payees` | ⬜ pegar |
| `notion-upsert-expense` | Cola de fallo (`status: needs-review`) | ⬜ pegar |
| `ynab-export-csv` | Export CSV fallback | ⬜ pegar |
| `init-notion-schema` | Bootstrap del schema de Notion | ⬜ pegar |
| `reconcile-bank-statement` | Reconciliación de estado de cuenta (M6, skeleton) | ⬜ pegar |

> Pendientes de deploy anotados en `CONTEXT.md`: desplegar `write-ynab-transaction` (flow + 409)
> y mover `transfer_payees` a top-level en `sync-ynab-meta`.
