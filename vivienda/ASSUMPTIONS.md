# ASSUMPTIONS.md — Rent vs. Buy Caracas

> **✅ APROBADO (jul 2026).** Decisiones del dueño registradas en §10. Toda cifra es un **slider**
> en la UI final — esto son los *defaults* y sus rangos. Fuentes y trazabilidad en [`RESEARCH.md`](./RESEARCH.md).
> El JSON operativo del modelo vive en [`assumptions.json`](./assumptions.json).
>
> Confianza por parámetro: **alto** (dato documentado) · **medio** (estimación razonable) ·
> **adivinado** (juicio mío, no observable — trátalo como especulación marcada).

---

## 0. El problema que muchos modelos esconden y que yo NO quiero esconderte

Tu data de alquiler es de **El Solar del Hatillo** (2H/83 m² → $950; 3H/130 m² → $1,700). Pero
**con $70k NO compras en El Solar** — compras stock *dateado* del corredor (La Boyera, El Cigarral,
Los Naranjos, Oripoto): ~80–120 m², 2–3H, sin amenidades. Es producto **~2x más barato por m²** y de
menor calidad/seguridad/liquidez.

Esto rompe la comparación ingenua "comprar vs alquilar" porque **no estás consumiendo la misma vivienda**
en cada rama. Un modelo honesto tiene que mantener **la calidad de vivienda constante**, o serás
injusto con una de las dos ramas. Hay dos formas válidas de igualar, y **necesito que elijas** (ver
§7 Decisiones). Por defecto uso *renta imputada*: comparo comprar-para-vivir contra alquilar **la unidad
equivalente a lo que comprarías** (corridor-class, ~$700/mes), no contra el Solar de $1,400. Si quieres
comparar contra vivir en Solar, entonces la rama "comprar" tiene que ser rentvesting (compras corridor,
lo alquilas, y tú alquilas Solar) — no comprar-para-vivir. Lo dejo explícito porque es donde casi todos
hacen trampa.

**Segundo punto crítico (el que probablemente mueve tu hipótesis):** la comparación justa NO es
"apartamento vs portafolio". Es **"apartamento + portafolio-lateral pequeño" vs "portafolio grande"**.
¿Por qué? Porque el dueño paga menos al mes por vivienda (condominio+mantenimiento ≈ $100–200) que el
inquilino (renta ≈ $700–1,400), y ese **ahorro mensual el dueño lo invierte**. Si ignoras eso, inflas
artificialmente a la rama que alquila. Mi modelo reinvierte ese excedente del dueño (toggle, default ON).
Este es el mecanismo por el que "comprar" a veces gana incluso con apreciación 0% — y es exactamente lo
que tu hipótesis (B gana) tiene que superar.

---

## 1. El caso base — la unidad y el capital

| Parámetro | Base | Rango | Confianza |
|---|---|---|---|
| Capital disponible | $70,000 | fijo | — |
| Unidad comprable con $70k | ~100 m², 2–3H, corridor, dateado | 80–120 m² | Medio-Alto |
| Precio de compra (rama A / C) | $70,000 | $65k–$85k | Medio |
| Renta imputada de esa unidad (lo que costaría alquilarla) | **$700/mes** | $600–$1,000 | Medio |
| Renta "donde quiero vivir" (Solar-class, para rentvesting / opción "vivir mejor") | **$1,400/mes** | $950–$1,700 | Alto (tu data) |
| Condominio (dueño) | **$70/mes** | $30–$150 | **Adivinado** |
| Horizonte | 5 / 10 / 20 años | — | — |
| Inflación USD | 3.5%/año | 2–4% | Alto |
| Risk-free USD (T-bill) | 4.0%/año | 3.7–4.5% | Alto |

---

## 2. Inmueble — apreciación, costos, iliquidez

| Parámetro | Base | Rango | Confianza |
|---|---|---|---|
| **Apreciación real USD** | **0%/año** | **−2% a +4%** | Medio |
| Mantenimiento (%/año sobre valor) | 1.0% | 0.5–2.0% | Medio |
| Condominio (ver §1) | $70/mes | $30–150 | Adivinado |
| Vacancia (si se alquila) | 12% del bruto | 8–20% | Medio |
| No-pago inquilino (merma esperada) | 8% del bruto | 3–20% | Medio (cola gorda) |
| Property mgmt (si se alquila) | 9% de la renta | 8–10% | Alto |
| **Costo de compra** (registro, notaría, abogado, gestoría) | **4%** | 3–7% (stress 10%) | Medio |
| **Costo de venta** (comisión 5% + ISLR 0.5% + solvencias) | **5.5%** | 3.5–6% | Medio-Alto |
| **Exit haircut** (venta bajo asking) | **10%** | 8–15% | Medio |
| **Meses para vender** | **9 meses** | 6–18 | Medio |
| Fricción de egreso de capital (sacar USD del país) | 5% | 4–7% | Medio |

**Decisión de diseño clave:** la apreciación base es **0%** (no el 3–4% gringo). El histórico es
−45/−50% en USD desde 2014, ahora estabilizado. Comprar aquí es **jugada de yield con capital plano,
no de apreciación.** Modelo Caracas como plano con dos colas anchas.

