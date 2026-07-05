import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useStats } from "@/lib/api";
import { money, monthLabel } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/shared";

const SYS_COLORS = [
  "#1e3a5f", "#2563eb", "#0891b2", "#059669", "#65a30d", "#ca8a04",
  "#dc2626", "#9333ea", "#db2777", "#475569", "#0d9488", "#7c3aed",
];

export function DashboardPage() {
  const { data, isLoading } = useStats();

  if (isLoading || !data) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Cargando…</div>;
  }

  const { totals, byCar, bySystem, byMonth } = data;
  const months = byMonth.map((m) => ({ ...m, label: monthLabel(m.month) }));

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">Gasto de mantenimiento y gasolina · Optra &amp; Clio</p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Mantenimiento" value={money(totals.maintenanceUsdt)} sub={`${totals.eventCount} eventos`} />
        <StatCard label="Gasolina" value={money(totals.fuelUsdt)} sub={`${totals.fuelCount} cargas`} accent="text-[hsl(var(--clio))]" />
        <StatCard label="Total general" value={money(totals.maintenanceUsdt + totals.fuelUsdt)} />
        <Link to="/revision">
          <StatCard
            label="Por revisar"
            value={String(totals.needsReviewCount)}
            sub="ir a la cola →"
            accent={totals.needsReviewCount > 0 ? "text-amber-600" : "text-emerald-600"}
          />
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Gasto por carro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {byCar.map((c) => {
              const max = Math.max(...byCar.map((x) => x.totalUsdt), 1);
              const color = c.carSlug === "optra" ? "hsl(var(--optra))" : c.carSlug === "clio" ? "hsl(var(--clio))" : "hsl(var(--muted-foreground))";
              return (
                <div key={c.carLabel}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span>{c.carLabel}</span>
                    <span className="tnum font-medium">
                      {money(c.totalUsdt)} <span className="text-muted-foreground">· {c.count}</span>
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(c.totalUsdt / max) * 100}%`, background: color }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Gasto por sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[220px] space-y-1.5 overflow-y-auto pr-1">
              {bySystem.map((s, i) => (
                <div key={s.systemKey} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: SYS_COLORS[i % SYS_COLORS.length] }} />
                  <span className="flex-1 truncate">{s.systemLabel}</span>
                  <span className="text-xs text-muted-foreground">{s.count}</span>
                  <span className="tnum w-20 text-right font-medium">{money(s.totalUsdt)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Gasto por mes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={months} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: number, name) => [money(v), name === "maintenance" ? "Mantenimiento" : "Gasolina"]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                />
                <Bar dataKey="maintenance" stackId="a" fill="hsl(var(--optra))" radius={[0, 0, 0, 0]} />
                <Bar dataKey="fuel" stackId="a" fill="hsl(var(--clio))" radius={[3, 3, 0, 0]}>
                  {months.map((_, i) => (
                    <Cell key={i} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "hsl(var(--optra))" }} /> Mantenimiento
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "hsl(var(--clio))" }} /> Gasolina
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
