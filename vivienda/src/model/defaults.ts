// ─────────────────────────────────────────────────────────────────────────────
// defaults.ts — construye Assumptions desde assumptions.json (fuente única).
// ─────────────────────────────────────────────────────────────────────────────

import raw from "../../assumptions.json";
import type { Assumptions, AssetKey, AssetParams, Weights } from "./types";

type ValNode = { value: number };
const v = (n: ValNode): number => n.value;

const order = raw.assetOrder as AssetKey[];

function buildAssets(): Record<AssetKey, AssetParams> {
  const out = {} as Record<AssetKey, AssetParams>;
  for (const key of order) {
    const a = (raw.assets as Record<string, { label: string; cagr: number; cagrRange: number[]; vol: number; nu: number }>)[key];
    out[key] = { key, label: a.label, cagr: a.cagr, vol: a.vol, nu: a.nu, cagrLow: a.cagrRange[0], cagrHigh: a.cagrRange[1] };
  }
  return out;
}

export interface PortfolioPreset {
  label: string;
  BTC: number;
  ETH: number;
  SPX: number;
  GOLD: number;
  STABLE: number;
}
const presets = raw.portfolios as Record<string, PortfolioPreset>;

function weightsFrom(name: string): Weights {
  const p = presets[name];
  return { BTC: p.BTC, ETH: p.ETH, SPX: p.SPX, GOLD: p.GOLD, STABLE: p.STABLE };
}

export function defaultAssumptions(): Assumptions {
  const re = raw.realEstate;
  const rent = raw.rental;
  const pol = raw.politicalRisk;
  return {
    capital: v(raw.capital),
    horizonYears: v(raw.horizonYears),
    usdInflation: v(raw.usdInflation),
    riskFreeRate: v(raw.riskFreeRate),

    monthlyIncome: v(raw.household.monthlyIncome),
    monthlyBurn: v(raw.household.monthlyBurn),

    imputedRentMonthly: v(re.imputedRentMonthly),
    liveRentMonthly: v(re.liveRentMonthly),
    appreciation: v(re.appreciationRealUSD),
    appreciationVol: v(re.appreciationVol),
    condoMonthly: v(re.condoMonthly),
    maintenancePct: v(re.maintenancePctPerYear),
    buyCostPct: v(re.buyCostPct),
    sellCostPct: v(re.sellCostPct),
    exitHaircutPct: v(re.exitHaircutPct),
    monthsToSell: v(re.monthsToSell),
    capitalEgressPct: v(re.capitalEgressPct),

    vacancyPct: v(rent.vacancyPct),
    nonPaymentPct: v(rent.nonPaymentPct),
    mgmtPctOfRent: v(rent.mgmtPctOfRent),
    badTenantAnnualProb: v(rent.badTenantAnnualProb),

    politicalAnnualProb: v(pol.annualProb),
    politicalSeverity: v(pol.severityHaircut),

    assets: buildAssets(),
    assetOrder: order,
    corrNormal: raw.correlations.normal,
    corrCrisis: raw.correlations.crisis,
    crisisAnnualProb: v(raw.correlations.crisisAnnualProb),
    portfolioWeights: weightsFrom(raw.defaultPortfolio),

    reinvestOwnerSurplus: raw.toggles.reinvestOwnerSurplus.value,
    payRentFromPortfolio: raw.toggles.payRentFromPortfolio.value,
    useCrisisCorrelation: raw.toggles.useCrisisCorrelation.value,
    ownerSurplusVsSolar: raw.toggles.ownerSurplusVsSolar.value,

    deferWaitYears: v(raw.deferredPurchase.waitYears),

    mcPaths: v(raw.monteCarlo.paths),
    seed: v(raw.monteCarlo.seed),
  };
}

/** Presets de portafolio para la UI. */
export const portfolioPresets = presets;
export const assetLabels: Record<AssetKey, string> = Object.fromEntries(
  order.map((k) => [k, (raw.assets as Record<string, { label: string }>)[k].label]),
) as Record<AssetKey, string>;