---

## 3. Yield — bruto y neto

- **Bruto:** $700/mes ÷ $70k = **12% bruto** (validado; stock barato rinde más que Solar por prima de riesgo).
- **Neto** tras condominio + vacancia + no-pago + mgmt + mantenimiento: **~4–6%** base, cae a **2–4%** en mal año.
- En **comprar-para-vivir** el "yield" que capturas es la **renta imputada ahorrada** ($700/mes = $8,400/año
  bruto), menos condominio+mantenimiento. En **rentvesting** capturas renta real (con toda la merma y el
  riesgo de no-pago encima) pero pagas tu propia renta.

---

## 4. Riesgo político / jurisdiccional — modelado como jump risk (NO como bullet)

| Parámetro | Base | Rango | Confianza |
|---|---|---|---|
| Prob. anual de evento severo (expropiación / invasión / confiscación regulatoria) | **0.5%/año** | 0.2–1.5% | Adivinado/Medio |
| Severidad del evento (haircut sobre el valor del inmueble) | **70%** | 30–100% | Adivinado |
| Pérdida esperada anual equivalente | ~0.35%/año | 0.1–0.6% | Adivinado |

Se implementa como **salto de Poisson** en cada path del Monte Carlo: cada año, con probabilidad *p*,
el inmueble sufre un haircut de severidad *s*. Afecta **solo a las ramas con inmueble** (A, C-rentvesting,
C-diferida tras comprar). El portafolio no lo sufre (capital portable). **Este es el "impuesto de
jurisdicción" que el apartamento paga y el portafolio no.**

---

## 5. Portafolio — activos, retornos, colas, correlaciones

**Pesos por defecto de la rama B** (todos ajustables con sliders; deben sumar 100%):

| Activo | Peso default (pro-riesgo) | CAGR base | Vol | Cola (t ν) |
|---|---|---|---|---|
| BTC | 40% | 8% | 65% | 4 |
| ETH | 25% | 7% | 90% | 3 |
| S&P 500 (TR) | 20% | 10% | 16% | 6 |
| Oro | 5% | 5% | 15% | 6 |
| Stables/T-bills | 10% | 3.8% | 0.5% | normal |

> **Nota adversarial:** 65% cripto (BTC+ETH) con correlación 0.85 = **una sola apuesta de alto beta**,
> no un portafolio diversificado. El modelo lo tratará como tal (colas conjuntas, drawdown compartido).

**Correlaciones** (matriz base + matriz "crisis" de dos regímenes — ver RESEARCH §10):
BTC–ETH **0.85** (una sola apuesta), BTC/ETH–SPX **0.40** (cripto NO diversifica; sube a 0.7–0.9 en estrés),
Oro–SPX **0.05**, Cash ~0 con todo.

**Colas gordas:** retornos generados con **t-Student** (no lognormal) — ν=3–4 en cripto, ν=6 en
acciones/oro. Captura los −80/−90% de cripto y los −55% de acciones que una normal llamaría imposibles.

**Drawdowns históricos que el modelo debe poder reproducir:** BTC −84%, ETH −94%, SPX −55%, Oro −45%+,
con tiempos de recuperación de ~3 años (cripto), ~4.5 años (SPX), hasta décadas (oro).

---

## 6. Las estrategias comparadas (mínimo 6, lado a lado)

| # | Estrategia | Qué hace | Vivienda que consumes |
|---|---|---|---|
| **A** | **Comprar-para-vivir** | $70k cash → apto corridor, vives en él. Reinviertes el ahorro de renta. | Corridor-class |
| **B** | **Alquilar + portafolio** (tu hipótesis) | Alquilas, $70k → portafolio (pesos §5). | Elegible: corridor o Solar |
| **C1** | **Rentvesting** | Compras corridor $70k, lo alquilas (~$700 con merma+no-pago), tú alquilas donde quieres. | Solar-class (o donde elijas) |
| **C2** | **Compra diferida** | $70k → portafolio 3–5 años, luego liquidas y compras. | Alquilas hasta comprar, luego corridor |
| **D** | **All-stables / T-bills** | 100% en stables/T-bills (~3.8%). El "aburrido seguro". | Alquilas |
| **E** | **60/40 boring** | 60% SPX / 40% bonos-T-bills. Sin cripto. | Alquilas |

Cada una en **bear / base / bull** con narrativa explícita (Tab Escenarios).

---

## 7. Metodología — cómo trato cada punto que "un modelo gringo se come"

1. **Sin hipoteca → costo de oportunidad = precio total.** El capital comparado es los $70k completos,
   no una inicial. Cero apalancamiento, restricción dura. ✔
2. **Apreciación:** base **0%**, no 3–4% gringo. ✔
3. **Iliquidez:** `exit_haircut` (10%) + `meses_para_vender` (9) como parámetros; el inmueble no se puede
   liquidar instantáneo y sale bajo asking. ✔
