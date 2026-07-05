// fix_events.mjs — ajusta data/events.csv según decisiones del usuario (2026-07-04):
//  (1) saca del ledger de mantenimiento las 10 filas "Bomba Gasolina Trinidad" que eran gasolina
//      (ya viven en data/fuel.csv). Se conserva EVT-0025 (plumillas/limpiaparabrisas).
//  (2) atribuye los 7 autolavados: 4 al Clio, 3 al Optra (alternando por fecha) y quita needs_review.
// Uso: node scripts/reconcile/fix_events.mjs
import { readFileSync, writeFileSync } from "node:fs";

const ROOT = new URL("../../", import.meta.url);
const p = (rel) => new URL(rel, ROOT).pathname.replace(/^\/([A-Za-z]:)/, "$1");

const FUEL_MOVED = new Set(["EVT-0021", "EVT-0022", "EVT-0024", "EVT-0028", "EVT-0029", "EVT-0031", "EVT-0032", "EVT-0033", "EVT-0034", "EVT-0035"]);
const CARWASH = { "EVT-0015": "clio", "EVT-0036": "optra", "EVT-0037": "clio", "EVT-0041": "optra", "EVT-0047": "clio", "EVT-0049": "optra", "EVT-0053": "clio" };
const CARWASH_NOTE = "Autolavado (alternan): asignación 4 Clio / 3 Optra por regla del usuario. Aproximado.";

function parseCsv(text) {
  const rows = []; let row = [], field = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQ = false;
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ""));
}
const esc = (s) => (/[",\n]/.test(String(s ?? "")) ? `"${String(s).replace(/"/g, '""')}"` : String(s ?? ""));

const rows = parseCsv(readFileSync(p("data/events.csv"), "utf8"));
const header = rows[0];
const col = Object.fromEntries(header.map((h, i) => [h, i]));

let removed = 0, carwashFixed = 0;
const out = [header];
for (const r of rows.slice(1)) {
  const id = r[col.event_id];
  if (FUEL_MOVED.has(id)) { removed++; continue; }
  if (CARWASH[id]) {
    r[col.car] = CARWASH[id];
    r[col.needs_review] = "false";
    r[col.confidence] = "0.60";
    r[col.notes] = CARWASH_NOTE;
    carwashFixed++;
  }
  out.push(r);
}

writeFileSync(p("data/events.csv"), out.map((r) => r.map(esc).join(",")).join("\n") + "\n", "utf8");

const dataRows = out.slice(1);
const review = dataRows.filter((r) => r[col.needs_review] === "true").length;
console.log(`events.csv: ${dataRows.length} eventos (removidos ${removed} a fuel, autolavados corregidos ${carwashFixed})`);
console.log(`needs_review restantes: ${review}`);
