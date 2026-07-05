import * as React from "react";
import { CalendarClock, Check, ExternalLink, Pencil, Sparkles, Trash2, X } from "lucide-react";
import {
  useApproveAgenda,
  useCompleteAgenda,
  useDeleteAgenda,
  useDismissAgenda,
  type AgendaItem,
  type AgendaStatus,
} from "@/lib/api";
import { dateEs, relativeDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CarChip } from "@/components/shared";
import { AgendaDialog } from "@/components/AgendaDialog";

export function AgendaCard({ item }: { item: AgendaItem }) {
  const approve = useApproveAgenda();
  const dismiss = useDismissAgenda();
  const complete = useCompleteAgenda();
  const del = useDeleteAgenda();
  const [note, setNote] = React.useState<string | null>(null);

  const busy = approve.isPending || dismiss.isPending || complete.isPending || del.isPending;
  const rel = relativeDate(item.scheduledDate);

  async function onApprove() {
    setNote(null);
    try {
      const res = await approve.mutateAsync(item.id);
      if (!res.calendar.connected) {
        setNote("Programado. Conecta Google Calendar en Ajustes para enviar la invitación a Ricardo y Maru.");
      } else if (res.calendar.error) {
        setNote(`Programado, pero falló crear el evento en Calendar: ${res.calendar.error}`);
      }
    } catch (e) {
      setNote(String(e instanceof Error ? e.message : e));
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-3.5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <CarChip slug={item.carSlug} label={item.carLabel} />
        <StatusBadge status={item.status} />
      </div>

      <div className="mt-1.5 font-semibold leading-snug">{item.serviceLabel ?? item.title}</div>
      {item.status === "suggested" && item.reason && (
        <p className="mt-0.5 text-xs text-muted-foreground">{item.reason}</p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span
          className={cn(
            "inline-flex items-center gap-1 font-medium",
            rel.overdue ? "text-destructive" : rel.soon ? "text-warning" : "text-foreground",
          )}
        >
          <CalendarClock className="h-3.5 w-3.5" />
          {dateEs(item.scheduledDate)}
          {item.scheduledTime ? ` · ${item.scheduledTime}` : ""} · {rel.label}
        </span>
        {item.estimatedCost && <span className="text-muted-foreground">💵 {item.estimatedCost}</span>}
        {item.serviceCenter && <span className="text-muted-foreground">🔧 {item.serviceCenter}</span>}
      </div>

      {item.googleHtmlLink && (
        <a
          href={item.googleHtmlLink}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Ver en Google Calendar
        </a>
      )}

      {note && (
        <p className="mt-2 rounded-md border border-warning/30 bg-warning/10 px-2 py-1.5 text-xs text-foreground">
          {note}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {item.status === "suggested" && (
          <>
            <Button size="sm" onClick={onApprove} disabled={busy}>
              <Check className="h-3.5 w-3.5" /> Aprobar
            </Button>
            <AgendaDialog
              item={item}
              trigger={
                <Button variant="outline" size="sm">
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Button>
              }
            />
            <Button variant="ghost" size="sm" onClick={() => dismiss.mutate(item.id)} disabled={busy}>
              <X className="h-3.5 w-3.5" /> Descartar
            </Button>
          </>
        )}

        {item.status === "scheduled" && (
          <>
            <Button size="sm" onClick={() => complete.mutate(item.id)} disabled={busy}>
              <Check className="h-3.5 w-3.5" /> Completar
            </Button>
            <AgendaDialog
              item={item}
              trigger={
                <Button variant="outline" size="sm">
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Button>
              }
            />
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => {
                if (confirm("¿Cancelar este evento? Se borra también del calendario.")) del.mutate(item.id);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Cancelar
            </Button>
          </>
        )}

        {item.status === "done" && (
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => {
              if (confirm("¿Borrar este registro de la agenda?")) del.mutate(item.id);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" /> Borrar
          </Button>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: AgendaStatus }) {
  if (status === "suggested")
    return (
      <Badge variant="review" className="gap-1">
        <Sparkles className="h-3 w-3" /> Sugerido
      </Badge>
    );
  if (status === "scheduled")
    return (
      <Badge variant="default" className="gap-1">
        <CalendarClock className="h-3 w-3" /> Programado
      </Badge>
    );
  if (status === "done")
    return (
      <Badge variant="success" className="gap-1">
        <Check className="h-3 w-3" /> Hecho
      </Badge>
    );
  return null;
}
