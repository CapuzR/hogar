import * as React from "react";
import { Plus, Search } from "lucide-react";
import { useCars, useEvents, useServiceTypes, type EventFilters } from "@/lib/api";
import { money } from "@/lib/format";
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
import { EventDialog } from "@/components/EventDialog";

const ALL = "__all__";

export function EventsPage() {
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Mantenimiento</h1>
          <p className="text-sm text-muted-foreground">
            {data?.total ?? 0} eventos · {money(total)}
          </p>
        </div>
        <EventDialog
          trigger={
            <Button>
              <Plus className="h-4 w-4" /> Nuevo evento
            </Button>
          }
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
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
        <Button
          variant={onlyReview ? "default" : "outline"}
          onClick={() => setOnlyReview((v) => !v)}
        >
          Por revisar
        </Button>
      </div>

      <EventsTable events={data?.events ?? []} loading={isLoading} />
    </div>
  );
}
