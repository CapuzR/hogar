// ─────────────────────────────────────────────────────────────────────────────
// random.ts — RNG determinista y muestreo estadístico.
// Semilla fija => resultados reproducibles (requisito del usuario).
// ─────────────────────────────────────────────────────────────────────────────

export type Rng = () => number;

/** mulberry32: PRNG rápido y determinista en [0,1). */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Normal estándar por Box-Muller. */
export function normal(rng: Rng): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/** Chi-cuadrado con k grados (k entero): suma de k normales al cuadrado. */
export function chiSquare(rng: Rng, k: number): number {
  let s = 0;
  const n = Math.max(1, Math.round(k));
  for (let i = 0; i < n; i++) {
    const z = normal(rng);
    s += z * z;
  }
  return s;
}

/**
 * Descomposición de Cholesky (triangular inferior L con L·Lᵀ = A).
 * Añade jitter mínimo si A no es estrictamente definida positiva.
 */
export function choleskyLower(A: number[][]): number[][] {
  const n = A.length;
  const L: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = A[i][j];
      for (let k = 0; k < j; k++) sum -= L[i][k] * L[j][k];
      if (i === j) {
        if (sum <= 0) sum = 1e-9; // jitter: matriz casi-singular
        L[i][j] = Math.sqrt(sum);
      } else {
        L[i][j] = sum / L[j][j];
      }
    }
  }
  return L;
}

/** Vector de normales correlacionadas: z = L · e, con e iid N(0,1). Marginales N(0,1). */
export function correlatedNormals(rng: Rng, L: number[][]): number[] {
  const n = L.length;
  const e = new Array(n);
  for (let i = 0; i < n; i++) e[i] = normal(rng);
  const z = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let k = 0; k <= i; k++) s += L[i][k] * e[k];
    z[i] = s;
  }
  return z;
}

/**
 * Innovación t-Student estandarizada (varianza unitaria) a partir de un normal z.
 * Mezcla normal-varianza: t_nu = z / sqrt(W/nu), W~chi2(nu); estandariza *sqrt((nu-2)/nu).
 * nu >= 25 se trata como normal (colas irrelevantes).
 * Nota: la mezcla independiente por activo atenúa levemente la correlación cruzada —
 * es una aproximación consciente (copula gaussiana + marginales t habría sido más pesada).
 */
export function tInnovationFromNormal(rng: Rng, z: number, nu: number): number {
  if (nu >= 25 || nu <= 2) return z; // normal (o nu<=2 sin varianza finita: degradar a normal)
  const w = chiSquare(rng, nu);
  const t = z / Math.sqrt(w / nu);
  return t * Math.sqrt((nu - 2) / nu); // varianza unitaria
}

/** Percentil (interpolación lineal) sobre un array ya ordenable. */
export function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return NaN;
  if (sortedAsc.length === 1) return sortedAsc[0];
  const idx = (sortedAsc.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedAsc[lo];
  return sortedAsc[lo] + (sortedAsc[hi] - sortedAsc[lo]) * (idx - lo);
}

export function mean(xs: number[]): number {
  if (xs.length === 0) return NaN;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}
