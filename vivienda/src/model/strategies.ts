// ─────────────────────────────────────────────────────────────────────────────
// strategies.ts — las 6 estrategias, cada una como función pura sobre un path.
//
// DECISIÓN DEL DUEÑO: si compra, vive en corridor (~$70k); si alquila, alquila el
// Solar ($1,400/mes) + invierte. Presupuesto de vivienda común = renta Solar.
//   · B alquila Solar (paga liveRent) => excedente mensual 0.
//   · A compra corridor, vive ahí (paga solo condo+mant) => libera liveRent−costos
//     y lo reinvierte (toggle). Vive peor (corridor) a cambio de patrimonio.
//   · C1 vive en Solar (paga liveRent) y alquila el corridor que compró (bruto imputedRent).
// La comparación honesta es "inmueble + portafolio-lateral" vs "portafolio grande".
// ─────────────────────────────────────────────────────────────────────────────

import type { Assumptions, StrategyId, Weights, YearPoint, YearShock } from "./types";

function portfolioReturn(weights: Weights, shock: YearShock): number {
  let r = 0;
  for (const key of Object.keys(weights) as (keyof Weights)[]) {
    r += weights[key] * shock.assetReturns[key];
  }
  return r;
}

/** Valor honesto del inmueble si lo vendes y sacas el capital del país. */
function reHonest(reValue: number, a: Assumptions): number {
  const localCash = reValue * (1 - a.sellCostPct - a.exitHaircutPct);
  return Math.max(0, localCash) * (1 - a.capitalEgressPct);
}

function priceFromCapital(a: Assumptions): number {
  // Se despliega TODO el capital: precio = capital / (1+costo de compra).
  return a.capital / (1 + a.buyCostPct);
}

/** Renta base contra la que el dueño mide su excedente reinvertible.
 *  Solar => incluye el "downgrade de vivienda"; corridor => aísla la decisión de activo. */
function ownerCounterfactualRent(a: Assumptions): number {
  return a.ownerSurplusVsSolar ? a.liveRentMonthly : a.imputedRentMonthly;
}

// ── A: Comprar-para-vivir ────────────────────────────────────────────────────
export function stratBuyToLive(a: Assumptions, path: YearShock[]): YearPoint[] {
  let reValue = priceFromCapital(a);
  let side = 0; // portafolio lateral del ahorro de renta
  const pts: YearPoint[] = [zeroPoint(a, reValue, 0)];
  for (let y = 0; y < a.horizonYears; y++) {
    const s = path[y];
    reValue *= s.reFactor;
    const maint = a.maintenancePct * reValue;
    const ownerCosts = a.condoMonthly * 12 + maint;
    // Excedente vs el alternativo del dueño (Solar por default; corridor si se aísla el activo).
    const surplus = ownerCounterfactualRent(a) * 12 - ownerCosts;
    if (a.reinvestOwnerSurplus) {
      side = side * (1 + portfolioReturn(a.portfolioWeights, s)) + surplus;
      if (side < 0) side = 0;
    }
    pts.push(makePoint(a, y + 1, reValue, side));
  }
  return pts;
}

// ── Genérico: Alquilar + portafolio (B, D, E) ────────────────────────────────
export function stratRentInvest(a: Assumptions, path: YearShock[], weights: Weights): YearPoint[] {
  let port = a.capital;
  const pts: YearPoint[] = [zeroPoint(a, 0, port)];
  for (let y = 0; y < a.horizonYears; y++) {
    const s = path[y];
    port *= 1 + portfolioReturn(weights, s);
    if (a.payRentFromPortfolio) {
      port -= a.liveRentMonthly * 12; // sequence risk: retiro Solar ($1,400/mes) desde el portafolio
      if (port < 0) port = 0; // ruina
    }
    pts.push(makePoint(a, y + 1, 0, port));
  }
  return pts;
}

// ── C1: Rentvesting (compras corridor, lo alquilas; tú vives en Solar alquilado) ─
export function stratRentvesting(a: Assumptions, path: YearShock[]): YearPoint[] {
  let reValue = priceFromCapital(a);
  let side = 0;
  const pts: YearPoint[] = [zeroPoint(a, reValue, 0)];
  for (let y = 0; y < a.horizonYears; y++) {
    const s = path[y];
    reValue *= s.reFactor;
    const gross = a.imputedRentMonthly * 12;
    let effectiveGross = gross * (1 - a.vacancyPct) * (1 - a.nonPaymentPct);
    if (s.badTenant) effectiveGross = 0; // inquilino que no paga y no puedes sacar (SUNAVI)
    const maint = a.maintenancePct * reValue;
    const netRent = effectiveGross - a.mgmtPctOfRent * gross - a.condoMonthly * 12 - maint;
    // Vives en Solar: pagas liveRent desde INGRESO (simétrico con B), no reduce el lateral.
    // Solo el neto de alquilar el corridor se invierte.
    side = side * (1 + portfolioReturn(a.portfolioWeights, s)) + netRent;
    if (side < 0) side = 0;
    pts.push(makePoint(a, y + 1, reValue, side));
  }
  return pts;
}

