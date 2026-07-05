var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.ts
function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
__name(jsonResponse, "jsonResponse");
var index_default = {
  async fetch(req, env) {
    if (env.CAP_AUTH_TOKEN && req.headers.get("X-Cap-Auth") !== env.CAP_AUTH_TOKEN) {
      return new Response(
        JSON.stringify({ error: "unauthorized" }),
        { status: 401, headers: { "content-type": "application/json" } }
      );
    }
    if (req.method === "GET") {
      return jsonResponse({
        worker: "reconcile-bank-statement",
        status: "SKELETON",
        usage: "POST / with { bank: string, account_name: string, lines: BankLine[] }",
        todo: [
          "Implement per-bank PDF\u2192lines parser (probably on Cap side, not here)",
          "Implement fuzzy match against Notion Expenses (date \xB1 2d, amount \xB11%)",
          "Return matched/unmatched/duplicate arrays",
          "Wire Cap skill to present unmatched for user classification"
        ]
      });
    }
    if (req.method !== "POST") {
      return jsonResponse({ error: "method_not_allowed" }, 405);
    }
    let body;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "invalid_json" }, 400);
    }
    if (!Array.isArray(body.lines)) {
      return jsonResponse({ error: "missing_lines_array" }, 400);
    }
    return jsonResponse({
      echo: {
        bank: body.bank ?? null,
        account_name: body.account_name ?? null,
        line_count: body.lines.length
      },
      matched: [],
      unmatched: body.lines,
      duplicates: [],
      note: "skeleton: matching not implemented yet"
    });
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map