// @ts-nocheck
// index.js — fetch-exchange-rate (Cloudflare Worker, ES module)
// Hoy -> Binance P2P en vivo (con respaldo a 'paralelo' de dolarapi si Binance bloquea la IP del Worker).
// Fecha pasada -> tasa 'paralelo' (dolarapi). Sobre de error ok/user_message.

const BINANCE_P2P_URL = "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search";
const DOLARAPI_HIST_BASE = "https://ve.dolarapi.com/v1/historicos/dolares";
const DOLARAPI_LIVE_PARALELO = "https://ve.dolarapi.com/v1/dolares/paralelo";

// publisherType: "merchant" trae solo comerciantes; null trae todos los anunciantes.
// (Binance dejó de enviar advertiser.isMerchant ~2026 -> hay que pedir merchants por publisherType.)
async function fetchBinanceP2P(asset, fiat, tradeType, publisherType) {
  const res = await fetchWithTimeout(BINANCE_P2P_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (fetch-exchange-rate Worker; https://github.com/capuzr)"
    },
    body: JSON.stringify({
      asset, fiat, tradeType,
      payTypes: [], publisherType, page: 1, rows: 20, transAmount: ""
    })
  }, 6000);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Binance P2P HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = await res.json();
  if (!json.success || json.code !== "000000") {
    throw new Error(`Binance P2P rejected: code=${json.code} msg=${json.message ?? "n/a"}`);
  }
  return json.data ?? [];
}

function median(nums) {
  if (nums.length === 0) return NaN;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

// Calidad del anunciante: >=50 órdenes/mes y >=90% de cierre.
function isQualityAdvertiser(o) {
  return o.advertiser.monthOrderCount >= 50 && o.advertiser.monthFinishRate >= 0.9;
}

// Mediana de precio de las (hasta) 10 mejores ofertas (Binance las ordena por precio).
function medianRate(offers) {
  const prices = offers
    .slice(0, 10)
    .map((o) => Number.parseFloat(o.adv.price))
    .filter((p) => Number.isFinite(p));
  return { rate: median(prices), sampled: prices.length };
}

// Tasa de hoy desde Binance P2P. Pide comerciantes y filtra por calidad; si quedan <5,
// reintenta con todos los anunciantes. Lanza si Binance no responde (lo maneja el llamador).
async function fetchBinanceRate(asset, fiat, tradeType) {
  const merchants = await fetchBinanceP2P(asset, fiat, tradeType, "merchant");
  const quality = merchants.filter(isQualityAdvertiser);
  if (quality.length >= 5) {
    const { rate, sampled } = medianRate(quality);
    if (Number.isFinite(rate)) return { rate, sampled, filtered_by: "merchant" };
  }
  // Pocas merchants de calidad -> cae a todos los anunciantes.
  const all = await fetchBinanceP2P(asset, fiat, tradeType, null);
  const { rate, sampled } = medianRate(all);
  return { rate, sampled, filtered_by: "fallback-all" };
}

// Respaldo EN VIVO: tasa 'paralelo' de HOY desde dolarapi (cloud-friendly, no bloquea IPs de datacenter).
// Se usa cuando Binance falla o bloquea la IP del Worker. Devuelve {rate, effective_date} o null.
async function fetchLiveParalelo() {
  try {
    const res = await fetchWithTimeout(
      DOLARAPI_LIVE_PARALELO,
      { headers: { "User-Agent": "fetch-exchange-rate Worker (https://github.com/capuzr)" } },
      6000
    );
    if (!res.ok) return null;
    const obj = await res.json().catch(() => null);
    const rate = obj ? Number(obj.promedio) : NaN;
    return Number.isFinite(rate) ? { rate, effective_date: obj.fechaActualizacion ?? null } : null;
  } catch {
    return null;
  }
}

// Hoy en Venezuela (America/Caracas) como YYYY-MM-DD
function caracasToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date());
}

function fetchWithTimeout(url, opts, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(t));
}

// Tasa 'paralelo' histórica (~ Binance P2P) para una fecha pasada.
// dolarapi guarda 1 snapshot/día; finde/feriados pueden faltar -> retrocede hasta maxLookback días.
// Devuelve: {status:"ok", rate, effective_date, requested_date, fell_back} | {status:"no_data"} | {status:"source_error", detail}
async function fetchHistoricalParalelo(dateStr, maxLookback = 5) {
  const UA = { "User-Agent": "fetch-exchange-rate Worker (https://github.com/capuzr)" };
  let d = new Date(`${dateStr}T12:00:00Z`); // mediodía UTC: evita saltos de día por zona horaria
  for (let i = 0; i <= maxLookback; i++) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    const url = `${DOLARAPI_HIST_BASE}/${y}/${m}/${day}`;

    let res = null;
    for (let attempt = 0; attempt < 2 && !res; attempt++) {
      try {
        res = await fetchWithTimeout(url, { headers: UA }, 6000);
      } catch (e) {
        if (attempt === 1) return { status: "source_error", detail: "network/timeout" };
      }
    }
    if (!res) return { status: "source_error", detail: "network/timeout" };

    if (res.status === 404) { d = new Date(d.getTime() - 86400000); continue; } // ese día no existe
    if (!res.ok) return { status: "source_error", detail: `HTTP ${res.status}` }; // 5xx/429 -> falla rápido

    const arr = await res.json().catch(() => null);
    const par = Array.isArray(arr) ? arr.find((x) => x.fuente === "paralelo") : null;
    const rate = par ? Number(par.promedio) : NaN;
    if (Number.isFinite(rate)) {
      return {
        status: "ok",
        rate,
        effective_date: par.fecha ?? `${y}-${m}-${day}`,
        requested_date: dateStr,
        fell_back: i > 0
      };
    }
    d = new Date(d.getTime() - 86400000); // existe pero sin paralelo
  }
  return { status: "no_data" };
}

