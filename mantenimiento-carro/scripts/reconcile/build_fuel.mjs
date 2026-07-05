// build_fuel.mjs — genera data/fuel.csv desde los crudos de YNAB.
// Fuente A: raw/ynab_gasolina.tsv  (categoría "⛽️ Gasolina", TODAS las filas).
// Fuente B: raw/ynab_mantenimiento.tsv  (solo las filas de payee "Bomba Gasolina Trinidad"
//           con memo numérico → eran gasolina mal categorizada; se excluye "Limpia para brisas").
// Uso: node scripts/reconcile/build_fuel.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const ROOT = new URL("../../", import.meta.url);
const p = (rel) => new URL(rel, ROOT).pathname.replace(/^\/([A-Za-z]:)/, "$1");

// --- helpers ---
const stripQ = (s) => s.replace(/^"(.*)"$/s, "$1").replace(/""/g, '"');
function parseTsv(path) {
  const lines = readFileSync(path, "utf8").split(/\r?\n/).filter((l) => l.trim() !== "");
  const header = lines[0].split("\t").map(stripQ);
  return lines.slice(1).map((line) => {
    const cells = line.split("\t").map(stripQ);
    return Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ""]));
  });
}
function parseUsd(s) {
  s = (s || "").replace(/[$\s]/g, "");
  if (s === "") return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", "."); // decimal europeo
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
}
function isoDate(ddmmyyyy) {
  const m = (ddmmyyyy || "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return ddmmyyyy;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}
const detectCar = (memo) => (/optra/i.test(memo) ? "optra" : /clio/i.test(memo) ? "clio" : "unknown");
function owner(account) {
  const a = (account || "").trim();
  if (/^R\s*[-–]/i.test(a)) return "Ricardo";
  if (/^M\s*[-–]/i.test(a)) return "Maru";
  return "Shared";
}
const csvEsc = (s) => {
  s = String(s ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// --- fuente A: gasolina ---
const gas = parseTsv(p("raw/ynab_gasolina.tsv")).map((r) => ({
  date: isoDate(r["Date"]),
  amount_usd: parseUsd(r["Outflow"]),
  vendor: r["Payee"],
  account: r["Account"],
  memo: r["Memo"],
  source: "ynab-gasolina",
}));

// --- fuente B: gasolina mal categorizada en mantenimiento ---
const maint = parseTsv(p("raw/ynab_mantenimiento.tsv"))
  .filter((r) => /^Bomba Gasolina Trinidad$/i.test((r["Payee"] || "").trim()) && !/[a-zA-Z]/.test(r["Memo"] || ""))
  .map((r) => ({
    date: isoDate(r["Date"]),
    amount_usd: parseUsd(r["Outflow"]),
    vendor: r["Payee"],
    account: r["Account"],
    memo: r["Memo"],
    source: "ynab-mantenimiento(reclasificado)",
  }));

// --- combinar, ordenar, numerar ---
const all = [...gas, ...maint]
  .filter((r) => r.amount_usd != null)
  .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

const header = "fuel_id,car,date,amount_usd,currency,liters,vendor,owner,source,notes";
const rows = all.map((r, i) => {
  const id = `FUEL-${String(i + 1).padStart(4, "0")}`;
  return [id, detectCar(r.memo), r.date, r.amount_usd.toFixed(2), "USD", "", r.vendor, owner(r.account), r.source, r.memo].map(csvEsc).join(",");
});

mkdirSync(p("data"), { recursive: true });
writeFileSync(p("data/fuel.csv"), header + "\n" + rows.join("\n") + "\n", "utf8");

// --- resumen ---
const total = all.reduce((s, r) => s + r.amount_usd, 0);
const byCar = all.reduce((m, r) => ((m[detectCar(r.memo)] = (m[detectCar(r.memo)] || 0) + r.amount_usd), m), {});
console.log(`fuel.csv: ${all.length} cargas (A=${gas.length} gasolina + B=${maint.length} reclasificadas)`);
console.log(`Total gasolina: $${total.toFixed(2)}`);
console.log(`Por carro: ${Object.entries(byCar).map(([k, v]) => `${k} $${v.toFixed(2)}`).join(" | ")}`);
console.log(`Rango: ${all[0].date} → ${all[all.length - 1].date}`);
