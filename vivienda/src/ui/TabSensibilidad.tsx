import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import type { Assumptions } from "../model";
import { breakevenPortfolioCAGR, breakevenAppreciation, tornado, winnerHeatmap } from "../model";
import { usd, usdCompact, pct } from "./format";
import { StatCard, Pill } from "./controls";

export function TabSensibilidad({ a }: { a: Assumptions }) {
  const beCAGR = useMemo(() => breakevenPortfolioCAGR(a), [a]);
  const beAppr = useMemo(() => breakevenAppreciation(a), [a]);
  const tor = useMemo(() => tornado(a), [a]);
  const blended = a.assetOrder.reduce((s, k) => s + a.portfolioWeights[k] * a.assets[k].cagr, 0);

  const apprAxis = useMemo(() => [-0.03, -0.02, -0.01, 0, 0.01, 0.02, 0.03, 0.04, 0.05], []);
  const cagrAxis = useMemo(() => [0.0, 0.04, 0.08, 0.12, 0.16, 0.2, 0.25, 0.3], []);
  const heat = useMemo(() => winnerHeatmap(a, apprAxis, cagrAxis), [a, apprAxis, cagrAxis]);
  const cell = (appr: number, g: number) => heat.find((c) => c.appreciation === appr && c.portfolioCAGR === g)!;

  const torData = tor.map((t) => ({ name: t.param, low: t.low, high: t.high, swing: t.swing }));

  return (
    <div>
      <p className="text-xs text-muted mb-4">
        "¿Qué tendría que ser verdad?" — determinista. {a.ownerSurplusVsSolar ? <Pill tone="buy">modo decisión-de-vida</Pill> : <Pill tone="rent">modo activo-puro</Pill>}
      </p>

      <div className="grid sm:grid-cols-3 gap-2.5 mb-6">
        <StatCard label="CAGR que B necesita para empatar a A" value={pct(beCAGR)} sub={`hoy tu mezcla rinde ${pct(blended)} base`} tone={beCAGR > blended ? "warn" : "rent"} />
        <StatCard label="Apreciación que A necesita para empatar a B" value={pct(beAppr)} sub="con tu portafolio actual" tone={beAppr > 0 ? "warn" : "rent"} />
        <StatCard label="Brecha de CAGR (necesario − actual)" value={pct(beCAGR - blended)} sub={beCAGR > blended ? "B tiene que rendir MÁS que hoy" : "B ya rinde de sobra"} tone={beCAGR > blended ? "warn" : "rent"} />
      </div>

      <div className="rounded-lg border border-line bg-panel p-3 mb-6">
        <h3 className="text-xs font-semibold text-slate-200 mb-1">Heatmap 2D — ¿quién gana?</h3>
        <p className="text-[10px] text-muted mb-3">
          Apreciación inmueble (filas) × CAGR portafolio (columnas). <span className="text-buy">■ A gana</span> ·{" "}
          <span className="text-rent">■ B gana</span>. El ✚ marca tu punto actual (apreciación {pct(a.appreciation)}, mezcla {pct(blended)}).
        </p>
        <div className="overflow-x-auto">
          <table className="text-[10px] border-collapse">
            <thead>
              <tr>
                <th className="p-1 text-muted text-right sticky left-0 bg-panel">appr \ CAGR</th>
                {cagrAxis.map((g) => (
                  <th key={g} className="p-1 text-muted font-mono w-14 text-center">{pct(g, 0)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...apprAxis].reverse().map((appr) => (
                <tr key={appr}>
                  <td className="p-1 text-right font-mono text-muted sticky left-0 bg-panel">{pct(appr, 0)}</td>
                  {cagrAxis.map((g) => {
                    const c = cell(appr, g);
                    const isHere = Math.abs(appr - a.appreciation) < 0.005 && Math.abs(g - blended) < 0.02;
                    const intensity = Math.min(1, Math.abs(c.gap) / (a.capital * 3));
                    const bg = c.winner === "A"
                      ? `rgba(224,164,88,${0.15 + intensity * 0.55})`
                      : `rgba(76,159,112,${0.15 + intensity * 0.55})`;
                    return (
                      <td key={g} className="w-14 h-8 text-center font-mono text-slate-900 font-semibold" style={{ background: bg }} title={`gap A−B = ${usd(c.gap)}`}>
                        {isHere ? "✚" : c.winner}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-line bg-panel p-3">
        <h3 className="text-xs font-semibold text-slate-200 mb-1">Tornado — qué mueve más la brecha (B − A)</h3>
        <p className="text-[10px] text-muted mb-3">
          Cada barra: rango de la brecha patrimonial B−A al llevar esa variable de su extremo bajo al alto. Arriba =
          más influyente. Valores negativos = A gana esa configuración.
        </p>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={torData} layout="vertical" margin={{ top: 5, right: 20, left: 130, bottom: 0 }}>
            <XAxis type="number" tickFormatter={(v) => usdCompact(v as number)} tick={{ fill: "#8b949e", fontSize: 10 }} />
            <YAxis type="category" dataKey="name" tick={{ fill: "#c9d1d9", fontSize: 10 }} width={125} />
            <Tooltip formatter={(v: number) => usd(v)} labelFormatter={(l) => l as string} />
            <ReferenceLine x={0} stroke="#8b949e" />
            <Bar dataKey="low" name="extremo bajo" fill="#d1495b" isAnimationActive={false} />
            <Bar dataKey="high" name="extremo alto" fill="#5b8def" isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
