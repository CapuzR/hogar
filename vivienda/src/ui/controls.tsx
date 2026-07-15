import type { ReactNode } from "react";
import { pct, usd } from "./format";

export function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">{title}</h3>
      {subtitle && <p className="text-xs text-muted mb-3 mt-0.5">{subtitle}</p>}
      <div className={subtitle ? "" : "mt-3"}>{children}</div>
    </section>
  );
}

const confColor: Record<string, string> = {
  alto: "text-emerald-400",
  medio: "text-amber-400",
  adivinado: "text-rose-400",
};

export function Slider(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  confidence?: "alto" | "medio" | "adivinado";
  hint?: string;
}) {
  const { label, value, min, max, step, onChange, format, confidence, hint } = props;
  const fmt = format ?? ((v: number) => String(v));
  return (
    <div className="mb-3">
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-xs text-slate-300">
          {label}
          {confidence && <span className={"ml-1.5 text-[10px] " + confColor[confidence]}>· {confidence}</span>}
        </label>
        <span className="text-xs font-mono text-slate-100 tabular-nums">{fmt(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step ?? (max - min) / 100}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="mt-1.5"
      />
      {hint && <p className="text-[10px] text-muted mt-0.5">{hint}</p>}
    </div>
  );
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <div className="mb-3">
      <button
        onClick={() => onChange(!checked)}
        className="flex items-center gap-2.5 w-full text-left"
      >
        <span
          className={
            "relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors " +
            (checked ? "bg-accent" : "bg-line")
          }
        >
          <span
            className={
              "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform " +
              (checked ? "translate-x-4" : "translate-x-0.5")
            }
          />
        </span>
        <span className="text-xs text-slate-300">{label}</span>
      </button>
      {hint && <p className="text-[10px] text-muted mt-0.5 ml-11">{hint}</p>}
    </div>
  );
}

export function StatCard({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "buy" | "rent" | "warn" | "neutral" }) {
  const border =
    tone === "buy" ? "border-buy/40" : tone === "rent" ? "border-rent/40" : tone === "warn" ? "border-warn/40" : "border-line";
  return (
    <div className={"rounded-lg border bg-panel px-3.5 py-3 " + border}>
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
      <div className="text-lg font-semibold text-slate-100 mt-0.5 tabular-nums">{value}</div>
      {sub && <div className="text-[10px] text-muted mt-0.5">{sub}</div>}
    </div>
  );
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "buy" | "rent" | "warn" | "neutral" | "ok" }) {
  const map: Record<string, string> = {
    buy: "bg-buy/15 text-buy border-buy/30",
    rent: "bg-rent/15 text-rent border-rent/30",
    warn: "bg-warn/15 text-warn border-warn/30",
    ok: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    neutral: "bg-line/40 text-slate-300 border-line",
  };
  return <span className={"inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium " + map[tone]}>{children}</span>;
}

export const money = usd;
export const percent = pct;
