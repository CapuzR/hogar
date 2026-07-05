const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function money(n: number | null | undefined): string {
  return usd.format(n ?? 0);
}

export function dateEs(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-VE", { day: "2-digit", month: "short", year: "numeric" });
}

export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("es-VE", { month: "short", year: "2-digit" });
}

export function km(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("es-VE").format(n) + " km";
}

/** Etiqueta relativa a hoy ("hoy", "mañana", "en 3 días", "hace 2 días", "en 2 meses"). */
export function relativeDate(iso: string | null | undefined): {
  label: string;
  overdue: boolean;
  soon: boolean;
} {
  if (!iso) return { label: "—", overdue: false, soon: false };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  const overdue = diff < 0;
  const soon = diff >= 0 && diff <= 7;
  let label: string;
  if (diff === 0) label = "hoy";
  else if (diff === 1) label = "mañana";
  else if (diff === -1) label = "ayer";
  else if (diff > 1 && diff < 30) label = `en ${diff} días`;
  else if (diff < -1 && diff > -30) label = `hace ${Math.abs(diff)} días`;
  else {
    const months = Math.max(1, Math.round(Math.abs(diff) / 30));
    const plural = months > 1 ? "es" : "";
    label = diff > 0 ? `en ${months} mes${plural}` : `hace ${months} mes${plural}`;
  }
  return { label, overdue, soon };
}
