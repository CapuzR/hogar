// @ts-nocheck
// index.js — write-ynab-transaction (Cloudflare Worker, ES module)
// Gastos (outflow), ingresos (inflow), comisiones (outflow) y transferencias (outflow + transfer-payee).
// Idempotente: import_id = client_id. YNAB 409 (duplicado) -> already_exists (no 502).

const YNAB_API = "https://api.ynab.com/v1";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function checkAuth(req, env) {
  if (!env.CAP_AUTH_TOKEN) return null;
  const got = req.headers.get("X-Cap-Auth");
  if (!got || got !== env.CAP_AUTH_TOKEN) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }
  return null;
}

async function ynabPostTransaction(token, budgetId, tx) {
  const res = await fetch(`${YNAB_API}/budgets/${budgetId}/transactions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({ transaction: tx })
  });
  // 409 = import_id ya existe -> YNAB ya tiene esta transacción. Idempotente, NO es fallo.
  if (res.status === 409) {
    return { duplicate: true };
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("YNAB rejected", res.status, body.slice(0, 600)); // aparece en Workers Logs
    throw new Error(`YNAB ${res.status}: ${body.slice(0, 400)}`);
  }
  return await res.json();
}

export default {
  async fetch(req, env) {
    const authErr = checkAuth(req, env);
    if (authErr) return authErr;

    if (req.method === "GET") {
      return jsonResponse({
        worker: "write-ynab-transaction",
        usage: "POST / with TransactionPayload. Idempotent — same client_id returns the same YNAB transaction (409 dupes -> already_exists).",
        required_fields: ["client_id", "account_ynab_id", "date", "amount_usd", "memo"],
        optional_fields: ["flow", "payee_ynab_id", "payee_name", "category_ynab_id", "cleared", "approved"],
        amount_note: "amount_usd is converted to milliunits (×1000). If 'flow' is omitted: positive = outflow, negative = inflow (legacy).",
        flow_note: "flow (optional): 'outflow' (gasto/comisión/transferencia) or 'inflow' (ingreso/reembolso). When set, amount_usd is a positive magnitude and 'flow' decides the sign."
      });
    }

    if (req.method !== "POST") {
      return jsonResponse({ error: "method_not_allowed" }, 405);
    }
    if (!env.YNAB_TOKEN) {
      return jsonResponse({ error: "missing_secret", detail: "YNAB_TOKEN not set (wrangler secret put YNAB_TOKEN)" }, 500);
    }
    if (!env.YNAB_BUDGET_ID) {
      return jsonResponse({ error: "missing_secret", detail: "YNAB_BUDGET_ID not set. Get it from sync-ynab-meta's /list-budgets, then: wrangler secret put YNAB_BUDGET_ID" }, 500);
    }

    let payload;
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ error: "invalid_json" }, 400);
    }

    const missing = [];
    if (!payload.client_id) missing.push("client_id");
    if (!payload.account_ynab_id) missing.push("account_ynab_id");
    if (!payload.date) missing.push("date");
    if (typeof payload.amount_usd !== "number") missing.push("amount_usd (number)");
    if (!payload.memo) missing.push("memo");
    if (missing.length > 0) {
      return jsonResponse({ error: "missing_fields", fields: missing }, 400);
    }

    // flow opcional. Si no viene -> comportamiento legacy.
    if (payload.flow !== undefined && payload.flow !== "inflow" && payload.flow !== "outflow") {
      return jsonResponse({ error: "invalid_flow", accepted: ["inflow", "outflow"] }, 400);
    }

    const milliunits = Math.round(payload.amount_usd * 1e3);
    let ynabAmount;
    if (payload.flow === "inflow") {
      ynabAmount = Math.abs(milliunits);        // ingreso/reembolso -> +
    } else if (payload.flow === "outflow") {
      ynabAmount = -Math.abs(milliunits);       // gasto/comisión/transferencia -> -
    } else {
      ynabAmount = -milliunits;                 // legacy: positive amount_usd = outflow
    }

    const tx = {
      account_id: payload.account_ynab_id,
      date: payload.date,
      amount: ynabAmount,
      memo: payload.memo.slice(0, 200),
      cleared: payload.cleared ?? "uncleared",
      approved: payload.approved ?? true,
      // import_id guarantees YNAB dedupes on our client_id. Max 36 chars.
      import_id: payload.client_id.slice(0, 36)
    };
    if (payload.payee_ynab_id) {
      tx.payee_id = payload.payee_ynab_id;
    } else if (payload.payee_name) {
      tx.payee_name = payload.payee_name.slice(0, 50);
    }
    if (payload.category_ynab_id) {
      tx.category_id = payload.category_ynab_id;
    }

    try {
      const resp = await ynabPostTransaction(env.YNAB_TOKEN, env.YNAB_BUDGET_ID, tx);
      if (resp.duplicate) {
        return jsonResponse({
          action: "already_exists",
          note: "Ya existía en YNAB con el mismo import_id; no se duplicó.",
          import_id: tx.import_id,
          client_id: payload.client_id
        });
      }
      return jsonResponse({
        action: "created_or_matched",
        ynab_transaction_id: resp.data.transaction.id,
        amount_milliunits: resp.data.transaction.amount,
        flow: ynabAmount < 0 ? "outflow" : "inflow",
        import_id: resp.data.transaction.import_id,
        client_id: payload.client_id
      });
    } catch (err) {
      return jsonResponse({ error: "upstream_failure", detail: err instanceof Error ? err.message : String(err) }, 502);
    }
  }
};
