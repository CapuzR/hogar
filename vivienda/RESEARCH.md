# RESEARCH.md — De dónde salió cada número

> **Fecha:** julio 2026. Toda cifra en USD salvo indicación.
> **Propósito:** trazabilidad honesta. Cada parámetro del modelo tiene aquí su origen,
> su rango, y una etiqueta de confianza: **alto** (dato bien documentado, varias fuentes),
> **medio** (estimación razonable con dispersión), **adivinado** (juicio mío, no observable).
>
> **Advertencia de calidad de datos:** Venezuela **no tiene** un índice oficial y auditado de
> precios de vivienda. Las mejores fuentes son índices de corretaje (Rent-A-House / "Valores por m²"),
> un tracker MercadoLibre–UCAB, y blogs de brokers. Son **precios de OFERTA (asking)**, no de
> transacciones cerradas: sobreestiman el precio real de cierre. Todo lo marcado "alto" aquí es
> "alto *para este mercado*", que sigue siendo más blando que un dato de un MSA gringo.

---

## 1. Inmobiliario Caracas — histórico en USD

**Hipótesis del usuario ("plano/negativo por una década"): CONFIRMADA para 2014–2021, y aproximadamente cierta para 2014–2026.**

| Dato | Valor | Fuente | Confianza |
|---|---|---|---|
| Caída total, 20 años a 2019 | −75% | El Economista/EFE (sep 2019), consenso de brokers | Medio |
| Contracción acumulada desde 2013 | ~60% (una fuente cita 89%) | El Economista/EFE | Medio |
| Nivel de precio 2014 | ~$1,493/m² implícito ($100k compraban 67 m²) | TalCual, data de brokers | Medio |
| Piso post-crash (~2021) | ~$775/m² implícito ($100k compraban 129 m²) | TalCual | Medio |
| Aún bajo el pico 2014 (a 2022) | −44% | TalCual (2022) | Medio |
| Premium este (Altamira/LPG) 2015→2019 | ~$2,000–2,500 → ~$1,000/m² | El Economista/EFE (2019) | Medio |
| Crecimiento 2024→2025 | +1% a +2% (m² prácticamente plano) | Sumarium / tracker MercadoLibre–UCAB (sep 2025) | Medio-Alto |
| Venta promedio oct 2025 | $846/m², +6% interanual vs $798 (oct 2024) | Banca y Negocios / MercadoLibre | Medio-Alto |
| Promedio Caracas jun 2026 | ~$794/m²; apto promedio listado $110,431 | ZonaVen (jun 2026) | Medio |

**Arco del precio:** ~$1,500/m² (2014) → ~$775/m² (piso 2021) → ~$800–850/m² (2025–26).
Un movimiento real en USD de **−45% a −50%** desde el pico 2014, concentrado en 2014–2021.
Los últimos ~4 años: **un piso con recuperación leve** (bajo dígito simple % anual, cargado hacia
zonas premium del este, impulsado por cash de diáspora/retornados).

**Apreciación real USD para el modelo: central 0% a +2%/año; rango −2% a +4%. Confianza: media.**
La dirección (ya no cae) está bien soportada; la magnitud del alza es especulativa y depende de
flujos de capital reversibles. **No modelar Caracas como activo que aprecia confiablemente — modelarlo
como plano con riesgo amplio de dos colas.**

