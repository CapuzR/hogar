import { useParams } from "react-router-dom";
import { CalendarClock, Gauge, ReceiptText, Wrench, type LucideIcon } from "lucide-react";
import { useAgenda, useCars, useEvents, type Car, type EventDTO } from "@/lib/api";
import { dateEs, km, money, relativeDate } from "@/lib/format";
import { useSetTitle } from "@/lib/title";
import { CarImage } from "@/components/CarImage";
import { ServiceChips } from "@/components/shared";
import { EventDialog } from "@/components/EventDialog";

/** Detalle del vehículo: hero con el modelo + mosaicos de estado + actividad. */
export function VehicleDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: carsData } = useCars();
  const car = carsData?.cars.find((c) => c.slug === slug);
  const { data: ev } = useEvents({ car: slug });
  const events = ev?.events ?? [];
  const { data: agendaData } = useAgenda({ car: slug });
  const upcoming = (agendaData?.items ?? [])
    .filter((i) => i.status === "suggested" || i.status === "scheduled")
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))[0];

  useSetTitle(car ? `${car.make} ${car.model}` : "Vehículo");

  if (!car) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Cargando…</p>;
  }

  const accent =
    car.slug === "optra" ? "hsl(var(--optra))" : car.slug === "clio" ? "hsl(var(--clio))" : "hsl(var(--primary))";

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="text-center">
        <div className="text-lg font-bold leading-tight">
          {car.make} {car.model}
        </div>
        <div className="text-sm text-muted-foreground">
          {[car.year, car.trim].filter(Boolean).join(" · ")}
        </div>
        <div className="relative mx-auto mt-2 h-40 w-full max-w-xs">
          <span
            className="absolute inset-x-8 bottom-3 h-4 rounded-full blur-lg"
            style={{ background: accent, opacity: 0.28 }}
          />
          <CarImage slug={car.slug} className="relative h-full w-full" />
        </div>
      </div>

      {/* Mosaicos de estado */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={ReceiptText} label="Mantenimiento" value={money(car.totalUsdt)} sub={`${car.eventCount} eventos`} />
        <StatTile icon={CalendarClock} label="Último servicio" value={dateEs(car.lastServiceDate)} />
        <StatTile
          icon={Gauge}
          label="Odómetro"
          value={car.currentOdometer != null ? km(car.currentOdometer) : "pendiente"}
        />
        <StatTile
          icon={Wrench}
          label="Próximo"
          value={upcoming ? relativeDate(upcoming.scheduledDate).label : "—"}
          sub={upcoming ? (upcoming.serviceLabel ?? upcoming.title) : "sin pendientes"}
          muted={!upcoming}
        />
      </div>

      {/* Ficha compacta */}
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm sm:grid-cols-4">
          <Field label="Motor" value={car.engine} />
          <Field label="Transmisión" value={car.transmissionType === "automatic" ? "Automática" : car.transmissionType} />
          <Field label="Aceite" value={car.oilSpec} />
          <Field label="Color" value={car.color} />
        </div>
      </div>

      {/* Actividad reciente */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold">Actividad reciente</h2>
          <span className="text-xs text-muted-foreground">{events.length} eventos</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {events.slice(0, 6).map((e) => (
            <ActivityRow key={e.id} event={e} car={car} />
          ))}
          {events.length === 0 && (
            <div className="rounded-2xl border border-dashed py-10 text-center text-sm text-muted-foreground sm:col-span-2">
              Sin eventos registrados.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  muted,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  muted?: boolean;
}) {
  return (
    <div className="rounded-2xl border bg-card p-3.5 shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className={muted ? "tnum mt-2 text-base font-semibold text-muted-foreground" : "tnum mt-2 text-base font-semibold"}>
        {value}
      </div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-medium">{value ?? "—"}</div>
    </div>
  );
}

function ActivityRow({ event, car }: { event: EventDTO; car: Car }) {
  return (
    <EventDialog
      event={event}
      trigger={
        <button
          type="button"
          className="flex w-full items-start gap-3 rounded-2xl border bg-card p-3 text-left shadow-sm transition hover:shadow-md active:scale-[.99]"
        >
          <span
            className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: car.slug === "optra" ? "hsl(var(--optra))" : "hsl(var(--clio))" }}
          />
          <div className="min-w-0 flex-1">
            <ServiceChips services={event.services} />
            {event.description && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{event.description}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {dateEs(event.serviceDate)}
              {event.odometer != null && ` · ${km(event.odometer)}`}
            </p>
          </div>
          <span className="tnum shrink-0 text-sm font-semibold">{money(event.totalUsdt)}</span>
        </button>
      }
    />
  );
}
