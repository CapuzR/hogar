import * as React from "react";
import {
  useCars,
  useCreateEvent,
  useServiceTypes,
  useUpdateEvent,
  type EventDTO,
  type ServiceType,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NONE = "__none__";

export function EventDialog({
  event,
  trigger,
}: {
  event?: EventDTO;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const { data: cars } = useCars();
  const { data: st } = useServiceTypes();
  const create = useCreateEvent();
  const update = useUpdateEvent();
  const editing = !!event;

  const [car, setCar] = React.useState(NONE);
  const [date, setDate] = React.useState("");
  const [odometer, setOdometer] = React.useState("");
  const [serviceType, setServiceType] = React.useState("");
  const [vendor, setVendor] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [initialAmount, setInitialAmount] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  // Ref al evento actual: inicializamos el form SOLO al abrir, no cuando el prop
  // cambia de referencia por un refetch en segundo plano (evita pisar la edicion).
  const eventRef = React.useRef(event);
  eventRef.current = event;

  React.useEffect(() => {
    if (!open) return;
    const ev = eventRef.current;
    setError(null);
    setCar(ev?.carSlug ?? NONE);
    setDate(ev?.serviceDate ?? new Date().toISOString().slice(0, 10));
    setOdometer(ev?.odometer != null ? String(ev.odometer) : "");
    setServiceType(ev?.services[0]?.key ?? "");
    setVendor(ev?.vendorName ?? "");
    setDescription(ev?.description ?? "");
    const amt = ev ? String(ev.totalUsdt) : "";
    setAmount(amt);
    setInitialAmount(amt);
  }, [open]);

  const groups = React.useMemo(() => {
    const map = new Map<string, { label: string; items: ServiceType[] }>();
    for (const t of st?.types ?? []) {
      const g = map.get(t.systemKey) ?? { label: t.systemLabel, items: [] };
      g.items.push(t);
      map.set(t.systemKey, g);
    }
    return [...map.values()];
  }, [st]);

  async function submit() {
    setError(null);
    const odo = odometer ? Number.parseInt(odometer, 10) : null;

    // Monto: parsea y valida (blank = sin monto).
    const parseAmount = (s: string): number | null | "invalid" => {
      const t = s.trim();
      if (t === "") return null;
      const n = Number.parseFloat(t);
      return Number.isFinite(n) ? n : "invalid";
    };

    try {
      if (editing && event) {
        // Solo enviamos amount_usdt si el usuario CAMBIO el campo (evita colapsar
        // los pagos de un evento multi-pago en cada guardado). Vaciarlo => 0.
        let amountPatch: number | undefined;
        if (amount.trim() !== initialAmount.trim()) {
          const parsed = parseAmount(amount);
          if (parsed === "invalid") {
            setError("Monto invalido.");
            return;
          }
          amountPatch = parsed ?? 0;
        }
        await update.mutateAsync({
          id: event.id,
          patch: {
            car: car === NONE ? null : car,
            date,
            odometer: odo,
            description: description || null,
            vendor: vendor || null,
            service_type: serviceType || undefined,
            amount_usdt: amountPatch,
          },
        });
      } else {
        if (!serviceType) {
          setError("Elige un tipo de servicio.");
          return;
        }
        const parsed = parseAmount(amount);
        if (parsed === "invalid") {
          setError("Monto invalido.");
          return;
        }
        await create.mutateAsync({
          car: car === NONE ? null : car,
          date,
          odometer: odo,
          service_type: serviceType,
          vendor: vendor || undefined,
          description: description || undefined,
          source: "manual",
          payments: parsed !== null ? [{ amount: parsed, currency: "USD" }] : undefined,
        });
      }
      setOpen(false);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    }
  }

  const busy = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar evento" : "Nuevo evento"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Carro</Label>
              <Select value={car} onValueChange={setCar}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sin carro</SelectItem>
                  {cars?.cars.map((c) => (
                    <SelectItem key={c.slug} value={c.slug}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Fecha</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Tipo de servicio</Label>
            <Select value={serviceType} onValueChange={setServiceType}>
              <SelectTrigger>
                <SelectValue placeholder="Elegir servicio…" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <React.Fragment key={g.label}>
                    <div className="px-2 py-1 text-xs font-semibold uppercase text-muted-foreground">
                      {g.label}
                    </div>
                    {g.items.map((t) => (
                      <SelectItem key={t.key} value={t.key}>
                        {t.labelEs}
                      </SelectItem>
                    ))}
                  </React.Fragment>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Odómetro (km)</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
                placeholder="—"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Monto (USD)</Label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Taller / vendor</Label>
            <Input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Yirmen Pachecos…" />
          </div>

          <div className="grid gap-1.5">
            <Label>Descripción</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Partes, marca, síntoma…"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "Guardando…" : editing ? "Guardar cambios" : "Crear evento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
