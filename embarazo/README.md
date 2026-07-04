# embarazo

Proyecto que **arranca la semana del 2026-07-06**. Placeholder por ahora.

Seguirá el mismo patrón que `fertilidad/`:
- `workers/` → workers de captura a Notion (`notion-upsert-embarazo-*`, `init-notion-embarazo-schema`, …).
- `ui/` → UI en Cloudflare Pages si aplica.

Reutiliza `packages/` (auth `X-Cap-Auth`, cliente Notion) cuando lo extraigamos.

> Revisa si el Pages `emb-maru-capu` (hoy en [`../fertilidad/ui/`](../fertilidad/ui/)) pertenece
> en realidad a este dominio — el prefijo `emb` lo sugiere.
