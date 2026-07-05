import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Monitor,
  Moon,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { useGoogleStatus, useStats } from "@/lib/api";
import { useTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const THEME_OPTIONS: { value: Theme; label: string; icon: LucideIcon }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Auto", icon: Monitor },
];

const FLASH: Record<string, { text: string; tone: "ok" | "warn" | "err" }> = {
  connected: { text: "Google Calendar conectado.", tone: "ok" },
  error: { text: "No se pudo conectar. Intenta de nuevo.", tone: "err" },
  denied: { text: "Cancelaste el permiso.", tone: "warn" },
  norefresh: {
    text: "Google no devolvió el token. Revoca el acceso del app en tu cuenta de Google y reconecta.",
    tone: "warn",
  },
  missing: { text: "Faltan las credenciales de Google (ver GCLOUD_SETUP.md).", tone: "warn" },
};

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { data: stats } = useStats();
  const reviewCount = stats?.totals.needsReviewCount ?? 0;

  return (
    <div className="max-w-xl space-y-6">
      <Section title="Apariencia">
        <div className="grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-xs font-medium transition",
                theme === value ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent",
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Calendario Hogar">
        <CalendarCard />
      </Section>

      <Section title="Gestión">
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <NavRow to="/revision" icon={ClipboardCheck} label="Cola de revisión" badge={reviewCount} />
          <div className="border-t" />
          <NavRow to="/reportes" icon={BarChart3} label="Reportes y gastos" />
        </div>
      </Section>

      <p className="pt-2 text-center text-xs text-muted-foreground">Mantenimiento · Optra &amp; Clio</p>
    </div>
  );
}

function CalendarCard() {
  const { data: gs, isLoading } = useGoogleStatus();
  const [params] = useSearchParams();
  const qc = useQueryClient();
  const [disconnecting, setDisconnecting] = React.useState(false);
  const flash = params.get("google");

  async function disconnect() {
    if (!confirm("¿Desconectar Google Calendar?")) return;
    setDisconnecting(true);
    try {
      await fetch("/api/google/disconnect", { method: "POST" });
      qc.invalidateQueries({ queryKey: ["google-status"] });
    } finally {
      setDisconnecting(false);
    }
  }

  const invitees = gs?.invitees ?? ["capuzr@gmail.com", "mariaeugeniaalvarezb@gmail.com"];

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 font-medium">
        <CalendarDays className="h-4 w-4 text-primary" /> Google Calendar compartido
      </div>

      {flash && FLASH[flash] && (
        <p
          className={cn(
            "mt-2 rounded-lg border px-2.5 py-1.5 text-xs",
            FLASH[flash].tone === "ok"
              ? "border-success/30 bg-success/10 text-success"
              : FLASH[flash].tone === "err"
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : "border-warning/30 bg-warning/10 text-foreground",
          )}
        >
          {FLASH[flash].text}
        </p>
      )}

      <p className="mt-1.5 text-sm text-muted-foreground">
        Al aprobar un evento se crea en el calendario “Hogar” e invita a:
      </p>
      <ul className="mt-2 space-y-1 text-sm">
        {invitees.map((e) => (
          <li key={e} className="rounded-lg bg-muted px-2.5 py-1.5 font-medium">
            {e}
          </li>
        ))}
      </ul>

      {isLoading ? (
        <div className="mt-3 h-10 animate-pulse rounded-xl bg-muted" />
      ) : gs?.connected ? (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
            <span className="min-w-0">
              Conectado{gs.email ? ` como ${gs.email}` : ""}
              {gs.calendarName ? ` · calendario “${gs.calendarName}”` : ""}
            </span>
          </div>
          <Button variant="outline" className="w-full" onClick={disconnect} disabled={disconnecting}>
            {disconnecting ? "Desconectando…" : "Desconectar"}
          </Button>
        </div>
      ) : gs?.configured ? (
        <Button className="mt-3 w-full" onClick={() => (window.location.href = "/api/google/connect")}>
          Conectar Google Calendar
        </Button>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed px-3 py-2.5 text-xs text-muted-foreground">
          Falta configurar las credenciales de Google Cloud. Sigue los pasos de{" "}
          <span className="font-semibold text-foreground">GCLOUD_SETUP.md</span> y vuelve aquí.
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h2 className="px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function NavRow({
  to,
  icon: Icon,
  label,
  badge,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  badge?: number;
}) {
  return (
    <Link to={to} className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-accent">
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      {badge ? (
        <span className="rounded-full bg-warning/20 px-2 py-0.5 text-xs font-bold text-warning">{badge}</span>
      ) : null}
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
