import { readFileSync } from "node:fs";
const src = readFileSync("src/seed/talleres.ts","utf8");
// crude: eval-free parse of TALLERES aliases via regex blocks
const idRe = /id:\s*"([^"]+)"/g;
// Instead import compiled — simpler: use tsx
