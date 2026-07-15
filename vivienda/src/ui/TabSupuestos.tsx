import type { Assumptions, AssetKey, StrategyResult } from "../model";
import { normalizeWeights } from "../model";
import { portfolioPresets } from "../model";
import { Section, Slider, Toggle, StatCard, Pill } from "./controls";
import { usd, pct, ASSET_COLORS } from "./format";

export function TabSupuestos({
  a,
  patch,
  deterministic,
}: {
  a: Assumptions;
  patch: (p: Partial<Assumptions>) => void;
  deterministic: StrategyResult[];
}) {
  const price = a.capital / (1 + a.buyCostPct);
  const blendedCAGR = a.assetOrder.reduce((s, k) => s + a.portfolioWeights[k] * a.assets[k].cagr, 0);
  const cryptoWeight = a.portfolioWeights.BTC + a.portfolioWeights.ETH;
  const maint = a.maintenancePct * price;
  const netAnnual = a.imputedRentMonthly * 12 - a.condoMonthly * 12 - maint;
  const netYield = netAnnual / a.capital;
  const weightSum = a.assetOrder.reduce((s, k) => s + a.portfolioWeights[k], 0);

  const setAsset = (k: AssetKey, field: "cagr" | "vol", v: number) =>
    patch({ assets: { ...a.assets, [k]: { ...a.assets[k], [field]: v } } });
  const setWeight = (k: AssetKey, v: number) =>
    patch({ portfolioWeights: { ...a.portfolioWeights, [k]: v } });
  const applyPreset = (name: string) => {
    const p = portfolioPresets[name];
    patch({ portfolioWeights: { BTC: p.BTC, ETH: p.ETH, SPX: p.SPX, GOLD: p.GOLD, STABLE: p.STABLE } });
  };

  return (
    <div>
      <p className="text-xs text-muted mb-4">
        Todo es ajustable. Etiquetas de confianza: <span className="text-emerald-400">alto</span> ·{" "}
        <span className="text-amber-400">medio</span> · <span className="text-rose-400">adivinado</span>. Los cambios
        recalculan Escenarios y Sensibilidad al instante; Monte Carlo se corre con su botón.
      </p>

      <div className="grid sm:grid-cols-4 gap-2.5 mb-6">
        <StatCard label="Compras un apto de" value={usd(price)} sub={`$70k / (1+${pct(a.buyCostPct, 0)} costos)`} tone="buy" />
        <StatCard label="CAGR portafolio (mezcla)" value={pct(blendedCAGR)} sub={`${pct(cryptoWeight, 0)} cripto`} tone="rent" />
        <StatCard label="Yield neto inmueble" value={pct(netYield)} sub="renta corridor − condo − mant" />
        <StatCard label="Break-even = A.IRR (base)" value={pct(deterministic.find((r) => r.id === "A")!.irr)} sub="CAGR que B necesita p/ empatar" tone="warn" />
      </div>

      <div className="grid lg:grid-cols-3 gap-x-8 gap-y-2">
        <div>
          <Section title="Marco general">
            <Slider label="Capital (cash)" value={a.capital} min={40000} max={150000} step={1000} onChange={(v) => patch({ capital: v })} format={usd} confidence="alto" />
            <Slider label="Horizonte" value={a.horizonYears} min={3} max={25} step={1} onChange={(v) => patch({ horizonYears: v })} format={(v) => v + " años"} confidence="alto" />
            <Slider label="Inflación USD" value={a.usdInflation} min={0.02} max={0.05} step={0.001} onChange={(v) => patch({ usdInflation: v })} format={(v) => pct(v)} confidence="alto" />
            <Slider label="Tasa libre de riesgo" value={a.riskFreeRate} min={0.02} max={0.05} step={0.001} onChange={(v) => patch({ riskFreeRate: v })} format={(v) => pct(v)} confidence="alto" />
            <Slider label="Ingreso familiar / mes" value={a.monthlyIncome} min={1000} max={15000} step={100} onChange={(v) => patch({ monthlyIncome: v })} format={usd} confidence="alto" />
            <Slider label="Burn familiar / mes (runway)" value={a.monthlyBurn} min={1000} max={10000} step={100} onChange={(v) => patch({ monthlyBurn: v })} format={usd} confidence="adivinado" />
          </Section>

          <Section title="Vivienda">
            <Slider label="Renta Solar (donde quieres vivir)" value={a.liveRentMonthly} min={900} max={2000} step={25} onChange={(v) => patch({ liveRentMonthly: v })} format={usd} confidence="alto" hint="Lo que paga B. Base del excedente reinvertible del dueño." />
            <Slider label="Renta corridor (unidad que compras)" value={a.imputedRentMonthly} min={500} max={1200} step={25} onChange={(v) => patch({ imputedRentMonthly: v })} format={usd} confidence="medio" hint="Renta que genera el corridor en rentvesting." />
            <Slider label="Apreciación real USD / año" value={a.appreciation} min={-0.03} max={0.05} step={0.002} onChange={(v) => patch({ appreciation: v })} format={(v) => pct(v)} confidence="medio" hint="Base 0%: Caracas plano/negativo por una década." />
            <Slider label="Vol. apreciación inmueble" value={a.appreciationVol} min={0} max={0.2} step={0.005} onChange={(v) => patch({ appreciationVol: v })} format={(v) => pct(v)} confidence="adivinado" />
            <Slider label="Condominio / mes" value={a.condoMonthly} min={20} max={200} step={5} onChange={(v) => patch({ condoMonthly: v })} format={usd} confidence="adivinado" />
            <Slider label="Mantenimiento / año" value={a.maintenancePct} min={0.005} max={0.025} step={0.001} onChange={(v) => patch({ maintenancePct: v })} format={(v) => pct(v)} confidence="medio" />
          </Section>
        </div>

        <div>
          <Section title="Transacción e iliquidez">
            <Slider label="Costo de compra" value={a.buyCostPct} min={0.03} max={0.10} step={0.005} onChange={(v) => patch({ buyCostPct: v })} format={(v) => pct(v)} confidence="medio" />
            <Slider label="Costo de venta" value={a.sellCostPct} min={0.035} max={0.07} step={0.005} onChange={(v) => patch({ sellCostPct: v })} format={(v) => pct(v)} confidence="medio" />
            <Slider label="Exit haircut (venta bajo asking)" value={a.exitHaircutPct} min={0} max={0.25} step={0.01} onChange={(v) => patch({ exitHaircutPct: v })} format={(v) => pct(v)} confidence="medio" />
            <Slider label="Meses para vender" value={a.monthsToSell} min={3} max={24} step={1} onChange={(v) => patch({ monthsToSell: v })} format={(v) => v + " m"} confidence="medio" />
            <Slider label="Fricción egreso de capital" value={a.capitalEgressPct} min={0} max={0.10} step={0.005} onChange={(v) => patch({ capitalEgressPct: v })} format={(v) => pct(v)} confidence="medio" hint="Sacar USD del país (canales informales)." />
          </Section>

          <Section title="Arrendamiento (rentvesting)">
            <Slider label="Vacancia" value={a.vacancyPct} min={0} max={0.3} step={0.01} onChange={(v) => patch({ vacancyPct: v })} format={(v) => pct(v)} confidence="medio" />
            <Slider label="No-pago (merma esperada)" value={a.nonPaymentPct} min={0} max={0.3} step={0.01} onChange={(v) => patch({ nonPaymentPct: v })} format={(v) => pct(v)} confidence="medio" />
            <Slider label="Admin. (% renta)" value={a.mgmtPctOfRent} min={0} max={0.12} step={0.005} onChange={(v) => patch({ mgmtPctOfRent: v })} format={(v) => pct(v)} confidence="alto" />
            <Slider label="Prob. inquilino no-pagador / año" value={a.badTenantAnnualProb} min={0} max={0.3} step={0.01} onChange={(v) => patch({ badTenantAnnualProb: v })} format={(v) => pct(v)} confidence="adivinado" hint="Año de renta perdido; SUNAVI hace el desalojo casi imposible." />
          </Section>

          <Section title="Riesgo político (jump)">
            <Slider label="Prob. evento severo / año" value={a.politicalAnnualProb} min={0} max={0.03} step={0.001} onChange={(v) => patch({ politicalAnnualProb: v })} format={(v) => pct(v, 2)} confidence="adivinado" />
            <Slider label="Severidad (haircut del inmueble)" value={a.politicalSeverity} min={0.3} max={1} step={0.05} onChange={(v) => patch({ politicalSeverity: v })} format={(v) => pct(v, 0)} confidence="adivinado" />
          </Section>
        </div>

        <div>
          <Section title="Portafolio" subtitle={`Pesos suman ${pct(weightSum, 0)} (se normalizan al calcular).`}>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {Object.entries(portfolioPresets).map(([key, p]) => (
                <button key={key} onClick={() => applyPreset(key)} className="text-[10px] px-2 py-1 rounded border border-line hover:bg-line/50 text-slate-300">
                  {p.label}
                </button>
              ))}
            </div>
            {a.assetOrder.map((k) => (
              <div key={k} className="mb-3">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full" style={{ background: ASSET_COLORS[k] }} />
                  <span className="text-xs text-slate-200 font-medium">{a.assets[k].label}</span>
                  <span className="ml-auto text-xs font-mono text-slate-100">{pct(normalizeWeights(a.portfolioWeights)[k], 0)}</span>
                </div>
                <Slider label="peso" value={a.portfolioWeights[k]} min={0} max={1} step={0.01} onChange={(v) => setWeight(k, v)} format={(v) => pct(v, 0)} />
                <div className="grid grid-cols-2 gap-2 -mt-1">
                  <Slider label="CAGR" value={a.assets[k].cagr} min={-0.05} max={0.25} step={0.005} onChange={(v) => setAsset(k, "cagr", v)} format={(v) => pct(v)} />
                  <Slider label="Vol" value={a.assets[k].vol} min={0} max={1.1} step={0.01} onChange={(v) => setAsset(k, "vol", v)} format={(v) => pct(v, 0)} />
                </div>
              </div>
            ))}
            {cryptoWeight >= 0.5 && (
              <p className="text-[10px] text-warn mt-1">
                ⚠ {pct(cryptoWeight, 0)} cripto con corr. BTC-ETH 0.85 = <b>una sola apuesta</b>, no diversificación.
              </p>
            )}
          </Section>

          <Section title="Toggles del modelo">
            <Toggle label="Reinvertir excedente mensual del dueño" checked={a.reinvestOwnerSurplus} onChange={(v) => patch({ reinvestOwnerSurplus: v })} hint="ON = comparación justa (el dueño invierte el ahorro de renta)." />
            <div className="rounded-md border border-line p-2.5 mb-3">
              <Toggle
                label="Excedente vs renta Solar (no corridor)"
                checked={a.ownerSurplusVsSolar}
                onChange={(v) => patch({ ownerSurplusVsSolar: v })}
                hint="ON = tu decisión real (incluye el downgrade de vivienda). OFF = aísla la decisión de ACTIVO puro (misma vivienda)."
              />
              <div className="ml-11 -mt-1">
                <Pill tone={a.ownerSurplusVsSolar ? "buy" : "rent"}>
                  {a.ownerSurplusVsSolar ? "Modo decisión-de-vida (A favorecida)" : "Modo activo-puro (comparación limpia)"}
                </Pill>
              </div>
            </div>
            <Toggle label="Pagar renta DESDE el portafolio" checked={a.payRentFromPortfolio} onChange={(v) => patch({ payRentFromPortfolio: v })} hint="Sequence risk: retiro Solar $/mes sobre $70k ≈ 24%/año → ruina. Míralo en Monte Carlo." />
            <Toggle label="Correlaciones de crisis (todo cae junto)" checked={a.useCrisisCorrelation} onChange={(v) => patch({ useCrisisCorrelation: v })} hint="Años de estrés: BTC/ETH/SPX → ~0.8, oro hedge." />
            <Slider label="Años de espera (compra diferida C2)" value={a.deferWaitYears} min={1} max={8} step={1} onChange={(v) => patch({ deferWaitYears: v })} format={(v) => v + " años"} confidence="adivinado" />
          </Section>
        </div>
      </div>
    </div>
  );
}
