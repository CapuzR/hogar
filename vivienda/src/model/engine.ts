// ─────────────────────────────────────────────────────────────────────────────
// engine.ts — orquestación: runs deterministas, escenarios y sensibilidad.
// ─────────────────────────────────────────────────────────────────────────────

import type { Assumptions, AssetKey, DeterministicRun, StrategyResult } from "./types";
import { strategyDefs } from "./strategies";
import { buildStrategyResult } from "./metrics";
import { deterministicPath } from "./paths";

export function runDeterministic(a: Assumptions): StrategyResult[] {
  const path = deterministicPath(a);
  return strategyDefs().map((d) => buildStrategyResult(d, d.run(a, path), a));
}

/** Deriva una copia de Assumptions para escenario bear/base/bull. */
export function scenarioVariant(a: Assumptions, scenario: "bear" | "base" | "bull"): Assumptions {
  if (scenario === "base") return a;
  const assets = {} as Assumptions["assets"];
  for (const key of a.assetOrder) {
    const p = a.assets[key];
    assets[key] = { ...p, cagr: scenario === "bear" ? p.cagrLow : p.cagrHigh };
  }
  const appreciation = scenario === "bear" ? -0.02 : 0.04;
  // En bear castigamos también la salida y subimos el riesgo de no-pago/vacancia.
  const overrides =
    scenario === "bear"
      ? { exitHaircutPct: Math.min(0.25, a.exitHaircutPct + 0.08), vacancyPct: Math.min(0.4, a.vacancyPct + 0.08), badTenantAnnualProb: Math.min(0.4, a.badTenantAnnualProb + 0.07) }
      : {};
  return { ...a, assets, appreciation, ...overrides };
}

export function runScenarios(a: Assumptions): DeterministicRun[] {
  return (["bear", "base", "bull"] as const).map((scenario) => ({
    scenario,
    strategies: runDeterministic(scenarioVariant(a, scenario)),
  }));
}

// ── Sensibilidad ─────────────────────────────────────────────────────────────

/** Terminal honesto de A (comprar) en modo determinista. */
function terminalHonestOf(a: Assumptions, id: "A" | "B"): number {
  const res = runDeterministic(a).find((r) => r.id === id)!;
  return res.terminalHonest;
}

/** CAGR de portafolio que necesita B para EMPATAR a A. B compone capital a g => g = A.irr honesto. */
export function breakevenPortfolioCAGR(a: Assumptions): number {
  const aRes = runDeterministic(a).find((r) => r.id === "A")!;
  return aRes.irr; // (terminalHonest_A / capital)^(1/T) - 1
}

/** Apreciación inmueble que necesita A para EMPATAR a B (portafolio default). Bisección. */
export function breakevenAppreciation(a: Assumptions): number {
  const targetB = terminalHonestOf(a, "B");
  let lo = -0.15;
  let hi = 0.25;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const aTerminal = terminalHonestOf({ ...a, appreciation: mid }, "A");
    if (aTerminal < targetB) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Compone el capital a un CAGR de portafolio uniforme g (modo B puro). */
function bTerminalAtCAGR(a: Assumptions, g: number): number {
  const base = a.capital * Math.pow(1 + g, a.horizonYears);
  if (!a.payRentFromPortfolio) return base;
  // aproximación con retiro anual de renta Solar
  let port = a.capital;
  for (let y = 0; y < a.horizonYears; y++) {
    port = port * (1 + g) - a.liveRentMonthly * 12;
    if (port < 0) port = 0;
  }
  return port;
}

/** Heatmap: apreciación inmueble (filas) × CAGR portafolio (cols) → 'A' | 'B'. */
export interface HeatmapCell {
  appreciation: number;
  portfolioCAGR: number;
  winner: "A" | "B";
  gap: number; // A_honest - B_honest
}

export function winnerHeatmap(
  a: Assumptions,
  apprRange: number[],
  cagrRange: number[],
): HeatmapCell[] {
  const cells: HeatmapCell[] = [];
  for (const appr of apprRange) {
    const aTerminal = terminalHonestOf({ ...a, appreciation: appr }, "A");
    for (const g of cagrRange) {
      const bTerminal = bTerminalAtCAGR(a, g);
      const gap = aTerminal - bTerminal;
      cells.push({ appreciation: appr, portfolioCAGR: g, winner: gap >= 0 ? "A" : "B", gap });
    }
  }
  return cells;
}

/** Tornado: cuánto mueve cada variable la brecha (B − A) al ir a su extremo bajo/alto. */
export interface TornadoBar {
  param: string;
  low: number; // brecha (B_honest - A_honest) en extremo bajo
  high: number;
  swing: number; // |high - low|
}

export function tornado(a: Assumptions): TornadoBar[] {
  const gap = (aa: Assumptions): number => {
    const rs = runDeterministic(aa);
    const A = rs.find((r) => r.id === "A")!.terminalHonest;
    const B = rs.find((r) => r.id === "B")!.terminalHonest;
    return B - A;
  };
  const scaleAssets = (aa: Assumptions, f: (c: number) => number): Assumptions => {
    const assets = {} as Assumptions["assets"];
    for (const k of aa.assetOrder) assets[k] = { ...aa.assets[k], cagr: f(aa.assets[k].cagr) };
    return { ...aa, assets };
  };
  const swings: { param: string; low: Assumptions; high: Assumptions }[] = [
    { param: "Apreciación inmueble", low: { ...a, appreciation: -0.02 }, high: { ...a, appreciation: 0.04 } },
    { param: "CAGR portafolio (±3pp)", low: scaleAssets(a, (c) => c - 0.03), high: scaleAssets(a, (c) => c + 0.03) },
    { param: "Exit haircut", low: { ...a, exitHaircutPct: 0.03 }, high: { ...a, exitHaircutPct: 0.2 } },
    { param: "Costo compra", low: { ...a, buyCostPct: 0.03 }, high: { ...a, buyCostPct: 0.1 } },
    { param: "Egreso de capital", low: { ...a, capitalEgressPct: 0.0 }, high: { ...a, capitalEgressPct: 0.1 } },
    { param: "Prob. evento político", low: { ...a, politicalAnnualProb: 0.0 }, high: { ...a, politicalAnnualProb: 0.03 } },
    { param: "Condominio", low: { ...a, condoMonthly: 20 }, high: { ...a, condoMonthly: 200 } },
    { param: "Renta Solar (liveRent)", low: { ...a, liveRentMonthly: 900 }, high: { ...a, liveRentMonthly: 2000 } },
    { param: "Horizonte 5↔20a", low: { ...a, horizonYears: 5 }, high: { ...a, horizonYears: 20 } },
  ];
  const bars = swings.map((s) => {
    const low = gap(s.low);
    const high = gap(s.high);
    return { param: s.param, low, high, swing: Math.abs(high - low) };
  });
  return bars.sort((m, n) => n.swing - m.swing);
}

/** Utilidad para la UI: normaliza pesos a suma 1. */
export function normalizeWeights(w: Record<AssetKey, number>): Record<AssetKey, number> {
  const sum = Object.values(w).reduce((s, x) => s + x, 0) || 1;
  const out = {} as Record<AssetKey, number>;
  for (const k of Object.keys(w) as AssetKey[]) out[k] = w[k] / sum;
  return out;
}
