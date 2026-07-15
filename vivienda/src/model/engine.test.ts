import { describe, it, expect } from "vitest";
import { defaultAssumptions } from "./defaults";
import { runDeterministic, breakevenPortfolioCAGR, scenarioVariant } from "./engine";
import type { Assumptions, AssetKey } from "./types";

function zeroReturns(a: Assumptions): Assumptions {
  const assets = {} as Assumptions["assets"];
  for (const k of a.assetOrder as AssetKey[]) assets[k] = { ...a.assets[k], cagr: 0, vol: 0 };
  return { ...a, assets, appreciation: 0, appreciationVol: 0 };
}

function noCosts(a: Assumptions): Assumptions {
  return {
    ...a,
    buyCostPct: 0,
    sellCostPct: 0,
    exitHaircutPct: 0,
    capitalEgressPct: 0,
    condoMonthly: 0,
    maintenancePct: 0,
    vacancyPct: 0,
    nonPaymentPct: 0,
    mgmtPctOfRent: 0,
    badTenantAnnualProb: 0,
    politicalAnnualProb: 0,
  };
}

describe("SANITY 1 — retornos 0% y sin costos: comprar gana exactamente por el alquiler ahorrado", () => {
  it("A supera a B por liveRent × 12 × horizonte", () => {
    const a = noCosts(zeroReturns(defaultAssumptions()));
    // reinvertir excedente del dueño está ON por default
    expect(a.reinvestOwnerSurplus).toBe(true);
    const res = runDeterministic(a);
    const A = res.find((r) => r.id === "A")!;
    const B = res.find((r) => r.id === "B")!;

    const rentSaved = a.liveRentMonthly * 12 * a.horizonYears;
    expect(A.terminalHonest - B.terminalHonest).toBeCloseTo(rentSaved, 4);
    // B (portafolio a 0%) conserva exactamente el capital
    expect(B.terminalHonest).toBeCloseTo(a.capital, 6);
  });
});

describe("SANITY 2 — apreciación 0% y portafolio 0%: el break-even es el yield neto", () => {
  it("breakevenPortfolioCAGR == yield neto (rent-saved) a 1 año", () => {
    let a = zeroReturns(defaultAssumptions());
    // sin costos de transacción para aislar el yield; conservamos condo+mant (definen el neto)
    a = { ...a, buyCostPct: 0, sellCostPct: 0, exitHaircutPct: 0, capitalEgressPct: 0, horizonYears: 1, politicalAnnualProb: 0 };

    const maint = a.maintenancePct * a.capital; // reValue == capital (buyCost 0, appr 0)
    const netAnnual = a.liveRentMonthly * 12 - a.condoMonthly * 12 - maint;
    const netYield = netAnnual / a.capital;

    expect(breakevenPortfolioCAGR(a)).toBeCloseTo(netYield, 8);
  });
});

describe("consistencia de escenarios", () => {
  it("bear <= base <= bull en terminal de B (portafolio)", () => {
    const a = defaultAssumptions();
    const bear = runDeterministic(scenarioVariant(a, "bear")).find((r) => r.id === "B")!;
    const base = runDeterministic(scenarioVariant(a, "base")).find((r) => r.id === "B")!;
    const bull = runDeterministic(scenarioVariant(a, "bull")).find((r) => r.id === "B")!;
    expect(bear.terminalHonest).toBeLessThanOrEqual(base.terminalHonest + 1e-6);
    expect(base.terminalHonest).toBeLessThanOrEqual(bull.terminalHonest + 1e-6);
  });
});

describe("mecánica del inmueble", () => {
  it("el terminal honesto de A aplica venta+haircut+egreso sobre el inmueble", () => {
    const a = { ...defaultAssumptions(), reinvestOwnerSurplus: false, appreciation: 0 };
    const A = runDeterministic(a).find((r) => r.id === "A")!;
    // sin reinversión, terminal honesto = valor inmueble neto de fricciones
    const price = a.capital / (1 + a.buyCostPct);
    const honest = price * (1 - a.sellCostPct - a.exitHaircutPct) * (1 - a.capitalEgressPct);
    expect(A.terminalHonest).toBeCloseTo(honest, 4);
    // el paper (mercado) es mayor que el honesto (por la fricción de salida)
    expect(A.terminalPaper).toBeGreaterThan(A.terminalHonest);
  });
});
