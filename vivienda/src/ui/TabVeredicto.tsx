import { useMemo } from "react";
import type { Assumptions, MonteCarloResult, StrategyResult } from "../model";
import { runDeterministic, breakevenPortfolioCAGR } from "../model";
import { usd, pct } from "./format";
import { StatCard, Pill } from "./controls";

export function TabVeredicto({
  a, deterministic, mc, onRunMC, mcRunning,
}: {
  a: Assumptions;
  deterministic: StrategyResult[];
  mc: MonteCarloResult | null;
  onRunMC: () => void;
  mcRunning: boolean;
}) {
  const solar = useMemo(() => runDeterministic({ ...a, ownerSurplusVsSolar: true }), [a]);
  const asset = useMemo(() => runDeterministic({ ...a, ownerSurplusVsSolar: false }), [a]);
  const beSolar = useMemo(() => breakevenPortfolioCAGR({ ...a, ownerSurplusVsSolar: true }), [a]);
  const beAsset = useMemo(() => breakevenPortfolioCAGR({ ...a, ownerSurplusVsSolar: false }), [a]);
  const blended = a.assetOrder.reduce((s, k) => s + a.portfolioWeights[k] * a.assets[k].cagr, 0);

  const A_s = solar.find((r) => r.id === "A")!;
  const B_s = solar.find((r) => r.id === "B")!;
  const A_a = asset.find((r) => r.id === "A")!;
  const B_a = asset.find((r) => r.id === "B")!;

  return (
    <div className="max-w-3xl">
      <h2 className="text-lg font-semibold text-slate-100 mb-1">Veredicto honesto</h2>
      <p className="text-xs text-muted mb-5">
        Tu hipótesis: "alquilar + invertir (B) gana". Mi trabajo era romperla. Resultado: <b>depende enteramente de
        una pregunta que no es financiera</b> — ¿de verdad vivirías en el corridor?
      </p>

      <div className="rounded-lg border border-accent/40 bg-accent/5 p-4 mb-5">
        <h3 className="text-sm font-semibold text-slate-100 mb-2">El hallazgo que rompe (o salva) tu tesis</h3>
        <p className="text-[13px] text-slate-300 leading-relaxed mb-3">
          A (comprar) casi no gana por el <i>inmueble</i> — el apto es plano y aporta poco. Gana porque, al vivir en
          corridor en vez de alquilar el Solar, <b>liberas ~{usd(a.liveRentMonthly * 12 - a.condoMonthly * 12)}/año que
          reinviertes</b>. De ese excedente, ~${(a.imputedRentMonthly * 12 - a.condoMonthly * 12).toLocaleString()}/año es
          ahorro genuino de comprar-vs-alquilar la misma unidad, y ~${((a.liveRentMonthly - a.imputedRentMonthly) * 12).toLocaleString()}/año
          es simplemente <b>vivir más barato y bancar la diferencia</b>. Es una tasa de ahorro disfrazada de decisión inmobiliaria.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-md border border-buy/30 bg-panel p-3">
            <div className="text-[11px] text-buy font-semibold mb-1">Modo decisión-de-vida (Solar vs corridor)</div>
            <div className="text-[12px] text-slate-300">A: <b>{usd(A_s.terminalHonest)}</b> (IRR {pct(A_s.irr)}) · B: {usd(B_s.terminalHonest)} (IRR {pct(B_s.irr)})</div>
            <div className="text-[11px] text-muted mt-1">B necesita <b className="text-warn">{pct(beSolar)}</b> de CAGR para empatar. Tu mezcla rinde {pct(blended)}. → <b>A gana.</b></div>
          </div>
          <div className="rounded-md border border-rent/30 bg-panel p-3">
            <div className="text-[11px] text-rent font-semibold mb-1">Modo activo-puro (misma vivienda)</div>
            <div className="text-[12px] text-slate-300">A: {usd(A_a.terminalHonest)} (IRR {pct(A_a.irr)}) · B: <b>{usd(B_a.terminalHonest)}</b> (IRR {pct(B_a.irr)})</div>
            <div className="text-[11px] text-muted mt-1">B necesita <b className="text-rent">{pct(beAsset)}</b> — casi tu retorno base. → <b>empate/B.</b></div>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-2.5 mb-5">
        <StatCard label="P(B > A) — Monte Carlo" value={mc ? pct(mc.probB_beats_A) : "—"} sub={mc ? "patrimonio honesto" : "corre Monte Carlo"} tone={mc && mc.probB_beats_A >= 0.5 ? "rent" : "warn"} />
        <StatCard label="B · runway HOY" value={deterministic.find((r) => r.id === "B")!.trajectory[0].runwayMonths.toFixed(0) + " m"} sub="líquido desde el día 1" tone="rent" />
        <StatCard label="A · runway HOY" value={deterministic.find((r) => r.id === "A")!.trajectory[0].runwayMonths.toFixed(0) + " m"} sub="capital atrapado en el apto" tone="warn" />
      </div>

      {!mc && (
        <button onClick={onRunMC} disabled={mcRunning} className="mb-5 px-4 py-1.5 rounded-md bg-accent text-white text-xs disabled:opacity-50">
          {mcRunning ? "Calculando…" : "Correr Monte Carlo para completar el veredicto"}
        </button>
      )}

      <div className="space-y-3 text-[13px] text-slate-300 leading-relaxed mb-6">
        <p>
          <b className="text-slate-100">Mi lectura.</b> En expectativa pura de patrimonio, <b>tu hipótesis está equivocada
          en tu propio framing</b> (Solar-rent vs corridor-buy): comprar gana ~70% de las veces porque el ahorro de renta
          reinvertido supera a un portafolio de $70k. Pero eso asume dos cosas frágiles: (1) que inviertes el excedente
          cada mes por {a.horizonYears} años sin fallar — improbable para un founder estirado con bebé; y (2) que estás
          dispuesto a vivir en corridor, no en el Solar. Si cualquiera de las dos se cae, B/E ganan.
        </p>
        <p>
          <b className="text-slate-100">Dónde B sí es superior.</b> Liquidez y portabilidad. B te da{" "}
          {deterministic.find((r) => r.id === "B")!.trajectory[0].runwayMonths.toFixed(0)} meses de runway hoy; A te da ~0
          por años. Para alguien con 5 meses de pista y una empresa que puede necesitar capital o forzar una mudanza, esa
          opcionalidad vale mucho — y no aparece en el IRR. B también tiene la cola derecha: en el Monte Carlo, cuando
          cripto vuela, B deja a A muy atrás (mira el P95). B es la apuesta de <i>mayor varianza, mayor opcionalidad</i>,
          no la de mayor valor esperado.
        </p>
        <p>
          <b className="text-slate-100">La trampa de tu portafolio.</b> 65% en BTC+ETH con correlación 0.85 no es un
          portafolio, es <b>una sola apuesta apalancada a cripto</b>. En modo activo-puro, <b>E (60/40 aburrido) casi
          empata a B con una fracción del riesgo</b> — si tu tesis es "no comprar", el 60/40 es probablemente mejor
          vehículo que el 65%-cripto, salvo que específicamente quieras la lotería.
        </p>
        <p>
          <b className="text-slate-100">El perdedor claro.</b> C1 rentvesting: pagas Solar, cobras corridor (spread
          negativo) y encima cargas el riesgo de SUNAVI. Dominado. C2 (compra diferida) es el mejor híbrido: capturas
          upside y conservas opcionalidad varios años.
        </p>
      </div>

      <h3 className="text-sm font-semibold text-slate-100 mb-2">Kill criteria — qué haría que cada opción sea la equivocada</h3>
      <div className="space-y-2">
        {[
          { p: <Pill tone="buy">A comprar</Pill>, t: "Se equivoca si: no reinviertes el excedente con disciplina; el startup necesita el capital y tienes que rematar el apto (−10% haircut + 6-12 meses); hay evento jurisdiccional; o valoras vivir en el Solar más que el patrimonio extra." },
          { p: <Pill tone="rent">B portafolio</Pill>, t: "Se equivoca si: vas a vivir en corridor de todas formas (entonces comprar+invertir gana); no aguantas un drawdown −60% sin vender; cripto entra en otra 'winter' de años; o necesitas certeza para la familia más que upside." },
          { p: <Pill tone="neutral">E 60/40</Pill>, t: "Se equivoca si: crees de verdad en la tesis cripto de largo plazo (te pierdes la cola derecha) — es la opción 'correcta pero aburrida'." },
          { p: <Pill tone="neutral">C2 diferida</Pill>, t: "Se equivoca si: cripto colapsa justo antes de tu ventana de compra (compras un apto pequeño), o si nunca ejecutas la compra y solo pospones." },
          { p: <Pill tone="warn">C1 / D</Pill>, t: "C1 casi siempre está equivocada aquí (spread negativo + riesgo landlord). D (stables) solo gana si viene una década horrible para TODO lo demás." },
        ].map((k, i) => (
          <div key={i} className="rounded-md border border-line bg-panel p-3 flex gap-3 items-start">
            <div className="shrink-0 mt-0.5">{k.p}</div>
            <p className="text-[12px] text-slate-300 leading-snug">{k.t}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-lg border border-line bg-panel/60 p-4">
        <h3 className="text-sm font-semibold text-slate-100 mb-1">Recomendación (con confianza media, marcada como opinión)</h3>
        <p className="text-[13px] text-slate-300 leading-relaxed">
          Dado tu perfil — founder, runway corto, bebé, deseo de opcionalidad y de poder irte — <b>no compres el corridor
          ahora</b>. No porque B gane en patrimonio esperado (no gana en tu framing), sino porque <b>estás comprando
          opcionalidad y liquidez en el peor momento para amarrarlas</b>. Mi sugerencia concreta: <b>C2 diluida</b> —
          mantén el capital líquido, pero <b>no 65% cripto</b>: algo como 60/40 con una tajada satélite de cripto (≤25%)
          que puedas aguantar en un −70%. Reevalúa comprar en 2-4 años, cuando el startup tenga tracción o exit y el
          capital atrapado ya no sea un riesgo existencial. Si en cambio ya decidiste que vas a vivir modesto y ahorrar
          agresivo pase lo que pase, entonces <b>A (comprar) construye más patrimonio</b> — pero entra con los ojos
          abiertos a los ~0 meses de runway de los primeros años.
        </p>
      </div>
    </div>
  );
}
