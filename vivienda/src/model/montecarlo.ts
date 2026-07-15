// ─────────────────────────────────────────────────────────────────────────────
// montecarlo.ts — 10,000 paths con retornos correlacionados y colas gordas.
// Todas las estrategias ven el MISMO path (comparación justa de P(B>A)).
// ─────────────────────────────────────────────────────────────────────────────

import type { Assumptions, McStrategyStats, MonteCarloResult, StrategyId } from "./types";
import { strategyDefs } from "./strategies";
import { drawPath, prepareCholesky } from "./paths";
import { maxDrawdown } from "./metrics";
import { mulberry32, percentile, mean } from "./random";

interface Accum {
  id: StrategyId;
  label: string;
  hasRealEstate: boolean;
  terminalHonest: number[];
  fanByYear: number[][]; // [year][path] de patrimonio honesto
  maxDD: number[];
  runwayAtHorizon: number[];
  ruinCount: number;
}

export function runMonteCarlo(a: Assumptions, seedOverride?: number): MonteCarloResult {
  const defs = strategyDefs();
  const gen = prepareCholesky(a);
  const rng = mulberry32(seedOverride ?? a.seed);
  const years = a.horizonYears;

  const acc: Accum[] = defs.map((d) => ({
    id: d.id,
    label: d.label,
    hasRealEstate: d.hasRealEstate,
    terminalHonest: [],
    fanByYear: Array.from({ length: years + 1 }, () => [] as number[]),
    maxDD: [],
    runwayAtHorizon: [],
    ruinCount: 0,
  }));

  for (let p = 0; p < a.mcPaths; p++) {
    const path = drawPath(a, rng, gen);
    for (let si = 0; si < defs.length; si++) {
      const traj = defs[si].run(a, path);
      const last = traj[traj.length - 1];
      acc[si].terminalHonest.push(last.netWorthHonest);
      for (let y = 0; y <= years; y++) acc[si].fanByYear[y].push(traj[y].netWorthHonest);
      acc[si].maxDD.push(maxDrawdown(traj.map((t) => t.netWorthPaper)));
      acc[si].runwayAtHorizon.push(last.runwayMonths);
      if (!defs[si].hasRealEstate && traj.some((t) => t.portfolio <= 0)) acc[si].ruinCount++;
    }
  }

  // Referencia A para P(B>A) y comparaciones.
  const aIdx = acc.findIndex((x) => x.id === "A");
  const aTerminals = acc[aIdx].terminalHonest;

  const stats: McStrategyStats[] = acc.map((x) => {
    const sorted = [...x.terminalHonest].sort((m, n) => m - n);
    const beatsA =
      x.id === "A"
        ? 0
        : x.terminalHonest.reduce((c, val, i) => c + (val > aTerminals[i] ? 1 : 0), 0) / a.mcPaths;
    const lossOver50 = x.terminalHonest.reduce((c, val) => c + (val < 0.5 * a.capital ? 1 : 0), 0) / a.mcPaths;
    const fan = x.fanByYear.map((arr, year) => {
      const s = [...arr].sort((m, n) => m - n);
      return {
        year,
        p5: percentile(s, 0.05),
        p25: percentile(s, 0.25),
        p50: percentile(s, 0.5),
        p75: percentile(s, 0.75),
        p95: percentile(s, 0.95),
      };
    });
    const mddSorted = [...x.maxDD].sort((m, n) => m - n);
    const runwaySorted = [...x.runwayAtHorizon].sort((m, n) => m - n);
    return {
      id: x.id,
      label: x.label,
      terminalPercentiles: {
        p5: percentile(sorted, 0.05),
        p25: percentile(sorted, 0.25),
        p50: percentile(sorted, 0.5),
        p75: percentile(sorted, 0.75),
        p95: percentile(sorted, 0.95),
        mean: mean(x.terminalHonest),
      },
      fan,
      probBeatsA: beatsA,
      probLossOver50: lossOver50,
      probRuin: x.ruinCount / a.mcPaths,
      medianMaxDrawdown: percentile(mddSorted, 0.5),
      medianRunwayAtHorizon: percentile(runwaySorted, 0.5),
    };
  });

  const bStats = stats.find((s) => s.id === "B");
  return {
    paths: a.mcPaths,
    horizonYears: years,
    stats,
    probB_beats_A: bStats?.probBeatsA ?? 0,
  };
}
