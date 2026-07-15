// ─────────────────────────────────────────────────────────────────────────────
// metrics.ts — métricas derivadas de una trayectoria de patrimonio.
// ─────────────────────────────────────────────────────────────────────────────

import type { Assumptions, StrategyResult, YearPoint } from "./types";
import type { StrategyDef } from "./strategies";

function annualized(from: number, to: number, years: number): number {
  if (from <= 0 || years <= 0) return 0;
  if (to <= 0) return -1;
  return Math.pow(to / from, 1 / years) - 1;
}

/** Max drawdown (pico-a-valle) sobre una serie de valores. Devuelve fracción negativa. */
export function maxDrawdown(series: number[]): number {
  let peak = -Infinity;
  let mdd = 0;
  for (const v of series) {
    if (v > peak) peak = v;
    if (peak > 0) {
      const dd = v / peak - 1;
      if (dd < mdd) mdd = dd;
    }
  }
  return mdd;
}

/** Años bajo el agua más largos (desde un pico hasta recuperar ese pico). */
export function recoveryYears(points: YearPoint[], key: (p: YearPoint) => number): number {
  let peak = -Infinity;
  let peakYear = 0;
  let worst = 0;
  for (const p of points) {
    const v = key(p);
    if (v >= peak) {
      peak = v;
      peakYear = p.year;
    } else {
      const underwater = p.year - peakYear;
      if (underwater > worst) worst = underwater;
    }
  }
  return worst;
}

export function buildStrategyResult(
  def: StrategyDef,
  trajectory: YearPoint[],
  a: Assumptions,
): StrategyResult {
  const last = trajectory[trajectory.length - 1];
  const T = a.horizonYears;
  const terminalPaper = last.netWorthPaper;
  const terminalHonest = last.netWorthHonest;
  const irr = annualized(a.capital, terminalHonest, T);
  const paperIrr = annualized(a.capital, terminalPaper, T);
  const paperSeries = trajectory.map((p) => p.netWorthPaper);
  const ruin = trajectory.some((p) => p.portfolio <= 0 && !def.hasRealEstate);

  return {
    id: def.id,
    label: def.label,
    trajectory,
    terminalPaper,
    terminalHonest,
    irr,
    paperIrr,
    liquidityAdjustedReturn: irr, // el terminal honesto ya penaliza venta+haircut+egreso+jump
    maxDrawdown: maxDrawdown(paperSeries),
    recoveryYears: recoveryYears(trajectory, (p) => p.netWorthPaper),
    ruin,
    hasRealEstate: def.hasRealEstate,
  };
}
