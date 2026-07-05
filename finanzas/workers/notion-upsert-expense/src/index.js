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
function validate(body) {
  if (!body || typeof body !== "object") return "body_not_object";
  const b = body;
  const required = [
    "client_id",
    "date",
    "amount",
    "currency",
    "amount_usdt",
    "rate_used",
    "rate_source",
    "merchant",
    "memo",
    "attributed_to",
    "captured_via"
  ];
  for (const f of required) {
    if (b[f] === void 0 || b[f] === null || b[f] === "") {
      return `missing_${String(f)}`;
    }
  }
  return b;
}
__name(validate, "validate");
async function ensureYnabTransactionIdProperty(token, dbId) {
  await notionRequest(token, `/databases/${dbId}`, {
    method: "PATCH",
    body: JSON.stringify({
      properties: { "YNAB transaction ID": { rich_text: {} } }
    })
  });
}
__name(ensureYnabTransactionIdProperty, "ensureYnabTransactionIdProperty");
async function findExistingByClientId(env, clientId) {
  const res = await notionRequest(
    env.NOTION_TOKEN,
    `/databases/${env.NOTION_EXPENSES_DB_ID}/query`,
    {
      method: "POST",
      body: JSON.stringify({
        filter: {
          property: "Client id",
          rich_text: { equals: clientId }
        },
        page_size: 1
      })
    }
  );
  return res.results[0]?.id ?? null;
}
__name(findExistingByClientId, "findExistingByClientId");
function buildProperties(p, isUpdate) {
  const titleText = `${p.merchant} \xB7 ${p.amount} ${p.currency}`;
  const props = {
    Name: { title: [{ type: "text", text: { content: titleText.slice(0, 200) } }] },
    Date: { date: { start: p.date } },
    Amount: { number: p.amount },
    Currency: { select: { name: p.currency } },
    "Amount (USDT)": { number: p.amount_usdt },
    "Rate used": { number: p.rate_used },
    "Rate source": { select: { name: p.rate_source } },
    Merchant: { rich_text: [{ type: "text", text: { content: p.merchant.slice(0, 2e3) } }] },
    Memo: { rich_text: [{ type: "text", text: { content: p.memo.slice(0, 2e3) } }] },
    "Attributed to": { select: { name: p.attributed_to } },
    "Client id": { rich_text: [{ type: "text", text: { content: p.client_id } }] },
    "Captured via": { select: { name: p.captured_via } }
  };
  if (p.status) {
    props["Status"] = { select: { name: p.status } };
  } else if (!isUpdate) {
    props["Status"] = { select: { name: "pending-export" } };
  }
  if (p.category_id) {
    props["Category"] = { relation: [{ id: p.category_id }] };
  }
  if (p.account_id) {
    props["Account"] = { relation: [{ id: p.account_id }] };
  }
  if (p.merchant_canonical_id) {
    props["Merchant canonical"] = {
      relation: [{ id: p.merchant_canonical_id }]
    };
  }
  if (p.receipt_url) {
    props["Receipt URL"] = { url: p.receipt_url };
  }
  if (p.ynab_transaction_id) {
    props["YNAB transaction ID"] = {
      rich_text: [{ type: "text", text: { content: p.ynab_transaction_id } }]
    };
  }
  if (p.exported_batch) {
    props["Exported batch"] = {
      rich_text: [{ type: "text", text: { content: p.exported_batch } }]
    };
  }
  return props;
}
__name(buildProperties, "buildProperties");
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
    if (!env.NOTION_EXPENSES_DB_ID) {
      return jsonResponse(
        {
          error: "missing_secret",
          detail: "NOTION_EXPENSES_DB_ID not set. Obtain from init-notion-schema then: npx wrangler secret put NOTION_EXPENSES_DB_ID"
        },
        500
      );
    }
    if (req.method === "GET") {
      return jsonResponse({
        worker: "notion-upsert-expense",
        usage: "POST / with JSON body matching ExpensePayload. Idempotent via client_id.",
        required_fields: [
          "client_id",
          "date",
          "amount",
          "currency",
          "amount_usdt",
          "rate_used",
          "rate_source",
          "merchant",
          "memo",
          "attributed_to",
          "captured_via"
        ],
        optional_fields: [
          "category_id",
          "account_id",
          "merchant_canonical_id",
          "receipt_url"
        ]
      });
    }
    if (req.method !== "POST") {
      return jsonResponse({ error: "method_not_allowed" }, 405);
    }
    let raw;
    try {
      raw = await req.json();
    } catch {
      return jsonResponse({ error: "invalid_json" }, 400);
    }
    const parsed = validate(raw);
    if (typeof parsed === "string") {
      return jsonResponse({ error: parsed }, 400);
    }
    try {
      if (parsed.ynab_transaction_id) {
        await ensureYnabTransactionIdProperty(
          env.NOTION_TOKEN,
          env.NOTION_EXPENSES_DB_ID
        );
      }
      const existing = await findExistingByClientId(env, parsed.client_id);
      if (existing) {
        const props2 = buildProperties(parsed, true);
        const updated = await notionRequest(
          env.NOTION_TOKEN,
          `/pages/${existing}`,
          {
            method: "PATCH",
            body: JSON.stringify({ properties: props2 })
          }
        );
        return jsonResponse({
          action: "updated",
          page_id: updated.id,
          url: updated.url,
          client_id: parsed.client_id
        });
      }
      const props = buildProperties(parsed, false);
      const created = await notionRequest(
        env.NOTION_TOKEN,
        "/pages",
        {
          method: "POST",
          body: JSON.stringify({
            parent: { database_id: env.NOTION_EXPENSES_DB_ID },
            properties: props
          })
        }
      );
      return jsonResponse({
        action: "created",
        page_id: created.id,
        url: created.url,
        client_id: parsed.client_id
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
