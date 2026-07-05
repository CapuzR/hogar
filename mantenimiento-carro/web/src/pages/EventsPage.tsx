import * as React from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Sparkles } from "lucide-react";
import {
  useAgenda,
  useCars,
  useEvents,
  useGenerateSuggestions,
  useGoogleStatus,
  useServiceTypes,
  type AgendaItem,
  type EventFilters,
} from "@/lib/api";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EventsTable } from "@/components/EventsTable";
import { AgendaCard } from "@/components/AgendaCard";
import { AgendaDialog } from "@/components/AgendaDialog";

type Tab = "agenda" | "historial";

export function EventsPage() {
  const [tab, setTab] = React.useState<Tab>("agenda");
  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-xl border bg-card p-1">
        <SegBtn active={tab === "agenda"} onClick={() => setTab("agenda")}>
          Agenda
        </SegBtn>
        <SegBtn active={tab === "historial"} onClick={() => setTab("historial")}>
          Historial
        </SegBtn>
      </div>
      {tab === "agenda" ? <AgendaView /> : <HistorialView />}
    </div>
  );
}

function SegBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg px-4 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/* ───────────────────────────── Agenda ───────────────────────────── */
function AgendaView() {
  const { data, isLoading } = useAgenda();
  const { data: g } = useGoogleStatus();
  const gen = useGenerateSuggestions();

  const items = data?.items ?? [];
  const suggested = items.filter((i) => i.status === "suggested");
  const scheduled = items.filter((i) => i.status === "scheduled");
  const done = items.filter((i) => i.status === "done");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => gen.mutate()} disabled={gen.isPending}>
          <Sparkles className="h-4 w-4" /> {gen.isPending ? "Generando…" : "Generar sugerencias"}
        </Button>
        <AgendaDialog
          trigger={
            <Button size="sm">
              <Plus className="h-4 w-4" /> Agendar
            </Button>
          }
        />
        {gen.data && (
          <span className="text-xs text-muted-foreground">
            {gen.data.created > 0 ? `${gen.data.created} nuevas sugerencias` : "sin nuevas sugerencias"}
          </span>
        )}
      </div>

      {g && !g.connected && (
        <Link
          to="/ajustes"
          className="block rounded-xl border border-warning/30 bg-warning/10 px-3 py-2.5 text-xs font-medium text-foreground hover:bg-warning/15"
        >
          {g.configured
            ? "Conecta Google Calendar en Ajustes"
            : "Falta configurar Google Calendar (ver GCLOUD_SETUP.md)"}{" "}
          para que al aprobar se invite a Ricardo y Maru →
        </Link>
      )}

      {isLoading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Cargando…</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-14 text-center">
          <p className="text-sm text-muted-foreground">
            Nada en la agenda todavía.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Toca “Generar sugerencias” o “Agendar” para empezar.
          </p>
        </div>
      ) : (
        <>
          <AgendaSection title="Sugeridos" hint="Recomendados por el app — apruébalos o descártalos" items={suggested} />
          <AgendaSection title="Próximos" hint="Programados y en el calendario" items={scheduled} />
          <AgendaSection title="Completados" items={done} />
        </>
      )}
    </div>
  );
}

function AgendaSection({ title, hint, items }: { title: string; hint?: string; items: AgendaItem[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-sm font-bold">
          {title} <span className="text-muted-foreground">· {items.length}</span>
        </h2>
        {hint && <span className="hidden text-xs text-muted-foreground sm:block">{hint}</span>}
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {items.map((it) => (
          <AgendaCard key={it.id} item={it} />
        ))}
      </div>
    </section>
  );
}

/* ───────────────────────────── Historial (ledger) ───────────────────────────── */
const ALL = "__all__";

function HistorialView() {
  const [car, setCar] = React.useState(ALL);
  const [system, setSystem] = React.useState(ALL);
  const [q, setQ] = React.useState("");
  const [onlyReview, setOnlyReview] = React.useState(false);
  const [qDebounced, setQDebounced] = React.useState("");

  React.useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  const filters: EventFilters = {
    car: car === ALL ? undefined : car,
    system: system === ALL ? undefined : system,
    q: qDebounced || undefined,
    needsReview: onlyReview ? true : undefined,
  };
  const { data, isLoading } = useEvents(filters);
  const { data: cars } = useCars();
  const { data: st } = useServiceTypes();

  const total = data?.events.reduce((s, e) => s + e.totalUsdt, 0) ?? 0;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {data?.total ?? 0} eventos · {money(total)}
      </p>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-3">
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar descripción, taller…"
            className="pl-8"
          />
        </div>
        <Select value={car} onValueChange={setCar}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los carros</SelectItem>
            {cars?.cars.map((c) => (
              <SelectItem key={c.slug} value={c.slug}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={system} onValueChange={setSystem}>
          <SelectTrigger className="w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los sistemas</SelectItem>
            {st?.systems.map((s) => (
              <SelectItem key={s.key} value={s.key}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant={onlyReview ? "default" : "outline"} onClick={() => setOnlyReview((v) => !v)}>
          Por revisar
        </Button>
      </div>

      <EventsTable events={data?.events ?? []} loading={isLoading} />
    </div>
  );
}
