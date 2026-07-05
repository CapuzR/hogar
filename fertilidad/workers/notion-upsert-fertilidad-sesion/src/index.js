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
  for (const f of ["client_id", "nombre", "tipo"]) {
    if (!b[f]) return `missing_${f}`;
  }
  return b;
}
__name(validate, "validate");
async function findByClientId(env, clientId) {
  const res = await notionRequest(
    env.NOTION_TOKEN,
    `/databases/${env.NOTION_SESIONES_DB_ID}/query`,
    {
      method: "POST",
      body: JSON.stringify({
        filter: { property: "Client ID", rich_text: { equals: clientId } },
        page_size: 1
      })
    }
  );
  return res.results[0]?.id ?? null;
}
__name(findByClientId, "findByClientId");
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
    "Client ID": richText(p.client_id),
    Tipo: { select: { name: p.tipo } }
  };
  if (p.fecha) props["Fecha"] = { date: { start: p.fecha } };
  if (p.confianza_fecha) props["Confianza fecha"] = { select: { name: p.confianza_fecha } };
  if (p.sujeto) props["Sujeto"] = { select: { name: p.sujeto } };
  if (p.participantes?.length) {
    props["Participantes"] = {
      multi_select: p.participantes.slice(0, 100).map((n) => ({ name: n.slice(0, 100) }))
    };
  }
  if (p.ciclo_page_id) props["Ciclo"] = { relation: [{ id: p.ciclo_page_id }] };
  if (p.valores_lab_page_ids?.length) {
    props["Valores Lab"] = { relation: p.valores_lab_page_ids.map((id) => ({ id })) };
  }
  if (p.medicamentos_page_ids?.length) {
    props["Medicamentos"] = { relation: p.medicamentos_page_ids.map((id) => ({ id })) };
  }
  if (p.source_type) props["Source type"] = { select: { name: p.source_type } };
  if (p.archivo_original) props["Archivo original"] = richText(p.archivo_original);
  if (p.archivo_split) props["Archivo split"] = richText(p.archivo_split);
  if (p.pagina_en_original) props["P\xE1gina en original"] = richText(p.pagina_en_original);
  if (p.resumen) props["Resumen"] = richText(p.resumen);
  if (p.descripcion_larga) props["Descripci\xF3n larga"] = richText(p.descripcion_larga);
  if (p.hallazgos_clave?.length) {
    props["Hallazgos clave"] = richText(p.hallazgos_clave.map((h) => `\u2022 ${h}`).join("\n"));
  }
  if (p.proximos_pasos) props["Pr\xF3ximos pasos"] = richText(p.proximos_pasos);
  if (p.notas_de_incertidumbre?.length) {
    props["Notas de incertidumbre"] = richText(
      p.notas_de_incertidumbre.map((n) => `\u2022 ${n}`).join("\n")
    );
  }
  if (p.citas_literales !== void 0) {
    try {
      props["Citas literales JSON"] = richText(JSON.stringify(p.citas_literales));
    } catch {
    }
  }
  return props;
}
__name(buildProperties, "buildProperties");
var index_default = {
  async fetch(req, env) {
    const denied = guardAuth(req, env);
    if (denied) return denied;
    if (!env.NOTION_TOKEN) return jsonResponse({ error: "missing_secret", detail: "NOTION_TOKEN" }, 500);
    if (!env.NOTION_SESIONES_DB_ID) return jsonResponse({ error: "missing_secret", detail: "NOTION_SESIONES_DB_ID" }, 500);
    if (req.method === "GET") {
      return jsonResponse({
        worker: "notion-upsert-fertilidad-sesion",
        usage: "POST con JSON { client_id, nombre, tipo, ... }. Idempotente por client_id."
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
      const existing = await findByClientId(env, parsed.client_id);
      const props = buildProperties(parsed);
      if (existing) {
        const updated = await notionRequest(
          env.NOTION_TOKEN,
          `/pages/${existing}`,
          { method: "PATCH", body: JSON.stringify({ properties: props }) }
        );
        return jsonResponse({ action: "updated", page_id: updated.id, url: updated.url, client_id: parsed.client_id });
      }
      const created = await notionRequest(
        env.NOTION_TOKEN,
        "/pages",
        {
          method: "POST",
          body: JSON.stringify({
            parent: { database_id: env.NOTION_SESIONES_DB_ID },
            properties: props
          })
        }
      );
      return jsonResponse({ action: "created", page_id: created.id, url: created.url, client_id: parsed.client_id });
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
