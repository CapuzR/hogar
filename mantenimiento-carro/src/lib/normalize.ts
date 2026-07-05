/**
 * Normalizador determinista texto libre -> service_type_key (sin LLM en el server).
 * El lexicon se construye desde los sinonimos de src/seed/tipos_servicio.ts
 * (unica fuente de verdad). Match por substring; gana el termino mas largo/especifico.
 */
import { TIPOS_SERVICIO } from "../seed/tipos_servicio";

const stripAccents = (s: string): string =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
const norm = (s: string): string => stripAccents(s.toLowerCase()).replace(/\s+/g, " ").trim();

interface LexEntry {
  key: string;
  term: string;
  len: number;
  re: RegExp;
}

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const LEXICON: LexEntry[] = (() => {
  const entries: LexEntry[] = [];
  const seen = new Set<string>();
  for (const t of TIPOS_SERVICIO) {
    const terms = [t.labelEs, ...t.synonyms];
    for (const raw of terms) {
      const term = norm(raw);
      if (term.length < 3) continue;
      const dedup = `${t.key}::${term}`;
      if (seen.has(dedup)) continue;
      seen.add(dedup);
      // Match por palabra completa: el termino debe estar delimitado por
      // inicio/fin o un caracter no alfanumerico (evita "goma" dentro de "gomas",
      // o sinonimos cortos incrustados en palabras ajenas).
      entries.push({
        key: t.key,
        term,
        len: term.length,
        re: new RegExp(`(^|[^a-z0-9])${escapeRegex(term)}([^a-z0-9]|$)`),
      });
    }
  }
  // Mas largo primero: preferimos "aceite y filtro" sobre "aceite".
  entries.sort((a, b) => b.len - a.len);
  return entries;
})();

export interface NormalizeResult {
  key: string;
  matched: boolean;
  matchedTerm?: string;
  confidence: number;
}

/** Mapea texto libre a un service_type_key. Sin match -> other_service (baja confianza). */
export function normalizeService(text: string): NormalizeResult {
  const hay = norm(text);
  for (const e of LEXICON) {
    if (e.re.test(hay)) {
      return { key: e.key, matched: true, matchedTerm: e.term, confidence: 0.9 };
    }
  }
  return { key: "other_service", matched: false, confidence: 0.3 };
}

/** true si el key existe en el vocabulario controlado. */
export function isKnownServiceKey(key: string): boolean {
  return TIPOS_SERVICIO.some((t) => t.key === key);
}
