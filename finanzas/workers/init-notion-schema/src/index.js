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
async function createDatabase(token, parentPageId, title, properties) {
  return notionRequest(token, "/databases", {
    method: "POST",
    body: JSON.stringify({
      parent: { type: "page_id", page_id: parentPageId },
      title: [{ type: "text", text: { content: title } }],
      properties
    })
  });
}
__name(createDatabase, "createDatabase");
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
        {
          error: "missing_secret",
          detail: "NOTION_TOKEN not set. Run: npx wrangler secret put NOTION_TOKEN"
        },
        500
      );
    }
    if (req.method === "GET") {
      return jsonResponse({
        worker: "init-notion-schema",
        usage: "POST / with JSON body { parent_page_id: string }",
        notes: [
          "parent_page_id is the Notion page under which the 4 databases will be created.",
          "Get it from the page URL: the last 32-char segment (without dashes).",
          "Your Notion integration must be added to that page first (\u22EF menu \u2192 Connections)."
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
    const parentPageId = body.parent_page_id?.trim();
    if (!parentPageId) {
      return jsonResponse(
        { error: "missing_parent_page_id" },
        400
      );
    }
    try {
      const merchants = await createDatabase(
        env.NOTION_TOKEN,
        parentPageId,
        "Cap \xB7 Merchants",
        {
          Name: { title: {} },
          "Canonical category": { rich_text: {} },
          "Seen count": { number: { format: "number" } },
          "Last seen": { date: {} }
        }
      );
      const categories = await createDatabase(
        env.NOTION_TOKEN,
        parentPageId,
        "Cap \xB7 Categories",
        {
          Name: { title: {} },
          "YNAB category id": { rich_text: {} },
          "YNAB group name": { rich_text: {} },
          "Active": { checkbox: {} }
        }
      );
      const accounts = await createDatabase(
        env.NOTION_TOKEN,
        parentPageId,
        "Cap \xB7 Accounts",
        {
          Name: { title: {} },
          "YNAB account id": { rich_text: {} },
          Type: { select: {} },
          Owner: {
            select: {
              options: [
                { name: "Ricardo", color: "blue" },
                { name: "Maru", color: "pink" },
                { name: "Shared", color: "purple" }
              ]
            }
          },
          "On budget": { checkbox: {} }
        }
      );
      const expenses = await createDatabase(
        env.NOTION_TOKEN,
        parentPageId,
        "Cap \xB7 Expenses",
        {
          Name: { title: {} },
          Date: { date: {} },
          Amount: { number: { format: "number" } },
          Currency: {
            select: {
              options: [
                { name: "Bs", color: "yellow" },
                { name: "USD", color: "green" },
                { name: "USDT", color: "green" }
              ]
            }
          },
          "Amount (USDT)": { number: { format: "dollar" } },
          "Rate used": { number: { format: "number" } },
          "Rate source": {
            select: {
              options: [
                { name: "binance-p2p" },
                { name: "yadio" },
                { name: "manual" }
              ]
            }
          },
          Merchant: { rich_text: {} },
          "Merchant canonical": {
            relation: {
              database_id: merchants.id,
              single_property: {}
            }
          },
          Category: {
            relation: {
              database_id: categories.id,
              single_property: {}
            }
          },
          Memo: { rich_text: {} },
          "Attributed to": {
            select: {
              options: [
                { name: "Ricardo", color: "blue" },
                { name: "Maru", color: "pink" },
                { name: "Shared", color: "purple" }
              ]
            }
          },
          Account: {
            relation: {
              database_id: accounts.id,
              single_property: {}
            }
          },
          "Receipt URL": { url: {} },
          Status: {
            select: {
              options: [
                { name: "pending-export", color: "yellow" },
                { name: "exported", color: "green" },
                { name: "reconciled", color: "blue" },
                { name: "needs-review", color: "red" }
              ]
            }
          },
          "Exported batch": { rich_text: {} },
          "Client id": { rich_text: {} },
          "YNAB transaction ID": { rich_text: {} },
          "Captured via": {
            select: {
              options: [
                { name: "telegram-photo" },
                { name: "telegram-text" },
                { name: "telegram-voice" },
                { name: "email" },
                { name: "manual" }
              ]
            }
          }
        }
      );
      return jsonResponse(
        {
          created: {
            expenses_db_id: expenses.id,
            merchants_db_id: merchants.id,
            categories_db_id: categories.id,
            accounts_db_id: accounts.id
          },
          urls: {
            expenses: expenses.url,
            merchants: merchants.url,
            categories: categories.url,
            accounts: accounts.url
          },
          next_steps: [
            "Record these IDs. Set them as secrets on the downstream workers, e.g.:",
            `  echo '${expenses.id}'    | npx wrangler secret put NOTION_EXPENSES_DB_ID    # on notion-upsert-expense + ynab-export-csv`,
            `  echo '${merchants.id}'   | npx wrangler secret put NOTION_MERCHANTS_DB_ID   # on notion-upsert-expense`,
            `  echo '${categories.id}'  | npx wrangler secret put NOTION_CATEGORIES_DB_ID  # on notion-upsert-expense + sync-ynab-meta`,
            `  echo '${accounts.id}'    | npx wrangler secret put NOTION_ACCOUNTS_DB_ID    # on notion-upsert-expense + sync-ynab-meta`,
            "Also set NOTION_TOKEN on those workers (same token used here)."
          ]
        }
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
