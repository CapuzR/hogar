import { Pencil } from "lucide-react";
import type { EventDTO } from "@/lib/api";
import { dateEs, km, money } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CarChip, ConfidenceDot, ServiceChips, SourceBadge } from "@/components/shared";
import { EventDialog } from "@/components/EventDialog";

export function EventsTable({
  events,
  showCar = true,
  loading,
}: {
  events: EventDTO[];
  showCar?: boolean;
  loading?: boolean;
}) {
  if (loading) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Cargando…</div>;
  }
  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
        No hay eventos que coincidan.
      </div>
    );
  }
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[92px]">Fecha</TableHead>
            {showCar && <TableHead className="w-[130px]">Carro</TableHead>}
            <TableHead>Servicio</TableHead>
            <TableHead>Taller</TableHead>
            <TableHead className="text-right w-[96px]">Monto</TableHead>
            <TableHead className="w-[120px]">Origen</TableHead>
            <TableHead className="w-[44px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((e) => (
            <TableRow key={e.id}>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {dateEs(e.serviceDate)}
              </TableCell>
              {showCar && (
                <TableCell>
                  <CarChip slug={e.carSlug} label={e.carSlug ? (e.carSlug === "optra" ? "Optra" : "Clio") : null} />
                </TableCell>
              )}
              <TableCell>
                <div className="flex flex-col gap-1">
                  <ServiceChips services={e.services} />
                  {e.description && (
                    <span className="text-xs text-muted-foreground line-clamp-1" title={e.description}>
                      {e.description}
                    </span>
                  )}
                  {e.odometer != null && (
                    <span className="text-[11px] text-muted-foreground">{km(e.odometer)}</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-sm">
                {e.vendorCanonical ?? e.vendorName ?? <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-right font-medium tnum">{money(e.totalUsdt)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  <ConfidenceDot event={e} />
                  <SourceBadge source={e.source} />
                  {e.needsReview && <Badge variant="review">revisar</Badge>}
                </div>
              </TableCell>
              <TableCell>
                <EventDialog
                  event={e}
                  trigger={
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  }
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
