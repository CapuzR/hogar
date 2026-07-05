var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/auth.ts
function guardAuth(req, env) {
  if (req.method === "GET") return null;
  if (!env.AUTH_TOKEN) {
    return new Response(
      JSON.stringify({
        error: "server_misconfigured",
        detail: "AUTH_TOKEN secret missing on this Worker"
      }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
  const supplied = req.headers.get("x-cap-auth") ?? "";
  if (supplied !== env.AUTH_TOKEN) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" }
    });
  }
  return null;
}
__name(guardAuth, "guardAuth");

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
    throw new Error(`Notion ${res.status} on ${path}: ${body.slice(0, 400)}`);
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
  for (const f of ["ciclo_id", "nombre", "tipo", "estado"]) {
    if (!b[f]) return `missing_${f}`;
  }
  return b;
}
__name(validate, "validate");
async function findByCicloId(env, cicloId) {
  const res = await notionRequest(
    env.NOTION_TOKEN,
    `/databases/${env.NOTION_CICLOS_DB_ID}/query`,
    {
      method: "POST",
      body: JSON.stringify({
        filter: { property: "Ciclo ID", rich_text: { equals: cicloId } },
        page_size: 1
      })
    }
  );
  return res.results[0]?.id ?? null;
}
__name(findByCicloId, "findByCicloId");
function richText(value) {
  const v = (value ?? "").toString();
  return { rich_text: [{ type: "text", text: { content: v.slice(0, 2e3) } }] };
}
__name(richText, "richText");
function buildProperties(p) {
  const props = {
    Nombre: {
      title: [{ type: "text", text: { content: p.nombre.slice(0, 200) } }]
    },
    "Ciclo ID": richText(p.ciclo_id),
    Tipo: { select: { name: p.tipo } },
    Estado: { select: { name: p.estado } }
  };
  if (p.ronda != null) props["Ronda #"] = { number: p.ronda };
  if (p.fecha_inicio) props["Fecha inicio"] = { date: { start: p.fecha_inicio } };
  if (p.fecha_fin) props["Fecha fin"] = { date: { start: p.fecha_fin } };
  if (p.motivo_suspension) props["Motivo suspensi\xF3n"] = richText(p.motivo_suspension);
  if (p.resultado) props["Resultado"] = richText(p.resultado);
  if (p.sujeto_principal) props["Sujeto principal"] = { select: { name: p.sujeto_principal } };
  if (p.fur_registrada) props["FUR registrada"] = { date: { start: p.fur_registrada } };
  if (p.notas) props["Notas"] = richText(p.notas);
  return props;
}
__name(buildProperties, "buildProperties");
var index_default = {
  async fetch(req, env) {
    const denied = guardAuth(req, env);
    if (denied) return denied;
    if (!env.NOTION_TOKEN) return jsonResponse({ error: "missing_secret", detail: "NOTION_TOKEN" }, 500);
    if (!env.NOTION_CICLOS_DB_ID) return jsonResponse({ error: "missing_secret", detail: "NOTION_CICLOS_DB_ID" }, 500);
    if (req.method === "GET") {
      return jsonResponse({
        worker: "notion-upsert-fertilidad-ciclo",
        usage: "POST con JSON { ciclo_id, nombre, tipo, estado, ... }. Idempotente por ciclo_id."
      });
    }
    if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);
    let raw;
    try {
      raw = await req.json();
    } catch {
      return jsonResponse({ error: "invalid_json" }, 400);
    }
    const parsed = validate(raw);
    if (typeof parsed === "string") return jsonResponse({ error: parsed }, 400);
    try {
      const existing = await findByCicloId(env, parsed.ciclo_id);
      const props = buildProperties(parsed);
      if (existing) {
        const updated = await notionRequest(
          env.NOTION_TOKEN,
          `/pages/${existing}`,
          { method: "PATCH", body: JSON.stringify({ properties: props }) }
        );
        return jsonResponse({ action: "updated", page_id: updated.id, url: updated.url, ciclo_id: parsed.ciclo_id });
      }
      const created = await notionRequest(
        env.NOTION_TOKEN,
        "/pages",
        {
          method: "POST",
          body: JSON.stringify({
            parent: { database_id: env.NOTION_CICLOS_DB_ID },
            properties: props
          })
        }
      );
      return jsonResponse({ action: "created", page_id: created.id, url: created.url, ciclo_id: parsed.ciclo_id });
    } catch (err) {
      return jsonResponse(
        { error: "upstream_failure", detail: err instanceof Error ? err.message : String(err) },
        502
      );
    }
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