function jsonResponse(body, status, cacheSeconds = 0) {
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*"
  };
  headers["cache-control"] = cacheSeconds > 0 ? `public, max-age=${cacheSeconds}` : "no-store";
  return new Response(JSON.stringify(body, null, 2), { status, headers });
}

export default {
  async fetch(req, env) {
    if (env.CAP_AUTH_TOKEN && req.headers.get("X-Cap-Auth") !== env.CAP_AUTH_TOKEN) {
      return jsonResponse({ ok: false, error: "unauthorized" }, 401);
    }
    const url = new URL(req.url);
    if (req.method !== "GET") return jsonResponse({ ok: false, error: "method_not_allowed" }, 405);
    if (url.pathname !== "/" && url.pathname !== "/fetch-exchange-rate") {
      return jsonResponse({ ok: false, error: "not_found", path: url.pathname }, 404);
    }

    const asset = url.searchParams.get("asset") ?? "USDT";
    const fiat = url.searchParams.get("fiat") ?? "VES";
    const tradeTypeRaw = url.searchParams.get("tradeType") ?? "BUY";
    const dateParam = url.searchParams.get("date"); // YYYY-MM-DD opcional

    if (tradeTypeRaw !== "BUY" && tradeTypeRaw !== "SELL") {
      return jsonResponse({ ok: false, error: "invalid_tradeType", accepted: ["BUY", "SELL"] }, 400);
    }

    // --- Rama histórica: solo fechas pasadas ---
    if (dateParam) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
        return jsonResponse({ ok: false, error: "invalid_date", expected: "YYYY-MM-DD" }, 400);
      }
      if (Number.isNaN(new Date(`${dateParam}T12:00:00Z`).getTime())) {
        return jsonResponse({ ok: false, error: "invalid_date", expected: "YYYY-MM-DD (fecha real)" }, 400);
      }
      if (dateParam < caracasToday()) {
        if (fiat !== "VES") {
          return jsonResponse({
            ok: false, error: "historical_only_VES", fiat,
            user_message: "⚠️ Solo tengo histórico para Bs/VES. Pásame la tasa a mano para esa moneda."
          }, 400);
        }
        const h = await fetchHistoricalParalelo(dateParam);
        if (h.status === "ok") {
          return jsonResponse({
            ok: true,
            rate: h.rate,
            source: "dolarapi-paralelo",
            pair: `${fiat}/${asset}`,
            tradeType: tradeTypeRaw,
            date: h.effective_date,
            requested_date: h.requested_date,
            fell_back_to_previous_day: h.fell_back,
            note: "Tasa 'paralelo' del día (aprox. Binance P2P). Sin separación BUY/SELL.",
            captured_at: new Date().toISOString()
          }, 200, 21600); // inmutable -> cache 6h
        }
        const user_message = h.status === "no_data"
          ? `⚠️ No hay tasa "paralelo" registrada para el ${dateParam} (ni en días previos). Pásame la tasa de ese día y lo registro a mano.`
          : `⚠️ No pude obtener la tasa del ${dateParam}: la fuente (dolarapi) no respondió. No registré el gasto para no usar una tasa equivocada. Dime "reintenta" o pásame la tasa del día.`;
        return jsonResponse({
          ok: false,
          error: h.status === "no_data" ? "no_rate_for_date" : "rate_source_unavailable",
          date: dateParam,
          ...(h.status === "source_error" ? { detail: h.detail } : {}),
          user_message
        }, 503);
      }
      // hoy o futuro -> cae a la rama en vivo
    }

    // --- Rama en vivo: Binance P2P de hoy (con respaldo a 'paralelo' de dolarapi) ---
    let binanceError = null;
    try {
      const agg = await fetchBinanceRate(asset, fiat, tradeTypeRaw);
      if (Number.isFinite(agg.rate)) {
        return jsonResponse({
          ok: true,
          rate: agg.rate,
          source: "binance-p2p",
          pair: `${fiat}/${asset}`,
          tradeType: tradeTypeRaw,
          date: caracasToday(),
          sampled_offers: agg.sampled,
          filter: agg.filtered_by,
          captured_at: new Date().toISOString()
        }, 200, 60);
      }
      binanceError = `no_rate (sampled=${agg.sampled})`;
    } catch (err) {
      binanceError = err instanceof Error ? err.message : String(err);
    }

    // Binance falló o no devolvió tasa -> respaldo 'paralelo' de HOY (solo VES).
    if (fiat === "VES") {
      const par = await fetchLiveParalelo();
      if (par && Number.isFinite(par.rate)) {
        return jsonResponse({
          ok: true,
          rate: par.rate,
          source: "dolarapi-paralelo-live",
          pair: `${fiat}/${asset}`,
          tradeType: tradeTypeRaw,
          date: caracasToday(),
          note: "Binance no respondió; usé la tasa 'paralelo' de hoy (dolarapi). Sin separación BUY/SELL.",
          binance_error: binanceError,
          captured_at: new Date().toISOString()
        }, 200, 60);
      }
    }

    // Ni Binance ni el respaldo dieron tasa -> no registrar.
    return jsonResponse({
      ok: false,
      error: "upstream_failure",
      detail: binanceError,
      user_message: '⚠️ No pude obtener la tasa de hoy (Binance y el respaldo fallaron). No registré el gasto para no usar una tasa equivocada. Dime "reintenta".'
    }, 502);
  }
};