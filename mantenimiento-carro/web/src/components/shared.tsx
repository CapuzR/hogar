import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { EventDTO, ServiceRef } from "@/lib/api";

/** Punto de color + etiqueta del carro (optra=oscuro, clio=azul). */
export function CarChip({
  slug,
  label,
  className,
}: {
  slug: string | null;
  label: string | null;
  className?: string;
}) {
  const color = slug === "optra" ? "bg-[hsl(var(--optra))]" : slug === "clio" ? "bg-[hsl(var(--clio))]" : "bg-muted-foreground/40";
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap", className)}>
      <span className={cn("h-2.5 w-2.5 rounded-full", color)} />
      <span className={slug ? "" : "text-muted-foreground"}>
        {slug ? (label ?? slug) : "Sin carro"}
      </span>
    </span>
  );
}

/** Chips de los servicios del evento. */
export function ServiceChips({ services }: { services: ServiceRef[] }) {
  if (services.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {services.map((s) => (
        <Badge key={s.key} variant="secondary" title={s.systemKey}>
          {s.labelEs}
        </Badge>
      ))}
    </div>
  );
}

export function SourceBadge({ source }: { source: string | null }) {
  if (!source) return null;
  const map: Record<string, string> = {
    ynab: "YNAB",
    merged: "YNAB+Notion",
    notion: "Notion",
    whatsapp: "WhatsApp",
    manual: "Manual",
    cap: "Cap",
    maruita: "Maruita",
  };
  return (
    <Badge variant="muted" className="font-normal">
      {map[source] ?? source}
    </Badge>
  );
}

export function ConfidenceDot({ event }: { event: EventDTO }) {
  const c = event.confidence ?? 0;
  const color = c >= 0.85 ? "bg-emerald-500" : c >= 0.6 ? "bg-amber-500" : "bg-red-500";
  return (
    <span
      className={cn("inline-block h-2 w-2 rounded-full", color)}
      title={`confianza ${(c * 100).toFixed(0)}%`}
    />
  );
}

export function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-2xl font-bold tnum", accent)}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
