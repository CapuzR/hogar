var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.ts
var NOTION_API = "https://api.notion.com/v1";
var NOTION_VERSION = "2022-06-28";
async function notionRequest(token, path, init) {
  const res = await fetch(`${NOTION_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
      ...init?.headers ?? {}
    }
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Notion ${res.status} on ${path}: ${body.slice(0, 400)}`
    );
  }
  return await res.json();
}
__name(notionRequest, "notionRequest");
function getText(p) {
  if (!p) return "";
  if (p.type === "title")
    return p.title.map((x) => x.plain_text).join("");
  if (p.type === "rich_text")
    return p.rich_text.map((x) => x.plain_text).join("");
  return "";
}
__name(getText, "getText");
function getNumber(p) {
  if (!p || p.type !== "number") return null;
  return p.number;
}
__name(getNumber, "getNumber");
function getSelect(p) {
  if (!p || p.type !== "select") return "";
  const v = p.select;
  return v?.name ?? "";
}
__name(getSelect, "getSelect");
function getDate(p) {
  if (!p || p.type !== "date") return "";
  const v = p.date;
  return v?.start ?? "";
}
__name(getDate, "getDate");
function getRelationIds(p) {
  if (!p || p.type !== "relation") return [];
  return p.relation.map((r) => r.id);
}
__name(getRelationIds, "getRelationIds");
async function fetchRelationName(env, pageId, cache) {
  if (cache.has(pageId)) return cache.get(pageId);
  try {
    const page = await notionRequest(
      env.NOTION_TOKEN,
      `/pages/${pageId}`
    );
    const name = getText(page.properties["Name"]);
    cache.set(pageId, name);
    return name;
  } catch {
    cache.set(pageId, "");
    return "";
  }
}
__name(fetchRelationName, "fetchRelationName");
function csvEscape(s) {
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
__name(csvEscape, "csvEscape");
async function queryPending(env) {
  const results = [];
  let cursor;
  while (true) {
    const body = {
      filter: {
        property: "Status",
        select: { equals: "pending-export" }
      },
      sorts: [{ property: "Date", direction: "ascending" }],
      page_size: 100
    };
    if (cursor) body["start_cursor"] = cursor;
    const res = await notionRequest(
      env.NOTION_TOKEN,
      `/databases/${env.NOTION_EXPENSES_DB_ID}/query`,
      {
        method: "POST",
        body: JSON.stringify(body)
      }
    );
    results.push(...res.results);
    if (!res.has_more || !res.next_cursor) break;
    cursor = res.next_cursor;
  }
  return results;
}
__name(queryPending, "queryPending");
async function markExported(env, pageIds, batchId) {
  const concurrency = 5;
  let i = 0;
  async function worker() {
    while (i < pageIds.length) {
      const idx = i++;
      const pageId = pageIds[idx];
      await notionRequest(env.NOTION_TOKEN, `/pages/${pageId}`, {
        method: "PATCH",
        body: JSON.stringify({
          properties: {
            Status: { select: { name: "exported" } },
            "Exported batch": {
              rich_text: [{ type: "text", text: { content: batchId } }]
            }
          }
        })
      });
    }
  }
  __name(worker, "worker");
  await Promise.all(Array.from({ length: concurrency }, worker));
}
__name(markExported, "markExported");
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
    if (!env.NOTION_TOKEN) {
      return jsonResponse(
        { error: "missing_secret", detail: "NOTION_TOKEN not set" },
        500
      );
    }
    if (!env.NOTION_EXPENSES_DB_ID) {
      return jsonResponse(
        { error: "missing_secret", detail: "NOTION_EXPENSES_DB_ID not set" },
        500
      );
    }
    if (req.method !== "GET") {
      return jsonResponse({ error: "method_not_allowed" }, 405);
    }
    const url = new URL(req.url);
    const dryRun = url.searchParams.get("dry") === "1";
    try {
      const rows = await queryPending(env);
      if (rows.length === 0) {
        return jsonResponse({
          message: "nothing_to_export",
          count: 0
        });
      }
      const relationNameCache = /* @__PURE__ */ new Map();
      const lines = ["Date,Payee,Category,Memo,Outflow,Inflow"];
      const rowIds = [];
      for (const row of rows) {
        const props = row.properties;
        const date = getDate(props["Date"]);
        const merchantRaw = getText(props["Merchant"]);
        const amountNative = getNumber(props["Amount"]) ?? 0;
        const currency = getSelect(props["Currency"]);
        const amountUsdt = getNumber(props["Amount (USDT)"]) ?? 0;
        const memoExisting = getText(props["Memo"]);
        const categoryIds = getRelationIds(props["Category"]);
        const canonicalIds = getRelationIds(props["Merchant canonical"]);
        const catId = categoryIds[0];
        const categoryName = catId ? await fetchRelationName(env, catId, relationNameCache) : "";
        const canonicalId = canonicalIds[0];
        const payeeName = canonicalId ? await fetchRelationName(env, canonicalId, relationNameCache) || merchantRaw : merchantRaw;
        const memoParts = [`${amountNative} ${currency}`];
        if (memoExisting && !memoExisting.startsWith(`${amountNative}`)) {
          memoParts.push(memoExisting);
        } else if (memoExisting) {
          memoParts.length = 0;
          memoParts.push(memoExisting);
        }
        const memo = memoParts.join(" | ");
        const outflow = amountUsdt >= 0 ? amountUsdt.toFixed(2) : "";
        const inflow = amountUsdt < 0 ? Math.abs(amountUsdt).toFixed(2) : "";
        lines.push(
          [
            csvEscape(date),
            csvEscape(payeeName),
            csvEscape(categoryName),
            csvEscape(memo),
            outflow,
            inflow
          ].join(",")
        );
        rowIds.push(row.id);
      }
      const csv = lines.join("\n") + "\n";
      const batchId = `batch-${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-")}`;
      if (!dryRun) {
        await markExported(env, rowIds, batchId);
      }
      return new Response(csv, {
        status: 200,
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="ynab-${batchId}.csv"`,
          "x-batch-id": batchId,
          "x-row-count": String(rowIds.length),
          "x-dry-run": dryRun ? "true" : "false",
          "cache-control": "no-store"
        }
      });
    } catch (err) {
      return jsonResponse(
        {
          error: "upstream_failure",
          detail: err instanceof Error ? err.message : String(err)
        },
        502
      );
    }
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
