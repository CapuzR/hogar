export const usd = (n: number): string => {
  const sign = n < 0 ? "-" : "";
  return sign + "$" + Math.abs(Math.round(n)).toLocaleString("en-US");
};

export const usdCompact = (n: number): string => {
  const a = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (a >= 1e6) return sign + "$" + (a / 1e6).toFixed(a >= 1e7 ? 0 : 1) + "M";
  if (a >= 1e3) return sign + "$" + (a / 1e3).toFixed(0) + "k";
  return sign + "$" + Math.round(a);
};

export const pct = (n: number, digits = 1): string => (n * 100).toFixed(digits) + "%";

export const STRAT_COLORS: Record<string, string> = {
  A: "#e0a458", // comprar — ocre
  B: "#4c9f70", // portafolio — verde
  C1: "#b57edc", // rentvesting — lila
  C2: "#5b8def", // diferida — azul
  D: "#8b949e", // stables — gris
  E: "#d1a3ff", // 60/40 — violeta claro
};

export const ASSET_COLORS: Record<string, string> = {
  BTC: "#f7931a",
  ETH: "#8a92b2",
  SPX: "#4c9f70",
  GOLD: "#e0a458",
  STABLE: "#5b8def",
};
