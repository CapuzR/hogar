// ─────────────────────────────────────────────────────────────────────────────
// types.ts — contratos del motor financiero. SIN React, SIN UI.
// ─────────────────────────────────────────────────────────────────────────────

export type AssetKey = "BTC" | "ETH" | "SPX" | "GOLD" | "STABLE";

export interface AssetParams {
  key: AssetKey;
  label: string;
  /** CAGR = crecimiento MEDIANO (geométrico) esperado. La media aritmética es mayor por el sesgo derecho. */
  cagr: number;
  /** Volatilidad anual (desv. estándar de retornos log). */
  vol: number;
  /** Grados de libertad t-Student (colas gordas). ~3-4 cripto, ~6 acciones/oro, >=25 ≈ normal. */
  nu: number;
  /** CAGR en escenario bear (para runs deterministas de escenarios). */
  cagrLow: number;
  /** CAGR en escenario bull. */
  cagrHigh: number;
}

export type Weights = Record<AssetKey, number>;

export interface Assumptions {
  capital: number;
  horizonYears: number;
  usdInflation: number;
  riskFreeRate: number;

  monthlyIncome: number;
  monthlyBurn: number;

  // Inmueble
  imputedRentMonthly: number; // renta de la unidad corridor (la que compras / alquilas en rentvesting)
  liveRentMonthly: number; // renta del Solar donde realmente quieres vivir (lo que paga B)
  appreciation: number; // apreciación real USD (base 0)
  appreciationVol: number;
  condoMonthly: number;
  maintenancePct: number; // %/año sobre valor de mercado
  buyCostPct: number;
  sellCostPct: number;
  exitHaircutPct: number;
  monthsToSell: number;
  capitalEgressPct: number;

  // Arrendamiento (rentvesting)
  vacancyPct: number;
  nonPaymentPct: number;
  mgmtPctOfRent: number;
  badTenantAnnualProb: number;

  // Riesgo político (jump)
  politicalAnnualProb: number;
  politicalSeverity: number;

  // Activos + portafolio
  assets: Record<AssetKey, AssetParams>;
  assetOrder: AssetKey[];
  corrNormal: number[][];
  corrCrisis: number[][];
  crisisAnnualProb: number;
  portfolioWeights: Weights;

  // Toggles
  reinvestOwnerSurplus: boolean;
  payRentFromPortfolio: boolean;
  useCrisisCorrelation: boolean;
  /** true: excedente del dueño vs renta Solar (decisión real, incluye downgrade de vivienda).
   *  false: vs renta corridor (aísla la decisión de ACTIVO puro, misma vivienda). */
  ownerSurplusVsSolar: boolean;

  // Compra diferida
  deferWaitYears: number;

  // Monte Carlo
  mcPaths: number;
  seed: number;
}

/** Choque de mercado de un año, compartido por todas las estrategias en un mismo path. */
export interface YearShock {
  assetReturns: Record<AssetKey, number>; // retornos simples del año
  reFactor: number; // factor multiplicativo del inmueble (apreciación+vol+jump)
  politicalJump: boolean;
  badTenant: boolean;
}

export interface YearPoint {
  year: number;
  reValue: number; // valor de mercado del inmueble (0 si no aplica)
  portfolio: number; // valor líquido del portafolio
  netWorthPaper: number; // reValue (mercado) + portfolio
  netWorthHonest: number; // inmueble neto de venta+haircut+egreso + portfolio
  liquidValue: number; // parte líquida disponible ya (portfolio)
  runwayMonths: number; // liquidValue / burn mensual
}

export interface StrategyResult {
  id: StrategyId;
  label: string;
  trajectory: YearPoint[];
  terminalPaper: number;
  terminalHonest: number;
  /** IRR = retorno anualizado del patrimonio (honesto). */
  irr: number;
  paperIrr: number;
  liquidityAdjustedReturn: number; // = irr honesto (ya penaliza iliquidez/egreso)
  maxDrawdown: number;
  recoveryYears: number;
  ruin: boolean; // solo relevante si payRentFromPortfolio
  hasRealEstate: boolean;
}

export type StrategyId = "A" | "B" | "C1" | "C2" | "D" | "E";

export interface DeterministicRun {
  scenario: "bear" | "base" | "bull";
  strategies: StrategyResult[];
}

export interface McStrategyStats {
  id: StrategyId;
  label: string;
  terminalPercentiles: { p5: number; p25: number; p50: number; p75: number; p95: number; mean: number };
  fan: { year: number; p5: number; p25: number; p50: number; p75: number; p95: number }[];
  probBeatsA: number; // P(terminal honesto > A)
  probLossOver50: number; // P(terminal < 50% del capital)
  probRuin: number;
  medianMaxDrawdown: number;
  medianRunwayAtHorizon: number;
}

export interface MonteCarloResult {
  paths: number;
  horizonYears: number;
  stats: McStrategyStats[];
  // P(B > A) headline
  probB_beats_A: number;
}
