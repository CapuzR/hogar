import { describe, it, expect } from "vitest";
import { mulberry32, normal, choleskyLower, correlatedNormals, percentile, tInnovationFromNormal } from "./random";

describe("RNG determinista", () => {
  it("misma semilla => misma secuencia", () => {
    const r1 = mulberry32(7);
    const r2 = mulberry32(7);
    for (let i = 0; i < 100; i++) expect(r1()).toBe(r2());
  });
});

describe("Cholesky", () => {
  it("L·Lᵀ reconstruye la matriz de correlación", () => {
    const A = [
      [1, 0.85, 0.4],
      [0.85, 1, 0.4],
      [0.4, 0.4, 1],
    ];
    const L = choleskyLower(A);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        let s = 0;
        for (let k = 0; k < 3; k++) s += L[i][k] * L[j][k];
        expect(s).toBeCloseTo(A[i][j], 10);
      }
    }
  });
});

describe("normales correlacionadas", () => {
  it("la correlación muestral se acerca a la objetivo", () => {
    const A = [
      [1, 0.8],
      [0.8, 1],
    ];
    const L = choleskyLower(A);
    const rng = mulberry32(1);
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i < 20000; i++) {
      const z = correlatedNormals(rng, L);
      xs.push(z[0]);
      ys.push(z[1]);
    }
    const mx = xs.reduce((s, x) => s + x, 0) / xs.length;
    const my = ys.reduce((s, x) => s + x, 0) / ys.length;
    let cov = 0;
    let vx = 0;
    let vy = 0;
    for (let i = 0; i < xs.length; i++) {
      cov += (xs[i] - mx) * (ys[i] - my);
      vx += (xs[i] - mx) ** 2;
      vy += (ys[i] - my) ** 2;
    }
    const corr = cov / Math.sqrt(vx * vy);
    expect(corr).toBeGreaterThan(0.75);
    expect(corr).toBeLessThan(0.85);
  });
});

describe("innovación t-Student", () => {
  it("tiene varianza ~1 y colas más gordas que la normal", () => {
    const rng = mulberry32(3);
    const nu = 4;
    const xs: number[] = [];
    for (let i = 0; i < 50000; i++) xs.push(tInnovationFromNormal(rng, normal(rng), nu));
    const m = xs.reduce((s, x) => s + x, 0) / xs.length;
    const varr = xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length;
    expect(varr).toBeGreaterThan(0.8);
    expect(varr).toBeLessThan(1.2);
    // exceso de curtosis > 0 (colas gordas)
    const kurt = xs.reduce((s, x) => s + (x - m) ** 4, 0) / xs.length / varr ** 2;
    expect(kurt).toBeGreaterThan(3.5);
  });
});

describe("percentiles", () => {
  it("interpola correctamente", () => {
    const s = [0, 10, 20, 30, 40];
    expect(percentile(s, 0)).toBe(0);
    expect(percentile(s, 1)).toBe(40);
    expect(percentile(s, 0.5)).toBe(20);
  });
});
