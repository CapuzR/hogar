import * as React from "react";
import { Check, Pencil, Trash2 } from "lucide-react";
import {
  useCars,
  useDeleteEvent,
  useEvents,
  useUpdateEvent,
  type EventDTO,
} from "@/lib/api";
import { dateEs, money } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ServiceChips } from "@/components/shared";
import { EventDialog } from "@/components/EventDialog";

const NONE = "__none__";

export function ReviewPage() {
  const { data, isLoading } = useEvents({ needsReview: true });
  const { data: cars } = useCars();
  const update = useUpdateEvent();
  const del = useDeleteEvent();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const events = data?.events ?? [];

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function batchAssign(slug: string) {
    for (const id of selected) await update.mutateAsync({ id, patch: { car: slug === NONE ? null : slug } });
  }
  async function batchApprove() {
    for (const id of selected) await update.mutateAsync({ id, patch: { approve: true } });
    setSelected(new Set());
  }

  if (isLoading) return <div className="py-16 text-center text-sm text-muted-foreground">Cargando…</div>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {events.length} eventos por confirmar (carro, monto o tipo de servicio).
      </p>

      {events.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
          🎉 Nada por revisar. Todo aprobado.
        </div>
      ) : (
        <>
          {selected.size > 0 && (
            <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3 shadow-sm">
              <span className="text-sm font-medium">{selected.size} seleccionados</span>
              <Select onValueChange={batchAssign}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Asignar carro…" />
                </SelectTrigger>
                <SelectContent>
                  {cars?.cars.map((c) => (
                    <SelectItem key={c.slug} value={c.slug}>
                      {c.label}
                    </SelectItem>
                  ))}
                  <SelectItem value={NONE}>Sin carro</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={batchApprove} disabled={update.isPending}>
                <Check className="h-4 w-4" /> Aprobar {selected.size}
              </Button>
              <Button variant="ghost" onClick={() => setSelected(new Set())}>
                Limpiar
              </Button>
            </div>
          )}

          <div className="space-y-3">
            {events.map((e) => (
              <ReviewCard
                key={e.id}
                event={e}
                cars={cars?.cars ?? []}
                selected={selected.has(e.id)}
                onToggle={() => toggle(e.id)}
                onAssign={(slug) => update.mutate({ id: e.id, patch: { car: slug === NONE ? null : slug } })}
                onApprove={() => update.mutate({ id: e.id, patch: { approve: true } })}
                onDiscard={() => {
                  if (confirm("¿Descartar este evento? Se elimina definitivamente.")) del.mutate(e.id);
                }}
                busy={update.isPending || del.isPending}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ReviewCard({
  event,
  cars,
  selected,
  onToggle,
  onAssign,
  onApprove,
  onDiscard,
  busy,
}: {
  event: EventDTO;
  cars: { slug: string; label: string }[];
  selected: boolean;
  onToggle: () => void;
  onAssign: (slug: string) => void;
  onApprove: () => void;
  onDiscard: () => void;
  busy: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Checkbox checked={selected} onCheckedChange={onToggle} className="mt-1" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">{dateEs(event.serviceDate)}</span>
            <ServiceChips services={event.services} />
            <span className="tnum ml-auto font-semibold">{money(event.totalUsdt)}</span>
          </div>
          {event.description && <p className="mt-1 text-sm">{event.description}</p>}
          {event.rawText && (
            <p className="mt-1.5 rounded-md border border-warning/30 bg-warning/10 px-2.5 py-1.5 text-xs text-foreground">
              ⚠ {event.rawText}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Select value={event.carSlug ?? NONE} onValueChange={onAssign}>
              <SelectTrigger className="h-8 w-[150px]">
                <SelectValue placeholder="Asignar carro" />
              </SelectTrigger>
              <SelectContent>
                {cars.map((c) => (
                  <SelectItem key={c.slug} value={c.slug}>
                    {c.label}
                  </SelectItem>
                ))}
                <SelectItem value={NONE}>Sin carro</SelectItem>
              </SelectContent>
            </Select>
            {event.vendorCanonical && (
              <Badge variant="muted" className="font-normal">
                {event.vendorCanonical}
              </Badge>
            )}
            <div className="ml-auto flex items-center gap-1.5">
              <EventDialog
                event={event}
                trigger={
                  <Button variant="outline" size="sm">
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Button>
                }
              />
              <Button variant="outline" size="sm" onClick={onDiscard} disabled={busy}>
                <Trash2 className="h-3.5 w-3.5" /> Descartar
              </Button>
              <Button size="sm" onClick={onApprove} disabled={busy}>
                <Check className="h-3.5 w-3.5" /> Aprobar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
