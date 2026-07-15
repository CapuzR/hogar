# vivienda — Rent vs Buy Caracas (modelo feo y honesto)

Modelo financiero **adversarial** para decidir qué hacer con $70,000 cash en Caracas:
**(A)** comprar un apartamento 100% cash (sin hipoteca — no existe mercado en Venezuela),
**(B)** alquilar el Solar donde quieres vivir + invertir los $70k en un portafolio, o
**(C)** híbridos (rentvesting, compra diferida). El objetivo no es confirmar una hipótesis, es
**estresarla**.

> ⚠️ No es asesoría financiera. Los números marcados **adivinado** son especulación del autor.
> Trazabilidad completa en [`RESEARCH.md`](./RESEARCH.md); supuestos en [`ASSUMPTIONS.md`](./ASSUMPTIONS.md)
> y [`assumptions.json`](./assumptions.json).

## Arquitectura — modelo separado de UI

```
src/model/*.ts        motor financiero PURO (sin React). Determinista + Monte Carlo.
  types.ts            contratos
  random.ts           RNG determinista, normal, chi², Cholesky, innovación t-Student
  paths.ts            generación de choques (retornos correlacionados + jump político)
  strategies.ts       las 6 estrategias (A, B, C1, C2, D, E)
  metrics.ts          IRR, max drawdown, recuperación
  engine.ts           runs deterministas, escenarios, sensibilidad (break-even, heatmap, tornado)
  montecarlo.ts       10,000 paths, percentiles, P(B>A), P(ruina)
  defaults.ts         carga assumptions.json → Assumptions
  *.test.ts           Vitest (incluye los 3 sanity checks obligatorios)
src/ui/*.tsx          React + Recharts + Tailwind (7 tabs)
assumptions.json      TODOS los parámetros: valor, rango, fuente, confianza
```

## Comandos

```bash
npm install
npm test          # Vitest — 14 tests, incl. 3 sanity checks
npm run dev       # Vite dev server
npm run build     # build de producción (dist/) — desplegable en Cloudflare Pages
npm run typecheck
```

## Modelo — decisiones clave

- **Sin apalancamiento:** el costo de oportunidad comparado es el precio TOTAL ($70k), no una inicial.
- **Apreciación base 0%** (no el 3–4% gringo): Caracas plano/negativo en USD por una década.
- **Iliquidez explícita:** exit haircut (~10%) + meses para vender (9) + fricción de egreso de capital (~5%).
- **Riesgo político como jump de Poisson**, no como bullet cualitativo.
- **Colas gordas t-Student** en cripto (BTC ν=4, ETH ν=3) y correlaciones de crisis (BTC-ETH 0.85).
- **El punto sutil que rompe la comparación ingenua:** el dueño reinvierte el ahorro de renta, así que
  la comparación honesta es *inmueble + portafolio-lateral* vs *portafolio grande*. El toggle
  `ownerSurplusVsSolar` aísla la decisión de **activo** (misma vivienda) de la decisión de **estilo de vida**
  (comprar corridor vs alquilar Solar) — es donde vive o muere la tesis.

## Las 7 pestañas

1. **Supuestos** — sliders para todo + toggles + derivados en vivo.
2. **Escenarios** — bear / base / bull × 6 estrategias con narrativa.
3. **Monte Carlo** — fan chart, distribución terminal, P(B>A), P(pérdida>50%), ruina.
4. **Sensibilidad** — break-even CAGR/apreciación, heatmap 2D, tornado.
5. **Liquidez** — meses de runway personal disponibles en t (métrica founder). El apto da ~0 por años.
6. **Pros/Contras** — financiero y no-financiero por estrategia.
7. **Veredicto** — lectura honesta + kill criteria por opción.
