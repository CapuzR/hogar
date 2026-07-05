var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/auth.ts
function guardWrite(req, env) {
  if (!env.AUTH_TOKEN) {
    return jsonError(500, "server_misconfigured", "AUTH_TOKEN secret missing");
  }
  if ((req.headers.get("x-cap-auth") ?? "") !== env.AUTH_TOKEN) {
    return jsonError(401, "unauthorized");
  }
  const user = (req.headers.get("x-cap-user") ?? "").toLowerCase();
  if (user !== "maru" && user !== "ricardo") {
    return jsonError(403, "write_forbidden_for_user", `user=${user || "none"}`);
  }
  return null;
}
__name(guardWrite, "guardWrite");
function readUser(req) {
  return (req.headers.get("x-cap-user") ?? "unknown").toLowerCase();
}
__name(readUser, "readUser");
function jsonError(status, error, detail) {
  return new Response(
    JSON.stringify(detail ? { error, detail } : { error }),
    { status, headers: { "content-type": "application/json" } }
  );
}
__name(jsonError, "jsonError");

// src/schema.ts
var OVERLAY_VERSION = 1;
var OVERLAY_KEY = "overlay";
function emptyOverlay() {
  return {
    version: OVERLAY_VERSION,
    updated_at: (/* @__PURE__ */ new Date(0)).toISOString(),
    updated_by: "system",
    ciclo_patches: {},
    new_ciclos: [],
    item_patches: {},
    active_medicamentos: [],
    audit_log: []
  };
}
__name(emptyOverlay, "emptyOverlay");

