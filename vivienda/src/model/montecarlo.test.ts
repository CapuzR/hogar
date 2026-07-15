import { describe, it, expect } from "vitest";
import { defaultAssumptions } from "./defaults";
import { runDeterministic } from "./engine";
import { runMonteCarlo } from "./montecarlo";
import type { Assumptions, AssetKey } from "./types";

function zeroVol(a: Assumptions): Assumptions {
  const assets = {} as Assumptions["assets"];
  for (const k of a.assetOrder as AssetKey[]) assets[k] = { ...a.assets[k], vol: 0 };
  return {
    ...a,
    assets,
    appreciationVol: 0,
    politicalAnnualProb: 0,
    badTenantAnnualProb: 0,
    useCrisisCorrelation: false,
    mcPaths: 300,
  };
}

describe("SANITY 3 — Monte Carlo con vol 0 converge al determinista", () => {
  it("mediana MC == terminal determinista para cada estrategia", () => {
    const a = zeroVol(defaultAssumptions());
    const det = runDeterministic(a);
    const mc = runMonteCarlo(a);
    for (const d of det) {
      const s = mc.stats.find((x) => x.id === d.id)!;
      // sin vol ni jumps todos los paths son idénticos => mediana == mean == determinista
      const rel = Math.abs(s.terminalPercentiles.p50 - d.terminalHonest) / Math.max(1, Math.abs(d.terminalHonest));
      expect(rel).toBeLessThan(1e-6);
      expect(s.terminalPercentiles.p5).toBeCloseTo(s.terminalPercentiles.p95, 3);
    }
  });
});

describe("Monte Carlo — propiedades básicas", () => {
  it("reproducible con la misma semilla, distinto con otra", () => {
    const a = defaultAssumptions();
    const r1 = runMonteCarlo(a, 123);
    const r2 = runMonteCarlo(a, 123);
    const r3 = runMonteCarlo(a, 999);
    const b1 = r1.stats.find((s) => s.id === "B")!.terminalPercentiles.p50;
    const b2 = r2.stats.find((s) => s.id === "B")!.terminalPercentiles.p50;
    const b3 = r3.stats.find((s) => s.id === "B")!.terminalPercentiles.p50;
    expect(b1).toBe(b2);
    expect(b1).not.toBe(b3);
  });

  it("percentiles ordenados y P(B>A) en [0,1]", () => {
    const a = { ...defaultAssumptions(), mcPaths: 2000 };
    const mc = runMonteCarlo(a);
    for (const s of mc.stats) {
      const p = s.terminalPercentiles;
      expect(p.p5).toBeLessThanOrEqual(p.p25);
      expect(p.p25).toBeLessThanOrEqual(p.p50);
      expect(p.p50).toBeLessThanOrEqual(p.p75);
      expect(p.p75).toBeLessThanOrEqual(p.p95);
      expect(s.probBeatsA).toBeGreaterThanOrEqual(0);
      expect(s.probBeatsA).toBeLessThanOrEqual(1);
    }
    expect(mc.probB_beats_A).toBeGreaterThanOrEqual(0);
    expect(mc.probB_beats_A).toBeLessThanOrEqual(1);
  });

  it("el portafolio pro-riesgo (65% cripto) tiene colas gordas: p5 muy por debajo del capital", () => {
    const a = { ...defaultAssumptions(), mcPaths: 4000, horizonYears: 10 };
    const mc = runMonteCarlo(a);
    const B = mc.stats.find((s) => s.id === "B")!;
    // downside real: el percentil 5 debe quedar por debajo del capital inicial
    expect(B.terminalPercentiles.p5).toBeLessThan(a.capital);
    // upside: el p95 debe superar ampliamente el capital
    expect(B.terminalPercentiles.p95).toBeGreaterThan(a.capital);
  });
});

describe("sequence risk — pagar renta Solar desde el portafolio induce ruina", () => {
  it("payRentFromPortfolio dispara probabilidad de ruina > 0 en B", () => {
    const a = { ...defaultAssumptions(), payRentFromPortfolio: true, mcPaths: 2000, horizonYears: 20 };
    const mc = runMonteCarlo(a);
    const B = mc.stats.find((s) => s.id === "B")!;
    // $1,400/mes sobre $70k ≈ 24% de retiro anual => ruina frecuente
    expect(B.probRuin).toBeGreaterThan(0);
  });
});
