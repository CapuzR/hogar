# packages (reservado)

Código compartido entre dominios. **Vacío por ahora** — a propósito.

Hoy los workers son `.js` de un solo archivo editados en el dashboard, sin build. Extraer código
compartido exige darles bundler (wrangler/esbuild), un cambio de estilo a todos. No se paga ese
costo antes de que exista la reutilización.

## Cuándo activar esto (→ convertir a workspace pnpm)

Cuando **Fase 2/3 de mantenimiento-carro** necesite de verdad un cliente YNAB compartido con
`finanzas/`, o cuando el patrón `notion-upsert-*` se repita lo suficiente:

- `packages/shared/` → auth `X-Cap-Auth`, cliente YNAB, cliente Notion, helper de upsert.
- Añadir `pnpm-workspace.yaml` en la raíz y que workers/app importen `@hogar/shared`.

Mientras tanto, la duplicación mínima entre workers single-file es aceptable.