4. **Costos de transacción reales:** ~4% compra + ~5.5% venta + 5% egreso, sumados a ambos lados. ✔
5. **Portabilidad como opción real (cuantificada, no bullet):** métrica "meses de runway personal
   disponibles en t" (Tab Liquidez). El apartamento da **0** meses de runway líquido; el portafolio da
   `valor_líquido / burn_mensual`. Además un **"liquidity-adjusted return"** que penaliza el retorno del
   inmueble por iliquidez + fricción de egreso + riesgo jurisdiccional. ✔
6. **Riesgo político:** jump de Poisson (§4), no ignorado. ✔
7. **Sequence risk:** la renta se paga con **INGRESO, no con el portafolio**. Default: el portafolio
   compone intacto. Toggle "pagar renta desde el portafolio" → activa cálculo de **probabilidad de ruina**
   (una retirada de ~$1,400/mes sobre $70k = ~24% anual → el modelo mostrará la ruina explícita). ✔
8. **Cripto no es diversificación:** BTC–ETH 0.85, colas t-Student, drawdowns reales, tiempo de
   recuperación. Un "mix BTC/ETH" se modela como **una sola apuesta**. ✔

**Motor:** determinista (cash flows año a año) + Monte Carlo (10,000 paths, retornos correlacionados
vía descomposición de Cholesky sobre innovaciones t-Student, con opción de conmutar a matriz de crisis).
Modelo puro en `/src/model/*.ts`, sin React. Tests Vitest con los 3 sanity checks que pediste:
- Retornos 0% + costos 0 → comprar gana exactamente por la renta ahorrada.
- Apreciación 0% + portafolio 0% → break-even = yield neto.
- Monte Carlo con vol 0 → converge al determinista.

---

## 8. Métricas que reporto

Patrimonio neto terminal (5/10/20a), IRR, max drawdown, tiempo de recuperación, **P(B > A)**,
P(pérdida > 50%), Sharpe, break-even CAGR, percentiles 5/25/50/75/95 (fan chart), **meses de runway
personal disponible en t**, y **liquidity-adjusted return** (retorno penalizado por iliquidez + riesgo
jurisdiccional).

---

## 9. Métricas de decisión

Patrimonio neto terminal (5/10/20a), IRR (retorno anualizado del patrimonio), max drawdown, tiempo de
recuperación, **P(B > A)**, P(pérdida > 50% del capital), Sharpe, break-even CAGR, percentiles
5/25/50/75/95 (fan chart), **meses de runway personal disponible en t**, y **liquidity-adjusted return**
(retorno del patrimonio penalizado por iliquidez + fricción de egreso + riesgo jurisdiccional).

---

## 10. DECISIONES TOMADAS (✅ aprobado por el dueño, jul 2026)

1. **Baseline de vivienda (CORREGIDO por el dueño):** **comprar = corridor** (~$70k, vives ahí) vs
   **alquilar = Solar** ($1,400/mes) **+ invertir**. Nunca alquilas corridor. Presupuesto de vivienda
   común = renta Solar $1,400/mes. Implicaciones del modelo:
   - **B** (alquilar Solar + portafolio): paga $1,400/mes desde ingreso, invierte $70k, **excedente mensual = 0**.
   - **A** (comprar corridor): paga ~$126/mes (condo+mant), **libera ~$1,274/mes** que reinvierte (toggle),
     pero **vive en corridor**. Ese excedente = ~$574 ahorro genuino own-vs-rent (misma unidad) + ~$700
     *downgrade de vivienda* (Solar−corridor). A gana patrimonio **a cambio de vivir peor** — se marca en Veredicto.
   - **C1 rentvesting**: vives en Solar (pagas $1,400), compras+alquilas corridor (bruto $700), inviertes el neto.
   - `payRentFromPortfolio` usa $1,400 → retiro ~24% sobre $70k → ruina rápida (sequence risk explícito).
2. **Reinversión del excedente mensual del dueño:** **ON** (con toggle en la UI).
3. **Pesos default del portafolio B (pro-riesgo):** **40% BTC / 25% ETH / 20% SPX / 5% oro / 10% stables**.
   65% cripto → el modelo lo trata como *una sola apuesta de alto beta*.
4. **Burn mensual personal:** **$3,000/mes** (default genérico, slider). **Ingreso familiar:** **$4,000/mes**
   (Maruita + founder). Ingreso se usa para: (a) verificar que la renta se paga con ingreso, no con el
   portafolio (sequence risk), y (b) dimensionar el excedente reinvertible del dueño.
5. **Ubicación:** **`vivienda/`** — nuevo dominio del monorepo, app Vite independiente.

**Lectura preliminar (a validar con el modelo):** con apreciación 0% + reinversión del excedente del
dueño, **A (comprar) es más competitiva de lo que la hipótesis "B gana" asume** — porque el due
ño invierte el ahorro de renta además de tener el inmueble. Lo que probablemente inclina hacia B/C es el
**riesgo jurisdiccional (jump) + iliquidez + la opción de portabilidad de founder**. Se cuantifica en el
motor, no se vende de palabra.
