// ─────────────────────────────────────────────────────────────────────────────
// paths.ts — generación de choques de mercado (un "path" = horizonte de años).
// Retornos log con innovaciones t-Student correlacionadas + apreciación inmueble
// con su propia vol + jump político de Poisson + evento de mal inquilino.
// ─────────────────────────────────────────────────────────────────────────────

import type { Assumptions, AssetKey, YearShock } from "./types";
import {
  choleskyLower,
  correlatedNormals,
  normal,
  tInnovationFromNormal,
  type Rng,
} from "./random";

export interface PathGen {
  normalL: number[][];
  crisisL: number[][];
}

export function prepareCholesky(a: Assumptions): PathGen {
  return {
    normalL: choleskyLower(a.corrNormal),
    crisisL: choleskyLower(a.corrCrisis),
  };
}

/**
 * Genera los choques de UN año.
 * logReturn_i = ln(1+cagr_i) + vol_i * x_i,  x_i = innovación t estandarizada.
 * Con vol=0 => retorno simple = cagr exacto (converge al determinista).
 */
export function drawYearShock(a: Assumptions, rng: Rng, gen: PathGen): YearShock {
  const order = a.assetOrder;
  const inCrisis = a.useCrisisCorrelation && rng() < a.crisisAnnualProb;
  const L = inCrisis ? gen.crisisL : gen.normalL;
  const z = correlatedNormals(rng, L);

  const assetReturns = {} as Record<AssetKey, number>;
  for (let i = 0; i < order.length; i++) {
    const key = order[i];
    const p = a.assets[key];
    const x = tInnovationFromNormal(rng, z[i], p.nu);
    const logRet = Math.log(1 + p.cagr) + p.vol * x;
    assetReturns[key] = Math.exp(logRet) - 1;
  }

  // Inmueble: apreciación propia (idiosincrática, corr baja con activos => se modela aparte)
  const reZ = normal(rng);
  let reLog = Math.log(1 + a.appreciation) + a.appreciationVol * reZ;

  // Jump político (Poisson ~ Bernoulli anual): haircut de severidad s.
  const politicalJump = rng() < a.politicalAnnualProb;
  if (politicalJump) reLog += Math.log(1 - a.politicalSeverity);
  const reFactor = Math.exp(reLog);

  // Evento de inquilino no-pagador (solo afecta rentvesting).
  const badTenant = rng() < a.badTenantAnnualProb;

  return { assetReturns, reFactor, politicalJump, badTenant };
}

export function drawPath(a: Assumptions, rng: Rng, gen: PathGen): YearShock[] {
  const shocks: YearShock[] = [];
  for (let y = 0; y < a.horizonYears; y++) shocks.push(drawYearShock(a, rng, gen));
  return shocks;
}

/** Path DETERMINISTA: vol y jumps a cero => cada año rinde exactamente el CAGR / apreciación. */
export function deterministicPath(a: Assumptions): YearShock[] {
  const shocks: YearShock[] = [];
  for (let y = 0; y < a.horizonYears; y++) {
    const assetReturns = {} as Record<AssetKey, number>;
    for (const key of a.assetOrder) assetReturns[key] = a.assets[key].cagr;
    shocks.push({
      assetReturns,
      reFactor: 1 + a.appreciation,
      politicalJump: false,
      badTenant: false,
    });
  }
  return shocks;
}
