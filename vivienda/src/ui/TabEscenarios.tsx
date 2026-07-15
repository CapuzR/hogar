import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import type { Assumptions, DeterministicRun } from "../model";
import { usd, usdCompact, pct, STRAT_COLORS } from "./format";
import { Pill } from "./controls";

const NARRATIVE: Record<string, { title: string; body: string; tone: "warn" | "neutral" | "ok" }> = {
  bear: {
    title: "BEAR — el país y los mercados en contra",
    body: "Apreciación −2%/año, cripto en su rango bajo (BTC 0%, ETH −3%), S&P 5%, exit haircut +8pp, vacancia y no-pago más altos. Es el escenario donde ser landlord en Caracas duele y el portafolio cripto sangra.",
    tone: "warn",
  },
  base: {
    title: "BASE — supuestos centrales",
    body: "Apreciación 0% (Caracas plano), portafolio pro-riesgo con CAGR base (BTC 8%, ETH 7%, SPX 10%). Costos y fricciones centrales. Es el caso más defendible dado el research.",
    tone: "neutral",
  },
  bull: {
    title: "BULL — todo sale bien",
    body: "Apreciación +4%/año (diáspora vuelve, sanciones ceden), cripto en rango alto (BTC 18%, ETH 20%), SPX 12%. El inmueble recupera y el portafolio vuela — el mejor mundo para ambos.",
    tone: "ok",
  },
};

export function TabEscenarios({ scenarios, a }: { scenarios: DeterministicRun[]; a: Assumptions }) {
  const ids = scenarios[0].strategies.map((s) => s.id);
  const chartData = ids.map((id) => {
    const row: Record<string, number | string> = { id, label: id };
    for (const run of scenarios) {
      row[run.scenario] = run.strategies.find((s) => s.id === id)!.terminalHonest;
    }
    return row;
  });

  return (
    <div>
      <p className="text-xs text-muted mb-4">
        Patrimonio neto <b>honesto</b> (inmueble ya penalizado por venta+haircut+egreso) a {a.horizonYears} años,
        determinista. 6 estrategias × 3 escenarios. {a.ownerSurplusVsSolar ? <Pill tone="buy">modo decisión-de-vida</Pill> : <Pill tone="rent">modo activo-puro</Pill>}
      </p>

      <div className="grid md:grid-cols-3 gap-3 mb-5">
        {scenarios.map((run) => (
          <div key={run.scenario} className={"rounded-lg border bg-panel p-3 " + (run.scenario === "bear" ? "border-warn/30" : run.scenario === "bull" ? "border-emerald-500/30" : "border-line")}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-100">{NARRATIVE[run.scenario].title}</span>
              <Pill tone={NARRATIVE[run.scenario].tone}>{run.scenario}</Pill>
            </div>
            <p className="text-[10px] text-muted leading-relaxed">{NARRATIVE[run.scenario].body}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-line bg-panel p-3 mb-5">
        <h3 className="text-xs font-semibold text-slate-200 mb-2">Patrimonio terminal honesto por estrategia</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a313c" />
            <XAxis dataKey="label" tick={{ fill: "#8b949e", fontSize: 11 }} />
            <YAxis tickFormatter={(v) => usdCompact(v as number)} tick={{ fill: "#8b949e", fontSize: 11 }} />
            <Tooltip formatter={(v: number) => usd(v)} labelFormatter={(l) => "Estrategia " + l} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="bear" name="bear" fill="#d1495b" isAnimationActive={false} />
            <Bar dataKey="base" name="base" fill="#5b8def" isAnimationActive={false} />
            <Bar dataKey="bull" name="bull" fill="#4c9f70" isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-xs">
          <thead className="bg-panel text-muted">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Estrategia</th>
              {scenarios.map((r) => (
                <th key={r.scenario} colSpan={2} className="text-center px-3 py-2 font-medium border-l border-line capitalize">{r.scenario}</th>
              ))}
            </tr>
            <tr className="text-[10px]">
              <th></th>
              {scenarios.flatMap((r) => [
                <th key={r.scenario + "n"} className="text-right px-3 py-1 border-l border-line">patrimonio</th>,
                <th key={r.scenario + "i"} className="text-right px-3 py-1">IRR</th>,
              ])}
            </tr>
          </thead>
          <tbody>
            {ids.map((id) => (
              <tr key={id} className="border-t border-line hover:bg-line/20">
                <td className="px-3 py-2">
                  <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: STRAT_COLORS[id] }} />
                  <span className="text-slate-200">{scenarios[0].strategies.find((s) => s.id === id)!.label}</span>
                </td>
                {scenarios.flatMap((r) => {
                  const s = r.strategies.find((x) => x.id === id)!;
                  return [
                    <td key={r.scenario + "v"} className="text-right px-3 py-2 font-mono tabular-nums border-l border-line text-slate-100">{usd(s.terminalHonest)}</td>,
                    <td key={r.scenario + "r"} className="text-right px-3 py-2 font-mono tabular-nums text-muted">{pct(s.irr)}</td>,
                  ];
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
