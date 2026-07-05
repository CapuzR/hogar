import * as React from "react";
import {
  useCars,
  useCreateAgenda,
  useServiceTypes,
  useUpdateAgenda,
  type AgendaItem,
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

/** Crear / editar un evento de agenda (mantenimiento a programar). */
export function AgendaDialog({ item, trigger }: { item?: AgendaItem; trigger: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const { data: cars } = useCars();
  const { data: st } = useServiceTypes();
  const create = useCreateAgenda();
  const update = useUpdateAgenda();
  const editing = !!item;

  const [car, setCar] = React.useState(NONE);
  const [serviceType, setServiceType] = React.useState(NONE);
  const [title, setTitle] = React.useState("");
  const [date, setDate] = React.useState("");
  const [time, setTime] = React.useState("");
  const [cost, setCost] = React.useState("");
  const [center, setCenter] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const itemRef = React.useRef(item);
  itemRef.current = item;

  React.useEffect(() => {
    if (!open) return;
    const it = itemRef.current;
    setError(null);
    setCar(it?.carSlug ?? NONE);
    setServiceType(it?.serviceTypeKey ?? NONE);
    setTitle(it?.title ?? "");
    setDate(it?.scheduledDate ?? new Date().toISOString().slice(0, 10));
    setTime(it?.scheduledTime ?? "");
    setCost(it?.estimatedCost ?? "");
    setCenter(it?.serviceCenter ?? "");
    setNotes(it?.notes ?? "");
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

  function onPickService(key: string) {
    setServiceType(key);
    // Autocompleta el título si está vacío.
    if (!title.trim() && key !== NONE) {
      const label = st?.types.find((t) => t.key === key)?.labelEs;
      if (label) setTitle(label);
    }
  }

  async function submit() {
    setError(null);
    if (!title.trim()) {
      setError("Ponle un título.");
      return;
    }
    const payload = {
      car: car === NONE ? null : car,
      service_type: serviceType === NONE ? null : serviceType,
      title: title.trim(),
      date,
      time: time || null,
      estimated_cost: cost || null,
      service_center: center || null,
      notes: notes || null,
    };
    try {
      if (editing && item) {
        await update.mutateAsync({ id: item.id, patch: payload });
      } else {
        await create.mutateAsync(payload);
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
          <DialogTitle>{editing ? "Editar evento" : "Agendar mantenimiento"}</DialogTitle>
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
              <Label>Servicio</Label>
              <Select value={serviceType} onValueChange={onPickService}>
                <SelectTrigger>
                  <SelectValue placeholder="Elegir…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sin tipo</SelectItem>
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
          </div>

          <div className="grid gap-1.5">
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Cambio de aceite…" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Fecha</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Hora (opcional)</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Costo estimado</Label>
              <Input value={cost} onChange={(e) => setCost(e.target.value)} placeholder="$100 - $1000" />
            </div>
            <div className="grid gap-1.5">
              <Label>Taller</Label>
              <Input value={center} onChange={(e) => setCenter(e.target.value)} placeholder="Yirmen Pachecos…" />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Nota</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Detalle…" />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "Guardando…" : editing ? "Guardar cambios" : "Crear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
