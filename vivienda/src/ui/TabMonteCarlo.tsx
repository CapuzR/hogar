import { useState } from "react";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Legend,
} from "recharts";
import type { Assumptions, MonteCarloResult, StrategyId } from "../model";
import { usd, usdCompact, pct, STRAT_COLORS } from "./format";
import { StatCard, Pill } from "./controls";

export function TabMonteCarlo({
  a, mc, running, onRun, stamp,
}: {
  a: Assumptions;
  mc: MonteCarloResult | null;
  running: boolean;
  onRun: () => void;
  stamp: string;
}) {
  const [sel, setSel] = useState<StrategyId>("B");

  if (!mc) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-slate-300 mb-1">Monte Carlo — {a.mcPaths.toLocaleString()} paths, retornos correlacionados, colas t-Student.</p>
        <p className="text-xs text-muted mb-5 max-w-md">
          Cada path aplica los mismos choques a las 6 estrategias (comparación justa). Cripto con colas gordas
          (BTC ν=4, ETH ν=3) y correlación de crisis. Tarda ~1-2s.
        </p>
        <button onClick={onRun} disabled={running} className="px-5 py-2 rounded-md bg-accent text-white text-sm font-medium disabled:opacity-50">
          {running ? "Calculando…" : "Correr Monte Carlo"}
        </button>
      </div>
    );
  }

  const selStats = mc.stats.find((s) => s.id === sel)!;
  const bStats = mc.stats.find((s) => s.id === "B")!;

  // Fan chart: bandas apiladas con deltas.
  const fanData = selStats.fan.map((f) => ({
    year: f.year,
    base: f.p5,
    d5_25: f.p25 - f.p5,
    d25_50: f.p50 - f.p25,
    d50_75: f.p75 - f.p50,
    d75_95: f.p95 - f.p75,
    p50: f.p50,
  }));
  const color = STRAT_COLORS[sel];

  // Comparación de medianas de todas las estrategias.
  const years = selStats.fan.map((f) => f.year);
  const medianData = years.map((y) => {
    const row: Record<string, number> = { year: y };
    for (const s of mc.stats) row[s.id] = s.fan[y].p50;
    return row;
  });

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted">{stamp}</span>
          {a.payRentFromPortfolio && <Pill tone="warn">pagando renta desde el portafolio</Pill>}
          {a.ownerSurplusVsSolar ? <Pill tone="buy">modo decisión-de-vida</Pill> : <Pill tone="rent">modo activo-puro</Pill>}
        </div>
        <button onClick={onRun} disabled={running} className="px-3 py-1.5 rounded-md bg-line text-slate-200 text-xs disabled:opacity-50">
          {running ? "Calculando…" : "Recalcular"}
        </button>
      </div>

      <div className="grid sm:grid-cols-4 gap-2.5 mb-5">
        <StatCard label="P(B supera a A)" value={pct(mc.probB_beats_A)} sub="patrimonio honesto al horizonte" tone={mc.probB_beats_A >= 0.5 ? "rent" : "warn"} />
        <StatCard label="B · P(pérdida > 50%)" value={pct(bStats.probLossOver50)} sub="termina < $35k" tone="warn" />
        <StatCard label="B · max drawdown medio" value={pct(bStats.medianMaxDrawdown)} sub="pico-a-valle en el camino" tone="warn" />
        <StatCard label="B · runway al horizonte" value={bStats.medianRunwayAtHorizon.toFixed(0) + " m"} sub="meses de burn cubiertos" tone="rent" />
      </div>

      <div className="rounded-lg border border-line bg-panel p-3 mb-5">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <h3 className="text-xs font-semibold text-slate-200">Fan chart — distribución del patrimonio (P5–P95)</h3>
          <div className="flex gap-1 flex-wrap">
            {mc.stats.map((s) => (
              <button key={s.id} onClick={() => setSel(s.id)} className={"text-[10px] px-2 py-1 rounded border " + (sel === s.id ? "text-white" : "text-slate-300 border-line hover:bg-line/40")} style={sel === s.id ? { background: STRAT_COLORS[s.id], borderColor: STRAT_COLORS[s.id] } : {}}>
                {s.id}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={fanData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a313c" />
            <XAxis dataKey="year" tick={{ fill: "#8b949e", fontSize: 11 }} tickFormatter={(v) => "a" + v} />
            <YAxis tickFormatter={(v) => usdCompact(v as number)} tick={{ fill: "#8b949e", fontSize: 11 }} />
            <Tooltip
              formatter={(v: number, name: string) => [usd(v), name]}
              labelFormatter={(l) => "Año " + l}
              content={<FanTooltip fan={selStats.fan} />}
            />
            <ReferenceLine y={a.capital} stroke="#8b949e" strokeDasharray="4 4" label={{ value: "capital $70k", fill: "#8b949e", fontSize: 10, position: "insideTopLeft" }} />
            <Area dataKey="base" stackId="1" stroke="none" fill="transparent" isAnimationActive={false} />
            <Area dataKey="d5_25" stackId="1" stroke="none" fill={color} fillOpacity={0.12} isAnimationActive={false} />
            <Area dataKey="d25_50" stackId="1" stroke="none" fill={color} fillOpacity={0.28} isAnimationActive={false} />
            <Area dataKey="d50_75" stackId="1" stroke="none" fill={color} fillOpacity={0.28} isAnimationActive={false} />
            <Area dataKey="d75_95" stackId="1" stroke="none" fill={color} fillOpacity={0.12} isAnimationActive={false} />
            <Area dataKey="p50" stroke={color} strokeWidth={2} fill="none" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
        <p className="text-[10px] text-muted mt-1">
          Bandas: P5–P25–P50–P75–P95 de <b>{selStats.label}</b>. Nota la cola derecha gorda de las estrategias con
          cripto (P95 &gt;&gt; mediana) y la izquierda por debajo del capital.
        </p>
      </div>

      <div className="rounded-lg border border-line bg-panel p-3 mb-5">
        <h3 className="text-xs font-semibold text-slate-200 mb-2">Trayectoria mediana — todas las estrategias</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={medianData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a313c" />
            <XAxis dataKey="year" tick={{ fill: "#8b949e", fontSize: 11 }} tickFormatter={(v) => "a" + v} />
            <YAxis tickFormatter={(v) => usdCompact(v as number)} tick={{ fill: "#8b949e", fontSize: 11 }} />
            <Tooltip formatter={(v: number, n: string) => [usd(v), n]} labelFormatter={(l) => "Año " + l} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {mc.stats.map((s) => (
              <Line key={s.id} type="monotone" dataKey={s.id} name={s.id} stroke={STRAT_COLORS[s.id]} dot={false} isAnimationActive={false} strokeWidth={s.id === "A" || s.id === "B" ? 2.2 : 1.2} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-xs">
          <thead className="bg-panel text-muted">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Estrategia</th>
              <th className="text-right px-3 py-2 font-medium">P5</th>
              <th className="text-right px-3 py-2 font-medium">P25</th>
              <th className="text-right px-3 py-2 font-medium">Mediana</th>
              <th className="text-right px-3 py-2 font-medium">P75</th>
              <th className="text-right px-3 py-2 font-medium">P95</th>
              <th className="text-right px-3 py-2 font-medium">media</th>
              <th className="text-right px-3 py-2 font-medium">P(&gt;A)</th>
              <th className="text-right px-3 py-2 font-medium">P(pérd&gt;50%)</th>
              <th className="text-right px-3 py-2 font-medium">P(ruina)</th>
              <th className="text-right px-3 py-2 font-medium">runway</th>
            </tr>
          </thead>
          <tbody>
            {mc.stats.map((s) => (
              <tr key={s.id} className="border-t border-line hover:bg-line/20">
                <td className="px-3 py-2"><span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: STRAT_COLORS[s.id] }} />{s.label}</td>
                <td className="text-right px-3 py-2 font-mono tabular-nums text-warn">{usdCompact(s.terminalPercentiles.p5)}</td>
                <td className="text-right px-3 py-2 font-mono tabular-nums text-muted">{usdCompact(s.terminalPercentiles.p25)}</td>
                <td className="text-right px-3 py-2 font-mono tabular-nums text-slate-100">{usdCompact(s.terminalPercentiles.p50)}</td>
                <td className="text-right px-3 py-2 font-mono tabular-nums text-muted">{usdCompact(s.terminalPercentiles.p75)}</td>
                <td className="text-right px-3 py-2 font-mono tabular-nums text-emerald-400">{usdCompact(s.terminalPercentiles.p95)}</td>
                <td className="text-right px-3 py-2 font-mono tabular-nums text-slate-300">{usdCompact(s.terminalPercentiles.mean)}</td>
                <td className="text-right px-3 py-2 font-mono tabular-nums">{s.id === "A" ? "—" : pct(s.probBeatsA)}</td>
                <td className="text-right px-3 py-2 font-mono tabular-nums text-warn">{pct(s.probLossOver50)}</td>
                <td className="text-right px-3 py-2 font-mono tabular-nums">{s.probRuin > 0 ? pct(s.probRuin) : "—"}</td>
                <td className="text-right px-3 py-2 font-mono tabular-nums">{s.medianRunwayAtHorizon.toFixed(0)}m</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FanTooltip({ active, label, fan }: { active?: boolean; label?: number; fan?: { year: number; p5: number; p25: number; p50: number; p75: number; p95: number }[] }) {
  if (!active || fan === undefined || label === undefined) return null;
  const f = fan.find((x) => x.year === label);
  if (!f) return null;
  return (
    <div className="rounded-lg border border-line bg-panel px-3 py-2 text-[11px]">
      <div className="text-slate-200 font-medium mb-1">Año {label}</div>
      {(["p95", "p75", "p50", "p25", "p5"] as const).map((k) => (
        <div key={k} className="flex justify-between gap-4">
          <span className="text-muted uppercase">{k}</span>
          <span className="font-mono tabular-nums text-slate-100">{usd(f[k])}</span>
        </div>
      ))}
    </div>
  );
}