Fuentes: [Banca y Negocios/MercadoLibre](https://www.bancaynegocios.com/mercadolibre-valor-del-metro-cuadrado-en-caracas-promedio-us-547-en-octubre/) ·
[Sumarium](https://sumarium.info/2025/09/02/mercado-inmobiliario-de-caracas-precios-del-m%C2%B2-crecen-entre-1-y-2-en-los-ultimos-dos-anos/) ·
[TalCual](https://talcualdigital.com/precios-de-inmuebles-suben-pero-aun-se-mantienen-44-por-debajo-de-los-de-2014/) ·
[El Economista/EFE](https://www.eleconomista.net/actualidad/Los-precios-de-inmuebles-en-Venezuela-cayeron-un-75-en-los-ultimos-20-anos-20190903-0023.html) ·
[ZonaVen 2026](https://zonaven.com/blog/guia-completa-caracas-vivir-comprar-alquilar-2026)

---

## 2. Qué compra ~$70,000 en el corredor El Hatillo

A ~$650–900/m² efectivo en este corredor (bajo los $1,200–1,500/m² premium de Chacao/Las Mercedes),
**$70k compran ~80–120 m², 2–3 habitaciones, construcción vieja/dateada** (no renovada reciente),
frecuentemente en edificios de media altura sin el paquete completo de amenidades.

| Sector | Precio | Tamaño | Config | Confianza |
|---|---|---|---|---|
| El Cigarral | $75,000 | 110 m² | 2H / 3B | Medio |
| El Hatillo (general) | $68,000 | 84 m² | 3H / 2B | Medio |
| El Hatillo (general) | $77,000 | 121 m² | 3H / 3B | Medio |
| La Boyera | $75,000 | media | — | Medio |
| La Boyera | $85,000 | 170 m² | 4H | Medio |
| La Boyera (renovado) | $115,000 | — | 3H | Bajo-Medio |

**Contraste con El Solar del Hatillo (tu referencia):** El Solar es desarrollo moderno, cerrado,
baja densidad, con amenidades (seguridad privada, piscina, gym, salón, vista al Ávila). Ahí un
**2H/75 m² cuesta $105k–$125k** ($1,400–1,650/m²), ~**2x el precio/m²** de una unidad comparable en
La Boyera/Los Naranjos/El Cigarral/Oripoto. **$70k NO compran producto clase-Solar** — compran stock
viejo del corredor circundante. Confianza en "$70k = ~80–120 m², 2–3H, dateado": **Medio-Alto**.

Fuente: [RE/MAX Venezuela — El Hatillo/La Boyera](https://www.remax.com.ve/inmuebles/apartamento/venta?ubi=El+Hatillo%2C+Miranda%2C+VEN) y agregadores MercadoLibre.

---

## 3. Yields de alquiler

**Yield bruto — validado, y de hecho MÁS alto que el ~8–9% de Solar en el extremo barato del corredor.**

Rentas asking del corredor: La Boyera/Los Naranjos 2–3H en **$600–$1,000/mes** (ej. La Boyera 3H/2B/2p
a $700; 120 m² 3H en La Boyera a $1,000; Los Naranjos 2H a $600). Ciudad: 2H estándar promedia
**$600–$700/mes** (guía uHomie 2025).

- **$70k compra, $600–700/mes → $7,200–8,400/año → ~10–12% bruto.**
- **Solar 2H ~$115k con ~$800–900/mes → ~8–9% bruto** ✓ (coincide con tu dato).

El yield bruto más alto del stock barato refleja **más riesgo / peor calidad de inquilino / edificios
viejos** — es una prima de riesgo, no dinero gratis.

**Yield NETO — el número honesto es mucho más bajo.** Deducciones:

| Merma | Estimado | Nota |
|---|---|---|
| Condominio (si lo paga el landlord) | ~$40–80/mes | A veces se pasa al inquilino; sobre renta $700 es ~7–13% |
| Administración (property mgmt) | 8–10% de la renta | Tarifa estándar de broker |
| Vacancia | 8–15% del bruto | Mercado de comprador, sobreoferta; ~1–2 meses/año de rotación |
| Riesgo de no-pago | 5–15% de merma | Régimen de desalojo débil (ver §6): costo real y de cola gorda |
| Mantenimiento/reparaciones | 5–10% de la renta | Más alto en stock viejo de $70k |

**Yield neto realista: ~4–6%** (inquilino paga condominio, bien administrado); **puede caer a 2–4%**
si el dueño paga condominio, cae en un inquilino que no paga, o sufre vacancia extendida. Clase-Solar
neteia algo menos en % (~4–5%) pero con **menor varianza** (mejores inquilinos, más fácil de realquilar).
Confianza: **medio** en el ~4–6% central; **la cola de un solo inquilino no-pagador es la preocupación
dominante del modelo**, no el promedio.

Fuentes: [uHomie 2025](https://blog.uhomie.com.ve/arrendatario/cuanto-cuesta-un-alquiler-en-caracas/) ·
[Habity+ rentabilidad](https://www.habityplus.com/blog/rentabilidad-del-alquiler-en-venezuela)

---

## 4. Liquidez / tiempo de venta y exit haircut

Mercado de comprador, ilíquido, estructural. Factor #1: **no hay financiamiento hipotecario** — casi
todo es cash, lo que adelgaza dramáticamente el pool de compradores.

| Métrica | Valor | Rango | Fuente | Confianza |
|---|---|---|---|---|
| Días en mercado | ~180 (~6 meses) | 6–12+ meses | Estudio Bello Monte (ene 2021–may 2024) | Medio |
| Cierre vs asking (haircut) | ~91% del asking → **~9% haircut** | 8–15% | Estudio Las Mercedes | Medio |
| Tipo de mercado | Comprador, sobreoferta, sin banca | — | Análisis brokers 2025 | Alto |

**Guía de modelo:** **6–12 meses para vender** (premium/Solar más rápido, stock dateado de $70k más
lento), **exit haircut ~10%** sobre el asking ya negociado, **más comisión ~5%** encima. Para un modelo
conservador: **exit friction combinada ~12–15%** (tiempo + precio + comisión). El 9%/6 meses viene de
Las Mercedes (zona *más* líquida) — el corredor El Hatillo dateado probablemente ve **haircuts más
amplios y tiempos más largos**, así que trata 9%/6 meses como ancla optimista.

---

## 5. Condominio

| Métrica | Valor | Rango | Fuente | Confianza |
|---|---|---|---|---|
| Condominio mensual, apto medio | ~$40–80/mes | $20–150/mes | uHomie 2025; eldiario (nov 2025) | **Bajo (punto medio adivinado)** |

Apto dateado de $70k: **$30–70/mes**; clase-Solar (piscina/gym/seguridad 24h): **$80–150**. Servicios
básicos (agua/luz/gas) suman ~$30–80/mes aparte. **Alta incertidumbre** — específico del edificio, sin
cifra El-Hatillo-específica. Confianza: **adivinado** para cualquier punto único.

---

## 6. Ser landlord residencial en Venezuela — riesgo legal

**El riesgo cualitativo más importante de toda la tesis, y es genuinamente severo.** Históricamente,
el arrendamiento residencial venezolano es de los regímenes más pro-inquilino / hostiles-al-dueño del
hemisferio.

- **Ley para la Regularización y Control de los Arrendamientos de Vivienda (2011)** — creó **SUNAVI**,
  impuso fórmulas estatales de renta, registro administrativo obligatorio.
- **Ley contra el Desalojo y la Desocupación Arbitraria de Viviendas (Decreto 8.190, 2011)** — la clave:
  desalojar, incluso a un inquilino claramente moroso, es **extraordinariamente difícil**. Requiere agotar
  un procedimiento administrativo SUNAVI *antes* de ir a tribunales; los tribunales rehúsan lanzar a una
  familia a la calle. Brokers/abogados: **"un laberinto administrativo y judicial que podía durar años"**.
- Las fórmulas históricas capaban el yield residencial en **3% (dueños de 3+ unidades) a 5% (pequeños
  landlords)** de un valor tasado por el Estado — techo legal por debajo del yield de mercado, cuando se
  aplica.

**Consecuencia práctica:** el efecto disuasorio es tan fuerte que funcionarios estiman **~200,000
unidades deliberadamente vacías** porque el dueño prefiere no ganar nada antes que arriesgar un inquilino
que no puede sacar. Los landlords se protegen con **contratos cortos informales en dólares, depósitos
grandes (2–3 meses), y screening por referencia personal**.

**Reforma julio 2026 — fresca pero NO es ley todavía:** el 14 jul 2026 la AN aprobó **en primera
discusión** reformas pro-landlord (desalojo "de pleno derecho" por dos meses de mora, depósito de hasta
3 meses, arbitraje/mediación). **No modelar el deal asumiendo que la reforma está vigente.** Texto legal
venezolano y realidad de aplicación suelen diferir.

Fuentes: [Cedré Abogados — desalojo (abr 2026)](https://cedreabogados.com/2026/04/16/inquilino-no-paga-pasos-legales-desalojo-venezuela/) ·
[eldiario — reforma 14 jul 2026](https://eldiario.com/2026/07/14/reformas-ley-arrendamiento/) ·
[Ley contra el Desalojo (Decreto 8.190)](https://www.asambleanacional.gob.ve/leyes/sancionadas/decreto-n0-8190-mediante-el-cual-se-dicta-el-decreto-con-rango-valor-y-fuerza-de-la-ley-contra-el-desalojo-y-la-desocupacion-arbitraria-de-vivienda)

---

## 7. Costos de transacción (compra y venta)

Venezuela: **sin hipoteca**, de facto dolarizada, reventa fina y cash-only en USD. Los aranceles
"oficiales" están anclados a topes en bolívares que los registros sobrepasan vía su propio avalúo.
**Tratar topes legales como pisos, no como realidad.**

**COMPRA (% del precio, lo paga el COMPRADOR):**

| Costo | % típico | Rango | Nota |
|---|---|---|---|
| Registro (arancel) | 1.0–2.0% | 1%–hasta 40%* | Ley de Registros capa ~2%; registros sobre-avalúan |
| Notaría | 0.3–0.7% | 0.2–1% | |
| Redacción de documento (abogado) | ~1.0% | 0.5–1.5% | |
| Gestoría/trámites | 0.2–0.5% | 0.1–1% | |
| Solvencias | ~0.1–0.3% | flat | Obligación del vendedor; comprador verifica |
| Comisión inmobiliaria | **0%** | — | **La paga el vendedor** |
| IGTF (3%) | **0%** | 0% o 3% | Solo si una parte es *contribuyente especial*; venta privada normal exenta |

**TOTAL COMPRA: ~4% (central), rango 3–7%.** Stress fat-tail por sobre-avalúo de registro: **8–10%**.

**VENTA (% del precio, lo paga el VENDEDOR):**

| Costo | % típico | Rango | Nota |
|---|---|---|---|
| Comisión inmobiliaria | 4–5% | 3–5% | Techo 5% Cámara Inmobiliaria; la paga el dueño |
| Anticipo ISLR (Forma 33) | **0.5%** | 0.5% (o 0% exento) | Exento si vivienda principal o precio < 3,000 UT |
| Solvencias/condominio/RIF | ~0.1–0.3% | flat | |
| IGTF | 0% | 0% o 3% | Misma salvedad |

**TOTAL VENTA: ~4.5–5.5% (central), rango 3.5–6%.**

**Fricción ida-y-vuelta (comprar + vender): ~8–12% del valor**, antes de spread de precio o pérdida
de conversión de moneda.

Nota IGTF: el 3% aplica a pagos en divisa fuera de la banca **solo cuando una parte es contribuyente
especial designado**. Compra cash USD entre dos personas naturales ordinarias: **exenta**.
Fuentes: [Prodavinci IGTF](https://prodavinci.com/igtf-y-pagos-en-dolares-10-preguntas-y-respuestas/) ·
[ZonaVen gastos comprar 2026](https://zonaven.com/blog/gastos-adicionales-comprar-inmueble-venezuela) ·
[CIM Caracas — registros sobreestiman 5–40%](https://cimcaracas.com/registros-sobreestiman-inmuebles-y-cobran-aranceles-de-entre-5-y-hasta-40-sobre-el-valor/) ·
[Mettryc impuestos vender 2025](https://mettryc.com/blog/que-impuestos-se-pagan-al-vender-una-casa-en-venezuela-guia-completa-2025/25046)

---

## 8. Portabilidad del capital / controles de cambio

**Controles formales: en gran parte desmantelados** (CADIVI→CENCOEX→SICAD→DIPRO/DICOM abandonados
2018–2019; economía de facto dolarizada). **Pero "sin control cambiario" ≠ "capital portable".**

- La fricción real es **de-risking bancario por sanciones**, no la ley. Las sanciones a BCV hicieron
  que la mayoría de bancos corresponsales **detuvieran wires USD** hacia/desde Venezuela.
- Canales informales convierten cash local a cuenta foránea por **~4–7% de comisión**, con topes retail
  (~$1,000/día envío; ~$7,500/transacción recepción).
- Doble tasa persiste: oficial ~301 Bs/USD vs paralelo ~560 Bs/USD (~85% de brecha) → pérdida de
  conversión para lo que pase por bolívares.

**Ranking de "atrapamiento" para el modelo:**
- **Apartamento = muy atrapado.** Ilíquido, fijo, pool de compradores diminuto, y tras vender debes
  mover USD por canales informales de 4–7%. Costo de salida efectivo apila: fricción venta (~5%) +
  descuento liquidez (5–15%) + fricción egreso (4–7%).
- **Cripto (USDT/stables) / brokerage foráneo = muy portable.** Venezuela es top en adopción de
  stablecoins precisamente porque salta el cuello de botella bancario; capital se mueve casi instantáneo
  a <1–2%.
- Confianza: **alto** en la asimetría cualitativa; **medio** en los % precisos de egreso.

Fuentes: [Al Jazeera — mover USD](https://www.aljazeera.com/economy/2021/5/18/cash-flush-venezuelan-firms-are-moving-us-dollars-abroad-report) ·
[Ria — enviar dinero 2026](https://www.riamoneytransfer.com/en/blog/how-to-send-money-to-venezuela-in-2026/) ·
[Seattle Times — fin del control cambiario](https://www.seattletimes.com/business/venezuela-announces-end-to-exchange-controls-after-16-years/)

---

## 9. Riesgo político / expropiación

**La premisa del usuario es correcta.** Las expropiaciones Chávez/Maduro apuntaron abrumadoramente a
**petróleo, agro (~4M hectáreas), banca, cemento, acero, industrial, comercial** — el docket ICSID
(Exxon, ConocoPhillips, Smurfit) es todo corporativo/extractivo. **Apartamentos residenciales de
uso-propio esencialmente nunca fueron el blanco sistemático.**

Exposición residencial que sí ocurrió, fue estrecha: ~2010–2011 Chávez tomó ~6 *desarrollos*
residenciales apuntando a **constructoras** por "estafa inmobiliaria" o proyectos ociosos; el riesgo
de facto mayor fue **invasión de inmuebles vacíos** y la **ley pro-inquilino** (pérdida de uso/usufructo
más que de título).

| Evento | Prob. anual | Severidad (haircut) | Confianza |
|---|---|---|---|
| Expropiación estatal directa de apto individual | ~0.1–0.3%/año (central 0.2%) | 80–100% (compensación ~cero) | Adivinado/Medio |
| Evento adverso severo amplio (invasión, ocupación forzada, regulación confiscatoria, disputa de título) | ~0.5–1.5%/año (dependiente de era) | 30–100% | Adivinado/Medio |

**Sugerencia de modelo:** tratar como **jump risk** — pérdida esperada anual ~0.3–0.6% del valor +
escenario cola de **pérdida single-year ~80–100% a ~0.2% de probabilidad**. Es una prima de riesgo
político. Confianza: **Bajo-Medio** (el patrón cualitativo está bien soportado; las probabilidades
puntuales son juicio).

Fuentes: [NBC — Venezuela seizes apartments](https://www.nbcnews.com/id/wbna40064787) ·
[Foreign Policy — land reform](https://foreignpolicy.com/2015/11/13/this-land-was-your-land-venezuela-land-reform-chavez-maduro/)

---

## 10. Activos financieros — retornos, vol, drawdowns, correlaciones

*Todos los CAGR forward son SUPUESTOS, no hechos. Los CAGR forward de cripto (BTC 8%, ETH 7%) son
juicio defendible; analistas razonables van de 2% a 20%+. Correr sensibilidad.*

| Activo | CAGR base (nominal) | Bear/Bull | Vol anual | Peor drawdown | Recuperación | Cola (t ν) |
|---|---|---|---|---|---|---|
| **BTC** | 8% | 0% / 18% | 65% | −84% (2018), −77% (2022) | ~3 años | 4 |
| **ETH** | 7% | −3% / 20% | 90% | −94% (2018), −82% (2022) | ~3 años | 3 |
| **S&P 500 (TR)** | 10% | 5% / 12% | 16% | −55% (2007–09) | ~4.5 años | 6 |
| **Oro** | 5% | 2% / 8% | 15% | −45%+ (1980–2000s) | hasta ~28 años nominal | 6 |
| **Cash/T-bills** | 3.8% | 2% / 5% | 0.5% | ~0% nominal | n/a | normal |

**Justificación clave:**
- **BTC 8% base:** el CAGR histórico (~60–100%) **no es repetible** (partió de casi cero, curva-S de
  adopción única). Modelos forward (E*TRADE/Morgan Stanley ~4–10%, VanEck base ~15%) clusterean mucho
  más bajo. 8% = prima modesta sobre acciones por riesgo enorme. Bear 0%, bull 18%.
- **ETH 7% base:** sin ancla de escasez tipo "oro digital"; más riesgo de ejecución/competencia.
  Distribución más ancha y sesgada negativa.
- **S&P 500 10% nominal / ~6.9% real** (1928–2024, con dividendos). Nota: valuaciones altas 2026 →
  varias casas modelan 5–7% forward a 10 años. Considerar 7–8% base si horizonte < 20 años.
- **Oro 5%:** desde 1980 solo ~3.6% nominal (el 7.9% desde 1971 está inflado por el re-pricing 1971–80).
  Sin flujo de caja; real ~0–1%. **Puede ser dinero-muerto por décadas.**
- **T-bills 3.8%:** spot 3-meses al 15 jul 2026. Modelar como mean-reverting a ~3–3.5% largo plazo.
  Stablecoins: yield tipo T-bill *menos spread* + cola idiosincrática de depeg (USDC mar 2023).

**Matriz de correlación base (Pearson):**

| | BTC | ETH | SPX | Oro | Cash |
|---|---|---|---|---|---|
| **BTC** | 1.00 | **0.85** | **0.40** | 0.10 | 0.00 |
| **ETH** | 0.85 | 1.00 | 0.40 | 0.10 | 0.00 |
| **SPX** | 0.40 | 0.40 | 1.00 | 0.05 | 0.00 |
| **Oro** | 0.10 | 0.10 | 0.05 | 1.00 | 0.05 |
| **Cash** | 0.00 | 0.00 | 0.00 | 0.05 | 1.00 |

- **BTC–ETH ≈ 0.85 (alto):** se mueven juntos. **Tratar como ~un solo activo.**
- **BTC/ETH–SPX ≈ 0.40 (alto, inestable):** el claim "cripto descorrelacionado" está **muerto**.
  Rolling ha subido a ~0.3–0.5 desde 2022 y **spikea a 0.7–0.9 en estrés**. Cripto es **risk-on de alto beta**.
- **Oro–SPX ≈ 0.05 (alto):** casi descorrelacionado, a menudo negativo en crisis de acciones (hedge parcial).
- **Cash ≈ 0.00 con todo (alto):** el ancla.

**Recomendación de modelo (importante):** implementar **estructura de correlación de dos regímenes** —
matriz "normal" (arriba) y matriz "crisis" donde BTC/ETH/SPX saltan a 0.7–0.9 y oro va a ~−0.15 vs
acciones. Una matriz estática **subestima el riesgo de cola** (el "todo cae junto").

Fuentes: [S&P Global BTC vol](https://www.spglobal.com/en/research-insights/special-reports/bitcoin-volatility-trends-deep-dive) ·
[iShares BTC drawdown](https://www.ishares.com/us/insights/bitcoin-volatility-trends) ·
[Macrotrends S&P](https://www.macrotrends.net/2526/sp-500-historical-annual-returns) ·
[Phemex BTC-SPX corr](https://phemex.com/blogs/bitcoin-correlation-with-sp500) ·
[arXiv fat tails/Student-t](https://arxiv.org/pdf/2507.01983) ·
[VanEck](https://www.vaneck.com/us/en/blogs/digital-assets/matthew-sigel-vaneck-bitcoin-long-term-capital-market-assumptions/) ·
[TradingEconomics T-bill](https://tradingeconomics.com/united-states/3-month-bill-yield)

---

## 11. Contexto macro USD (para descontar)

| Métrica | Valor | Fecha | Confianza |
|---|---|---|---|
| T-bill 3 meses | 3.71–3.80% | jul 2026 | Alto |
| Treasury 2 años | 4.19% | jul 2026 | Alto |
| Treasury 10 años | 4.58% | jul 2026 | Alto |
| CPI USA (interanual) | 3.5% | jun 2026 | Alto |

Real risk-free implícito ≈ 0.2–1.1%. Para el modelo: **risk-free nominal 3.7% (corto) a 4.5% (largo)**;
inflación USD **3.5%** base (rango 2–4%).

---

### Salvedad global de confianza
Las cifras venezolanas vienen de blogs inmobiliarios/legales y guías de cámara, no de datasets
auditados: las tasas estatutarias son de confianza **alta**, las tasas efectivas/de práctica **media**,
y las probabilidades de riesgo político son juicios razonados (**bajo-medio**). Varios sitios
venezolanos bloquearon el fetch directo (HTTP 403); varias cifras salieron de extracción vía buscador,
no de lectura de página completa. **Re-verificar contra listings vivos antes de suscribir de verdad.**
