# fertilidad

Workers que guardan en **Notion** la información del proceso de fertilidad, + una UI (Pages).

> ⚠️ **Datos médicos sensibles.** Repo privado; nada de datos reales al control de versiones.

**Auth (workers):** header `X-Cap-Auth: <CAP_AUTH_TOKEN>` (mismo esquema que finanzas).

## Workers (`*.cap-tools.workers.dev`)

| Worker | Rol (inferido — corregir si aplica) | Código |
|---|---|---|
| `fertilidad-overlay` | Overlay/entrada del flujo de fertilidad | ⬜ pegar |
| `notion-upsert-fertilidad-medicamento` | Upsert de medicamentos a Notion | ⬜ pegar |
| `notion-upsert-fertilidad-lab-value` | Upsert de valores de laboratorio | ⬜ pegar |
| `notion-upsert-fertilidad-sesion` | Upsert de sesiones | ⬜ pegar |
| `notion-upsert-fertilidad-ciclo` | Upsert de ciclos | ⬜ pegar |
| `init-notion-fertilidad-schema` | Bootstrap del schema Notion de fertilidad | ⬜ pegar |

## UI — [`ui/`](ui/)

Proyecto **Pages** `emb-maru-capu` (`emb-maru-capu.pages.dev`, **sin conexión Git**).
Es el candidato al "UI que perdiste". Ver [`ui/README.md`](ui/README.md) para recuperarlo.
