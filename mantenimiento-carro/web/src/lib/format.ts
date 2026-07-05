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