// ── C2: Compra diferida (portafolio N años, luego compra) ─────────────────────
export function stratDeferred(a: Assumptions, path: YearShock[]): YearPoint[] {
  const wait = Math.min(a.deferWaitYears, a.horizonYears);
  let port = a.capital;
  let reValue = 0;
  let aptPrice = a.capital; // precio de mercado de la unidad corridor (~$70k), aprecia con el mercado
  const pts: YearPoint[] = [zeroPoint(a, 0, port)];
  for (let y = 0; y < a.horizonYears; y++) {
    const s = path[y];
    if (y < wait) {
      port *= 1 + portfolioReturn(a.portfolioWeights, s);
      aptPrice *= s.reFactor; // el precio del apto también se mueve mientras esperas
      pts.push(makePoint(a, y + 1, 0, port));
    } else if (y === wait) {
      // Comprar: gasta hasta poder pagar apto + costos; resto queda invertido.
      port *= 1 + portfolioReturn(a.portfolioWeights, s);
      aptPrice *= s.reFactor;
      const cashForApt = Math.min(port, aptPrice * (1 + a.buyCostPct));
      reValue = cashForApt / (1 + a.buyCostPct);
      port -= cashForApt;
      pts.push(makePoint(a, y + 1, reValue, port));
    } else {
      // Ya vives en el apto: comportamiento tipo A.
      reValue *= s.reFactor;
      const maint = a.maintenancePct * reValue;
      const surplus = ownerCounterfactualRent(a) * 12 - (a.condoMonthly * 12 + maint);
      port *= 1 + portfolioReturn(a.portfolioWeights, s);
      if (a.reinvestOwnerSurplus) port += surplus;
      if (port < 0) port = 0;
      pts.push(makePoint(a, y + 1, reValue, port));
    }
  }
  return pts;
}

// ── helpers de punto ─────────────────────────────────────────────────────────
function zeroPoint(a: Assumptions, reValue: number, port: number): YearPoint {
  return makePoint(a, 0, reValue, port);
}

function makePoint(a: Assumptions, year: number, reValue: number, port: number): YearPoint {
  const honestRe = reValue > 0 ? reHonest(reValue, a) : 0;
  return {
    year,
    reValue,
    portfolio: port,
    netWorthPaper: reValue + port,
    netWorthHonest: honestRe + port,
    liquidValue: port, // el inmueble NO cuenta como líquido (tarda meses en venderse)
    runwayMonths: port / a.monthlyBurn,
  };
}

// ── registro de estrategias ──────────────────────────────────────────────────
export interface StrategyDef {
  id: StrategyId;
  label: string;
  hasRealEstate: boolean;
  run: (a: Assumptions, path: YearShock[]) => YearPoint[];
}

export function strategyDefs(): StrategyDef[] {
  const allStables: Weights = { BTC: 0, ETH: 0, SPX: 0, GOLD: 0, STABLE: 1 };
  const sixtyForty: Weights = { BTC: 0, ETH: 0, SPX: 0.6, GOLD: 0, STABLE: 0.4 };
  return [
    { id: "A", label: "A · Comprar-para-vivir", hasRealEstate: true, run: stratBuyToLive },
    { id: "B", label: "B · Alquilar + portafolio", hasRealEstate: false, run: (aa, p) => stratRentInvest(aa, p, aa.portfolioWeights) },
    { id: "C1", label: "C1 · Rentvesting", hasRealEstate: true, run: stratRentvesting },
    { id: "C2", label: "C2 · Compra diferida", hasRealEstate: true, run: stratDeferred },
    { id: "D", label: "D · All-stables", hasRealEstate: false, run: (aa, p) => stratRentInvest(aa, p, allStables) },
    { id: "E", label: "E · 60/40 boring", hasRealEstate: false, run: (aa, p) => stratRentInvest(aa, p, sixtyForty) },
  ];
}