// src/index.ts
var AUDIT_CAP = 500;
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
async function loadOverlay(env) {
  const stored = await env.OVERLAY_KV.get(OVERLAY_KEY, "json");
  if (!stored) return emptyOverlay();
  if (stored.version !== OVERLAY_VERSION) {
    return { ...emptyOverlay(), audit_log: stored.audit_log ?? [] };
  }
  return stored;
}
__name(loadOverlay, "loadOverlay");
async function saveOverlay(env, overlay) {
  await env.OVERLAY_KV.put(OVERLAY_KEY, JSON.stringify(overlay));
}
__name(saveOverlay, "saveOverlay");
function stamp(overlay, user, action, target, summary) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const entry = { ts: now, user, action, target, summary };
  return {
    ...overlay,
    updated_at: now,
    updated_by: user,
    audit_log: [...overlay.audit_log, entry].slice(-AUDIT_CAP)
  };
}
__name(stamp, "stamp");
function nonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}
__name(nonEmptyString, "nonEmptyString");
function validateCicloPatch(p) {
  if (!p || typeof p !== "object") return "patch_not_object";
  const allowed = /* @__PURE__ */ new Set([
    "tipo",
    "ronda",
    "fecha_inicio",
    "fecha_fin",
    "estado",
    "motivo_suspension",
    "resultado",
    "fur_registrada",
    "notas",
    "sujeto_principal"
  ]);
  for (const k of Object.keys(p)) {
    if (!allowed.has(k)) return `unknown_field_${k}`;
  }
  return p;
}
__name(validateCicloPatch, "validateCicloPatch");
function validateNewCiclo(c) {
  if (!c || typeof c !== "object") return "ciclo_not_object";
  const o = c;
  if (!nonEmptyString(o.ciclo_id)) return "missing_ciclo_id";
  if (!nonEmptyString(o.tipo)) return "missing_tipo";
  if (!nonEmptyString(o.estado)) return "missing_estado";
  return o;
}
__name(validateNewCiclo, "validateNewCiclo");
function validateItemPatch(p) {
  if (!p || typeof p !== "object") return "patch_not_object";
  const allowed = /* @__PURE__ */ new Set([
    "ciclo_referencia",
    "fecha",
    "sujeto",
    "tipo",
    "anotaciones_humanas",
    "foliculos",
    "valores_laboratorio_extra"
  ]);
  for (const k of Object.keys(p)) {
    if (!allowed.has(k)) return `unknown_field_${k}`;
  }
  return p;
}
__name(validateItemPatch, "validateItemPatch");
function validateActiveMed(m) {
  if (!m || typeof m !== "object") return "med_not_object";
  const o = m;
  if (!nonEmptyString(o.slug)) return "missing_slug";
  if (!nonEmptyString(o.nombre)) return "missing_nombre";
  return o;
}
__name(validateActiveMed, "validateActiveMed");
function validateFoliculos(f) {
  if (f === null) return null;
  if (!f || typeof f !== "object") return "foliculos_not_object";
  return f;
}
__name(validateFoliculos, "validateFoliculos");
function validateLab(l) {
  if (!l || typeof l !== "object") return "lab_not_object";
  const o = l;
  if (!nonEmptyString(o.test)) return "missing_test";
  return o;
}
__name(validateLab, "validateLab");
function parseOp(raw) {
  if (!raw || typeof raw !== "object") return "body_not_object";
  const b = raw;
  const op = b.op;
  switch (op) {
    case "ciclo_patch": {
      if (!nonEmptyString(b.ciclo_id)) return "missing_ciclo_id";
      const patch = validateCicloPatch(b.patch);
      if (typeof patch === "string") return patch;
      return { op, ciclo_id: b.ciclo_id, patch };
    }
    case "ciclo_create": {
      const ciclo = validateNewCiclo(b.ciclo);
      if (typeof ciclo === "string") return ciclo;
      return { op, ciclo };
    }
    case "ciclo_delete": {
      if (!nonEmptyString(b.ciclo_id)) return "missing_ciclo_id";
      return { op, ciclo_id: b.ciclo_id };
    }
    case "item_patch": {
      if (!nonEmptyString(b.client_id)) return "missing_client_id";
      const patch = validateItemPatch(b.patch);
      if (typeof patch === "string") return patch;
      return { op, client_id: b.client_id, patch };
    }
    case "meds_replace": {
      if (!Array.isArray(b.meds)) return "meds_not_array";
      const meds = [];
      for (const m of b.meds) {
        const v = validateActiveMed(m);
        if (typeof v === "string") return v;
        meds.push(v);
      }
      return { op, meds };
    }
    case "foliculos_set": {
      if (!nonEmptyString(b.client_id)) return "missing_client_id";
      const fol = validateFoliculos(b.foliculos);
      if (typeof fol === "string") return fol;
      return { op, client_id: b.client_id, foliculos: fol };
    }
    case "lab_add": {
      if (!nonEmptyString(b.client_id)) return "missing_client_id";
      const lab = validateLab(b.lab);
      if (typeof lab === "string") return lab;
      return { op, client_id: b.client_id, lab };
    }
    case "lab_delete": {
      if (!nonEmptyString(b.client_id)) return "missing_client_id";
      if (typeof b.index !== "number" || b.index < 0) return "bad_index";
      return { op, client_id: b.client_id, index: b.index };
    }
    default:
      return "unknown_op";
  }
}
__name(parseOp, "parseOp");
function applyOp(overlay, op, user) {
  switch (op.op) {
    case "ciclo_patch": {
      const cur = overlay.ciclo_patches[op.ciclo_id] ?? {};
      const merged = { ...cur, ...op.patch };
      const next = {
        ...overlay,
        ciclo_patches: { ...overlay.ciclo_patches, [op.ciclo_id]: merged }
      };
      return stamp(
        next,
        user,
        "ciclo_patch",
        op.ciclo_id,
        `patched fields: ${Object.keys(op.patch).join(", ")}`
      );
    }
    case "ciclo_create": {
      const exists = overlay.new_ciclos.some((c) => c.ciclo_id === op.ciclo.ciclo_id);
      const next = {
        ...overlay,
        new_ciclos: exists ? overlay.new_ciclos.map(
          (c) => c.ciclo_id === op.ciclo.ciclo_id ? op.ciclo : c
        ) : [...overlay.new_ciclos, op.ciclo]
      };
      return stamp(
        next,
        user,
        "ciclo_create",
        op.ciclo.ciclo_id,
        exists ? "re-created (overwrote)" : "created"
      );
    }
    case "ciclo_delete": {
      const next = {
        ...overlay,
        new_ciclos: overlay.new_ciclos.filter((c) => c.ciclo_id !== op.ciclo_id)
      };
      return stamp(next, user, "ciclo_delete", op.ciclo_id, "removed new ciclo");
    }
    case "item_patch": {
      const cur = overlay.item_patches[op.client_id] ?? {};
      const merged = { ...cur, ...op.patch };
      if (op.patch.anotaciones_humanas) {
        merged.anotaciones_humanas = op.patch.anotaciones_humanas;
      }
      const next = {
        ...overlay,
        item_patches: { ...overlay.item_patches, [op.client_id]: merged }
      };
      return stamp(
        next,
        user,
        "item_patch",
        op.client_id,
        `patched fields: ${Object.keys(op.patch).join(", ")}`
      );
    }
    case "meds_replace": {
      const next = { ...overlay, active_medicamentos: op.meds };
      return stamp(
        next,
        user,
        "meds_replace",
        "active_medicamentos",
        `replaced with ${op.meds.length} meds`
      );
    }
    case "foliculos_set": {
      const cur = overlay.item_patches[op.client_id] ?? {};
      const merged = { ...cur, foliculos: op.foliculos };
      const next = {
        ...overlay,
        item_patches: { ...overlay.item_patches, [op.client_id]: merged }
      };
      return stamp(
        next,
        user,
        "foliculos_set",
        op.client_id,
        op.foliculos ? "set foliculos" : "cleared foliculos"
      );
    }
    case "lab_add": {
      const cur = overlay.item_patches[op.client_id] ?? {};
      const existing = cur.valores_laboratorio_extra ?? [];
      const merged = {
        ...cur,
        valores_laboratorio_extra: [...existing, op.lab]
      };
      const next = {
        ...overlay,
        item_patches: { ...overlay.item_patches, [op.client_id]: merged }
      };
      return stamp(
        next,
        user,
        "lab_add",
        op.client_id,
        `added lab ${op.lab.test}`
      );
    }
    case "lab_delete": {
      const cur = overlay.item_patches[op.client_id] ?? {};
      const existing = cur.valores_laboratorio_extra ?? [];
      if (op.index >= existing.length) {
        return stamp(overlay, user, "lab_delete", op.client_id, "index out of range \u2014 no-op");
      }
      const merged = {
        ...cur,
        valores_laboratorio_extra: existing.filter((_, i) => i !== op.index)
      };
      const next = {
        ...overlay,
        item_patches: { ...overlay.item_patches, [op.client_id]: merged }
      };
      return stamp(
        next,
        user,
        "lab_delete",
        op.client_id,
        `removed lab at index ${op.index}`
      );
    }
  }
}
__name(applyOp, "applyOp");
var index_default = {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === "GET" && url.pathname === "/") {
      return jsonResponse({
        worker: "fertilidad-overlay",
        version: OVERLAY_VERSION,
        usage: {
          "GET /overlay": "read current overlay blob",
          "POST /edit": "apply one EditOp; requires x-cap-auth + x-cap-user header"
        }
      });
    }
    if (req.method === "GET" && url.pathname === "/overlay") {
      const overlay = await loadOverlay(env);
      return jsonResponse(overlay);
    }
    if (req.method === "POST" && url.pathname === "/edit") {
      const denied = guardWrite(req, env);
      if (denied) return denied;
      let raw;
      try {
        raw = await req.json();
      } catch {
        return jsonResponse({ error: "invalid_json" }, 400);
      }
      const parsed = parseOp(raw);
      if (typeof parsed === "string") {
        return jsonResponse({ error: parsed }, 400);
      }
      const user = readUser(req);
      const overlay = await loadOverlay(env);
      const next = applyOp(overlay, parsed, user);
      await saveOverlay(env, next);
      return jsonResponse({
        ok: true,
        op: parsed.op,
        updated_at: next.updated_at,
        updated_by: next.updated_by,
        audit_size: next.audit_log.length
      });
    }
    return jsonResponse({ error: "not_found", method: req.method, path: url.pathname }, 404);
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
