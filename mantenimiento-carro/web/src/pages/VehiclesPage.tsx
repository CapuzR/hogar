import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useCars, useStats, type Car } from "@/lib/api";
import { dateEs, money } from "@/lib/format";
import { CarImage } from "@/components/CarImage";

/** Home tipo "My Vehicles": resumen + tarjeta por carro con su modelo. */
export function VehiclesPage() {
  const { data, isLoading } = useCars();
  const { data: stats } = useStats();
  const cars = data?.cars ?? [];

  return (
    <div className="space-y-5">
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryTile
            label="Mantenimiento"
            value={money(stats.totals.maintenanceUsdt)}
            sub={`${stats.totals.eventCount} eventos`}
          />
          <SummaryTile
            label="Gasolina"
            value={money(stats.totals.fuelUsdt)}
            sub={`${stats.totals.fuelCount} cargas`}
          />
          <SummaryTile
            label="Total"
            value={money(stats.totals.maintenanceUsdt + stats.totals.fuelUsdt)}
          />
          <SummaryTile label="Carros" value={String(cars.length)} sub="activos" />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {cars.map((c) => (
          <VehicleCard key={c.slug} car={c} />
        ))}
        {isLoading && cars.length === 0 && (
          <p className="py-16 text-center text-sm text-muted-foreground sm:col-span-2">Cargando carros…</p>
        )}
      </div>
    </div>
  );
}

function SummaryTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="tnum mt-1 text-xl font-bold">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function VehicleCard({ car }: { car: Car }) {
  const accent =
    car.slug === "optra" ? "hsl(var(--optra))" : car.slug === "clio" ? "hsl(var(--clio))" : "hsl(var(--primary))";

  return (
    <Link
      to={`/carro/${car.slug}`}
      className="group flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm transition hover:shadow-md active:scale-[.99]"
    >
      <div className="relative h-20 w-28 shrink-0">
        <span
          className="absolute inset-x-3 bottom-1 h-3 rounded-full blur-md"
          style={{ background: accent, opacity: 0.25 }}
        />
        <CarImage slug={car.slug} className="relative h-full w-full" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold leading-tight">
          {car.make} {car.model}
        </div>
        <div className="mt-1 inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
          {car.plate ?? "—"}
        </div>
        <div className="mt-1.5 text-xs text-muted-foreground">
          {car.year} · {money(car.totalUsdt)} · último {dateEs(car.lastServiceDate)}
        </div>
      </div>

      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
    </Link>
  );
}
