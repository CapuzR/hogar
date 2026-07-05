import * as React from "react";
import { useFuel } from "@/lib/api";
import { dateEs, money } from "@/lib/format";
import { StatCard } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function FuelPage() {
  const { data, isLoading } = useFuel();
  const fuel = data?.fuel ?? [];

  const byOwner = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const f of fuel) m.set(f.owner ?? "—", (m.get(f.owner ?? "—") ?? 0) + (f.amountUsdt ?? 0));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [fuel]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Registro de combustible, separado del mantenimiento.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total gasolina" value={money(data?.totalUsdt)} sub={`${data?.count ?? 0} cargas`} accent="text-[hsl(var(--clio))]" />
        {byOwner.slice(0, 3).map(([owner, total]) => (
          <StatCard key={owner} label={owner} value={money(total)} />
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[92px]">Fecha</TableHead>
              <TableHead>Bomba</TableHead>
              <TableHead>Quién</TableHead>
              <TableHead>Carro</TableHead>
              <TableHead className="text-right w-[96px]">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                  Cargando…
                </TableCell>
              </TableRow>
            ) : (
              fuel.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{dateEs(f.fuelDate)}</TableCell>
                  <TableCell>{f.vendor ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="muted" className="font-normal">
                      {f.owner ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {f.carSlug ? (f.carSlug === "optra" ? "Optra" : "Clio") : "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium tnum">{money(f.amountUsdt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
