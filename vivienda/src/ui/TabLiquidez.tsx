import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine } from "recharts";
import type { Assumptions, StrategyResult } from "../model";
import { STRAT_COLORS, usdCompact } from "./format";
import { StatCard } from "./controls";

export function TabLiquidez({ deterministic, a }: { deterministic: StrategyResult[]; a: Assumptions }) {
  const years = deterministic[0].trajectory.map((p) => p.year);
  const runwayData = years.map((y) => {
    const row: Record<string, number> = { year: y };
    for (const s of deterministic) row[s.id] = s.trajectory[y].runwayMonths;
    return row;
  });
  const liquidData = years.map((y) => {
    const row: Record<string, number> = { year: y };
    for (const s of deterministic) row[s.id] = s.trajectory[y].liquidValue;
    return row;
  });

  const A = deterministic.find((s) => s.id === "A")!;
  const B = deterministic.find((s) => s.id === "B")!;
  const runwayNow = (s: StrategyResult) => s.trajectory[0].runwayMonths;
  const runwayYr = (s: StrategyResult, y: number) => s.trajectory[Math.min(y, s.trajectory.length - 1)].runwayMonths;

  return (
    <div>
      <p className="text-xs text-muted mb-4">
        La métrica que más te importa como founder: <b>meses de runway personal disponibles en cualquier momento t</b>{" "}
        = valor líquido / burn (${a.monthlyBurn.toLocaleString()}/mes). El apartamento <b>no es líquido</b> (tarda{" "}
        {a.monthsToSell} meses en venderse), así que aporta 0 runway hasta que lo vendes.
      </p>

      <div className="grid sm:grid-cols-4 gap-2.5 mb-6">
        <StatCard label="A · runway HOY (t=0)" value={runwayNow(A).toFixed(0) + " m"} sub="todo el capital atrapado en el apto" tone="warn" />
        <StatCard label="B · runway HOY (t=0)" value={runwayNow(B).toFixed(0) + " m"} sub="portafolio 100% líquido" tone="rent" />
        <StatCard label="A · runway a 3 años" value={runwayYr(A, 3).toFixed(0) + " m"} sub="el excedente reinvertido acumula" />
        <StatCard label="B · runway a 3 años" value={runwayYr(B, 3).toFixed(0) + " m"} sub="" />
      </div>

      <div className="rounded-lg border border-line bg-panel p-3 mb-5">
        <h3 className="text-xs font-semibold text-slate-200 mb-1">Meses de runway disponibles en t</h3>
        <p className="text-[10px] text-muted mb-2">
          A y C1/C2 arrancan cerca de 0 (capital atrapado en el inmueble); B/D/E arrancan líquidos. La línea de{" "}
          <span className="text-slate-300">5 meses</span> es tu runway de startup actual — abajo de eso, un apuro te obliga a rematar el apto.
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={runwayData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a313c" />
            <XAxis dataKey="year" tick={{ fill: "#8b949e", fontSize: 11 }} tickFormatter={(v) => "a" + v} />
            <YAxis tick={{ fill: "#8b949e", fontSize: 11 }} tickFormatter={(v) => v + "m"} />
            <Tooltip formatter={(v: number, n: string) => [v.toFixed(0) + " meses", n]} labelFormatter={(l) => "Año " + l} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine y={5} stroke="#d1495b" strokeDasharray="4 4" label={{ value: "runway startup ~5m", fill: "#d1495b", fontSize: 10, position: "insideTopRight" }} />
            {deterministic.map((s) => (
              <Line key={s.id} type="monotone" dataKey={s.id} name={s.id} stroke={STRAT_COLORS[s.id]} dot={false} isAnimationActive={false} strokeWidth={s.id === "A" || s.id === "B" ? 2.2 : 1.2} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-lg border border-line bg-panel p-3">
        <h3 className="text-xs font-semibold text-slate-200 mb-1">Capital líquido en t (portátil)</h3>
        <p className="text-[10px] text-muted mb-2">
          Lo que puedes mover, meter a la empresa, o llevarte del país sin rematar un inmueble. El apartamento vale 0 aquí.
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={liquidData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a313c" />
            <XAxis dataKey="year" tick={{ fill: "#8b949e", fontSize: 11 }} tickFormatter={(v) => "a" + v} />
            <YAxis tick={{ fill: "#8b949e", fontSize: 11 }} tickFormatter={(v) => usdCompact(v as number)} />
            <Tooltip formatter={(v: number, n: string) => [usdCompact(v), n]} labelFormatter={(l) => "Año " + l} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {deterministic.map((s) => (
              <Line key={s.id} type="monotone" dataKey={s.id} name={s.id} stroke={STRAT_COLORS[s.id]} dot={false} isAnimationActive={false} strokeWidth={s.id === "A" || s.id === "B" ? 2.2 : 1.2} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
