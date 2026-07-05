import { useCars, useEvents, type Car } from "@/lib/api";
import { dateEs, km, money } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventsTable } from "@/components/EventsTable";

export function CarsPage() {
  const { data } = useCars();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Carros</h1>
        <p className="text-sm text-muted-foreground">Ficha e historial por vehículo.</p>
      </div>
      {data?.cars.map((c) => <CarSection key={c.slug} car={c} />)}
    </div>
  );
}

function CarSection({ car }: { car: Car }) {
  const { data } = useEvents({ car: car.slug });
  const accent = car.slug === "optra" ? "hsl(var(--optra))" : "hsl(var(--clio))";
  const ficha: [string, string | null][] = [
    ["Motor", car.engine],
    ["Transmisión", car.transmissionType === "automatic" ? "Automática" : car.transmissionType],
    ["Aceite", car.oilSpec],
    ["Placa", car.plate],
    ["Color", car.color],
    ["Odómetro", car.currentOdometer != null ? km(car.currentOdometer) : "pendiente"],
    ["Propietario", car.ownerName],
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="h-4 w-4 rounded-full" style={{ background: accent }} />
          <div>
            <CardTitle>
              {car.label} {car.trim && <span className="font-normal text-muted-foreground">· {car.trim}</span>}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {car.eventCount} eventos · {money(car.totalUsdt)} · último {dateEs(car.lastServiceDate)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-4">
          {ficha.map(([k, v]) => (
            <div key={k}>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{k}</div>
              <div className="font-medium">{v ?? "—"}</div>
            </div>
          ))}
        </div>
        <EventsTable events={data?.events ?? []} showCar={false} />
      </CardContent>
    </Card>
  );
}
