var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.ts
var YNAB_API = "https://api.ynab.com/v1";
var NOTION_API = "https://api.notion.com/v1";
var NOTION_VERSION = "2022-06-28";
var DEFAULT_BUDGET_NAME = "MR";
async function ynabGet(token, path) {
  const res = await fetch(`${YNAB_API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json"
    }
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `YNAB ${res.status} ${res.statusText}: ${body.slice(0, 200)}`
    );
  }
  const json = await res.json();
  return json.data;
}
__name(ynabGet, "ynabGet");
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
      `Notion ${res.status} on ${path}: ${body.slice(0, 300)}`
    );
  }
  return await res.json();
}
__name(notionRequest, "notionRequest");
async function listAllNotionRowsByExternalId(token, dbId, externalIdProperty) {
  const map = /* @__PURE__ */ new Map();
  let cursor;
  do {
    const body = { page_size: 100 };
    if (cursor) body["start_cursor"] = cursor;
    const res = await notionRequest(token, `/databases/${dbId}/query`, {
      method: "POST",
      body: JSON.stringify(body)
    });
    for (const row of res.results) {
      const prop = row.properties[externalIdProperty];
      const extId = prop?.rich_text?.[0]?.plain_text;
      if (extId) map.set(extId, row.id);
    }
    cursor = res.has_more && res.next_cursor ? res.next_cursor : void 0;
  } while (cursor);
  return map;
}
__name(listAllNotionRowsByExternalId, "listAllNotionRowsByExternalId");
function ownerFromAccountName(name) {
  const trimmed = name.trim();
  if (/^R\s*[-–]/i.test(trimmed)) return "Ricardo";
  if (/^M\s*[-–]/i.test(trimmed)) return "Maru";
  return "Shared";
}
__name(ownerFromAccountName, "ownerFromAccountName");
async function createCategory(env, cat) {
  try {
    const props = {
      Name: {
        title: [{ type: "text", text: { content: cat.name.slice(0, 200) } }]
      },
      "YNAB category id": {
        rich_text: [{ type: "text", text: { content: cat.id } }]
      },
      "YNAB group name": {
        rich_text: [
          { type: "text", text: { content: cat.group_name.slice(0, 200) } }
        ]
      },
      Active: { checkbox: true }
    };
    const created = await notionRequest(
      env.NOTION_TOKEN,
      "/pages",
      {
        method: "POST",
        body: JSON.stringify({
          parent: { database_id: env.NOTION_CATEGORIES_DB_ID },
          properties: props
        })
      }
    );
    return { key: cat.id, name: cat.name, notion_id: created.id, action: "created" };
  } catch (err) {
    return {
      key: cat.id,
      name: cat.name,
      action: "error",
      error: err instanceof Error ? err.message : String(err)
    };
  }
}
__name(createCategory, "createCategory");
async function ensurePayeeIdProperty(token, dbId) {
  try {
    await notionRequest(token, `/databases/${dbId}`, {
      method: "PATCH",
      body: JSON.stringify({
        properties: {
          "YNAB payee id": { rich_text: {} }
        }
      })
    });
  } catch (err) {
    throw err;
  }
}
__name(ensurePayeeIdProperty, "ensurePayeeIdProperty");
async function createPayee(env, payee) {
  try {
    const props = {
      Name: {
        title: [{ type: "text", text: { content: payee.name.slice(0, 200) } }]
      },
      "YNAB payee id": {
        rich_text: [{ type: "text", text: { content: payee.id } }]
      }
    };
    const created = await notionRequest(
      env.NOTION_TOKEN,
      "/pages",
      {
        method: "POST",
        body: JSON.stringify({
          parent: { database_id: env.NOTION_MERCHANTS_DB_ID },
          properties: props
        })
      }
    );
    return { key: payee.id, name: payee.name, notion_id: created.id, action: "created" };
  } catch (err) {
    return {
      key: payee.id,
      name: payee.name,
      action: "error",
      error: err instanceof Error ? err.message : String(err)
    };
  }
}
__name(createPayee, "createPayee");
async function createAccount(env, acc) {
  try {
    const props = {
      Name: {
        title: [{ type: "text", text: { content: acc.name.slice(0, 200) } }]
      },
      "YNAB account id": {
        rich_text: [{ type: "text", text: { content: acc.id } }]
      },
      Type: { select: { name: acc.type } },
      Owner: { select: { name: ownerFromAccountName(acc.name) } },
      "On budget": { checkbox: acc.on_budget }
    };
    const created = await notionRequest(
      env.NOTION_TOKEN,
      "/pages",
      {
        method: "POST",
        body: JSON.stringify({
          parent: { database_id: env.NOTION_ACCOUNTS_DB_ID },
          properties: props
        })
      }
    );
    return { key: acc.id, name: acc.name, notion_id: created.id, action: "created" };
  } catch (err) {
    return {
      key: acc.id,
      name: acc.name,
      action: "error",
      error: err instanceof Error ? err.message : String(err)
    };
  }
}
__name(createAccount, "createAccount");
async function pMap(items, mapper, concurrency) {
  const results = new Array(items.length);
  let nextIdx = 0;
  async function worker() {
    while (nextIdx < items.length) {
      const i = nextIdx++;
      results[i] = await mapper(items[i]);
    }
  }
  __name(worker, "worker");
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}
__name(pMap, "pMap");
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
    if (req.method !== "GET") {
      return jsonResponse({ error: "method_not_allowed" }, 405);
    }
    if (!env.YNAB_TOKEN) {
      return jsonResponse(
        {
          error: "missing_secret",
          detail: "YNAB_TOKEN secret not set. From this worker's directory: npx wrangler secret put YNAB_TOKEN"
        },
        500
      );
    }
    const url = new URL(req.url);
    try {
      if (url.pathname === "/list-budgets" || url.pathname === "/budgets") {
        const data = await ynabGet(
          env.YNAB_TOKEN,
          "/budgets"
        );
        return jsonResponse({
          count: data.budgets.length,
          budgets: data.budgets.map((b) => ({
            id: b.id,
            name: b.name,
            last_modified_on: b.last_modified_on,
            currency: b.currency_format?.iso_code
          }))
        });
      }
      if (url.pathname === "/" || url.pathname === "/sync-ynab-meta") {
        const budgetName = url.searchParams.get("budget") ?? DEFAULT_BUDGET_NAME;
        const dryRun = url.searchParams.get("dry") === "1";
        const { budgets } = await ynabGet(
          env.YNAB_TOKEN,
          "/budgets"
        );
        const budget = budgets.find(
          (b) => b.name.toLowerCase() === budgetName.toLowerCase()
        );
        if (!budget) {
          return jsonResponse(
            {
              error: "budget_not_found",
              requested: budgetName,
              available: budgets.map((b) => b.name)
            },
            404
          );
        }
        const [catsData, accountsData, payeesData] = await Promise.all([
          ynabGet(
            env.YNAB_TOKEN,
            `/budgets/${budget.id}/categories`
          ),
          ynabGet(
            env.YNAB_TOKEN,
            `/budgets/${budget.id}/accounts`
          ),
          ynabGet(
            env.YNAB_TOKEN,
            `/budgets/${budget.id}/payees`
          )
        ]);
        const categories = catsData.category_groups.filter((g) => !g.hidden && !g.deleted).flatMap(
          (g) => g.categories.filter((c) => !c.hidden && !c.deleted).map((c) => ({
            id: c.id,
            name: c.name,
            group_id: g.id,
            group_name: g.name
          }))
        );
        const accounts = accountsData.accounts.filter((a) => !a.closed && !a.deleted).map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          on_budget: a.on_budget
        }));
        const payees = payeesData.payees.filter((p) => !p.deleted && p.transfer_account_id === null).map((p) => ({ id: p.id, name: p.name }));
        const transferPayees = payeesData.payees
        .filter((p) => !p.deleted && p.transfer_account_id != null)
        .map((p) => ({ id: p.id, name: p.name, transfer_account_id: p.transfer_account_id }));
        const notionReady = !!env.NOTION_TOKEN && !!env.NOTION_CATEGORIES_DB_ID && !!env.NOTION_ACCOUNTS_DB_ID;
        const payeesSyncReady = notionReady && !!env.NOTION_MERCHANTS_DB_ID;
        const defaultChunk = 40;
        const chunkParam = Number.parseInt(
          url.searchParams.get("chunk") ?? String(defaultChunk),
          10
        );
        const chunk = Number.isFinite(chunkParam) && chunkParam > 0 ? Math.min(chunkParam, 80) : defaultChunk;
        let notionWrite;
        if (!notionReady) {
          notionWrite = {
            enabled: false,
            reason: "Set NOTION_TOKEN + NOTION_CATEGORIES_DB_ID + NOTION_ACCOUNTS_DB_ID on this worker to enable Notion sync."
          };
        } else if (dryRun) {
          const emptyBucket = /* @__PURE__ */ __name((total) => ({
            total,
            already_in_notion: 0,
            created_this_run: 0,
            errored_this_run: 0,
            remaining_after_run: total,
            error_samples: []
          }), "emptyBucket");
          notionWrite = {
            enabled: true,
            dry_run: true,
            chunk_used: chunk,
            payees_sync: payeesSyncReady ? "enabled" : "disabled (set NOTION_MERCHANTS_DB_ID)",
            categories: emptyBucket(categories.length),
            accounts: emptyBucket(accounts.length),
            payees: emptyBucket(payees.length),
            done: false,
            next_step: "Remove ?dry=1 to run the actual sync."
          };
        } else {
          const envReq = env;
          if (payeesSyncReady) {
            await ensurePayeeIdProperty(
              envReq.NOTION_TOKEN,
              envReq.NOTION_MERCHANTS_DB_ID
            );
          }
          const listPromises = [
            listAllNotionRowsByExternalId(
              envReq.NOTION_TOKEN,
              envReq.NOTION_CATEGORIES_DB_ID,
              "YNAB category id"
            ),
            listAllNotionRowsByExternalId(
              envReq.NOTION_TOKEN,
              envReq.NOTION_ACCOUNTS_DB_ID,
              "YNAB account id"
            )
          ];
          if (payeesSyncReady) {
            listPromises.push(
              listAllNotionRowsByExternalId(
                envReq.NOTION_TOKEN,
                envReq.NOTION_MERCHANTS_DB_ID,
                "YNAB payee id"
              )
            );
          }
          const listResults = await Promise.all(listPromises);
          const existingCats = listResults[0];
          const existingAccs = listResults[1];
          const existingPayees = payeesSyncReady ? listResults[2] : /* @__PURE__ */ new Map();
          for (const c of categories) {
            c.notion_page_id = existingCats.get(c.id) ?? null;
          }
          for (const a of accounts) {
            a.notion_page_id = existingAccs.get(a.id) ?? null;
          }
          for (const p of payees) {
            p.notion_page_id = existingPayees.get(p.id) ?? null;
          }
          const catsToCreate = categories.filter(
            (c) => !existingCats.has(c.id)
          );
          const accsToCreate = accounts.filter(
            (a) => !existingAccs.has(a.id)
          );
          const payeesToCreate = payeesSyncReady ? payees.filter((p) => !existingPayees.has(p.id)) : [];
          let remainingBudget = chunk;
          const catsBatch = catsToCreate.slice(0, remainingBudget);
          remainingBudget -= catsBatch.length;
          const accsBatch = accsToCreate.slice(0, remainingBudget);
          remainingBudget -= accsBatch.length;
          const payeesBatch = payeesToCreate.slice(0, remainingBudget);
          const [catResults, accResults, payeeResults] = await Promise.all([
            pMap(catsBatch, (c) => createCategory(envReq, c), 3),
            pMap(accsBatch, (a) => createAccount(envReq, a), 3),
            payeesSyncReady ? pMap(payeesBatch, (p) => createPayee(envReq, p), 3) : Promise.resolve([])
          ]);
          const bucketSummary = /* @__PURE__ */ __name((total, existing, results) => {
            const created = results.filter((r) => r.action === "created").length;
            const errored = results.filter((r) => r.action === "error").length;
            return {
              total,
              already_in_notion: existing,
              created_this_run: created,
              errored_this_run: errored,
              remaining_after_run: total - existing - created,
              error_samples: results.filter((r) => r.action === "error").slice(0, 5).map((r) => ({
                name: r.name,
                error: (r.error ?? "").slice(0, 200)
              }))
            };
          }, "bucketSummary");
          const catSummary = bucketSummary(
            categories.length,
            existingCats.size,
            catResults
          );
          const accSummary = bucketSummary(
            accounts.length,
            existingAccs.size,
            accResults
          );
          const payeeSummary = payeesSyncReady ? bucketSummary(payees.length, existingPayees.size, payeeResults) : bucketSummary(payees.length, 0, []);
          const totalRemaining = catSummary.remaining_after_run + accSummary.remaining_after_run + (payeesSyncReady ? payeeSummary.remaining_after_run : 0);
          const done = totalRemaining === 0;
          notionWrite = {
            enabled: true,
            dry_run: false,
            chunk_used: chunk,
            payees_sync: payeesSyncReady ? "enabled" : "disabled (set NOTION_MERCHANTS_DB_ID)",
            categories: catSummary,
            accounts: accSummary,
            payees: payeeSummary,
            done,
            next_step: done ? "All synced. Subsequent calls will be ~6-subrequest no-ops." : `Call this endpoint again (same URL). ${totalRemaining} rows remaining.`
          };
        }
        return jsonResponse({
          budget: {
            id: budget.id,
            name: budget.name,
            currency: budget.currency_format?.iso_code
          },
          categories: {
            count: categories.length,
            items: categories
          },
          accounts: {
            count: accounts.length,
            items: accounts
          },
          payees: {
            count: payees.length,
            items: payees
          },
          transfer_payees: {
            count: transferPayees.length,
            items: transferPayees
          },
          fetched_at: (/* @__PURE__ */ new Date()).toISOString(),
          notion_write: notionWrite
        });
      }
      return jsonResponse(
        { error: "not_found", path: url.pathname },
        404
      );
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
