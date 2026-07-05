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
var SUJETO_OPTIONS = [
  { name: "Maru", color: "pink" },
  { name: "Ricardo", color: "blue" },
  { name: "Ambos", color: "purple" },
  { name: "Desconocido", color: "gray" }
];
var CONFIANZA_OPTIONS = [
  { name: "cierta", color: "green" },
  { name: "inferida", color: "yellow" },
  { name: "desconocida", color: "gray" }
];
var CICLO_TIPO_OPTIONS = [
  { name: "IAH", color: "blue" },
  { name: "FIV", color: "purple" },
  { name: "Embarazo espont\xE1neo", color: "pink" },
  { name: "Natural", color: "green" },
  { name: "Otro", color: "gray" }
];
var CICLO_ESTADO_OPTIONS = [
  { name: "activo", color: "green" },
  { name: "suspendido", color: "yellow" },
  { name: "completado-sin-embarazo", color: "gray" },
  { name: "completado-con-embarazo", color: "pink" },
  { name: "completado-sin-embarazo-viable", color: "red" },
  { name: "desconocido", color: "default" }
];
var SESION_TIPO_OPTIONS = [
  "Consulta",
  "Examen de sangre",
  "Seguimiento IVF",
  "Seguimiento IAH",
  "Ecograf\xEDa",
  "Procedimiento",
  "Informe m\xE9dico",
  "Receta",
  "Factura",
  "Presupuesto",
  "Orden de laboratorio",
  "Orden de imagen",
  "Orden de procedimiento",
  "Orden",
  "Evaluaci\xF3n preoperatoria",
  "EKG",
  "Nota cl\xEDnica",
  "Otro"
].map((n) => ({ name: n }));
var SOURCE_TYPE_OPTIONS = [
  { name: "pdf-escaneado" },
  { name: "pdf-lab" },
  { name: "pdf-texto" },
  { name: "grabacion-transcripcion" },
  { name: "imagen" },
  { name: "otro" }
];
var MED_VIA_OPTIONS = [
  "oral",
  "sublingual",
  "vaginal",
  "subcut\xE1neo",
  "intramuscular",
  "intravenoso",
  "t\xF3pica",
  "otro"
].map((n) => ({ name: n }));
var MED_ESTADO_OPTIONS = [
  { name: "activo", color: "green" },
  { name: "hist\xF3rico", color: "gray" },
  { name: "propuesto", color: "yellow" },
  { name: "desconocido", color: "default" }
];
var OUT_OF_RANGE_OPTIONS = [
  { name: "alto", color: "red" },
  { name: "bajo", color: "yellow" },
  { name: "dentro", color: "green" },
  { name: "no-aplica", color: "gray" }
];
var index_default = {
  async fetch(req, env) {
    const denied = guardAuth(req, env);
    if (denied) return denied;
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
        worker: "init-notion-fertilidad-schema",
        usage: "POST / with JSON body { parent_page_id: string }",
        notes: [
          "parent_page_id = ID de 32-char hex de la p\xE1gina 'Fertilidad' (dentro de 'Cap Data' en Notion).",
          "La integraci\xF3n 'Cap Tools' (misma que YNAB) debe estar agregada a esa p\xE1gina v\xEDa \u22EF \u2192 Connections.",
          "Crea 4 DBs: Ciclos, Sesiones, Valores Lab, Medicamentos."
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
      return jsonResponse({ error: "missing_parent_page_id" }, 400);
    }
    try {
      const ciclos = await createDatabase(
        env.NOTION_TOKEN,
        parentPageId,
        "Fertilidad \xB7 Ciclos",
        {
          Nombre: { title: {} },
          "Ciclo ID": { rich_text: {} },
          Tipo: { select: { options: CICLO_TIPO_OPTIONS } },
          "Ronda #": { number: { format: "number" } },
          "Fecha inicio": { date: {} },
          "Fecha fin": { date: {} },
          Estado: { select: { options: CICLO_ESTADO_OPTIONS } },
          "Motivo suspensi\xF3n": { rich_text: {} },
          Resultado: { rich_text: {} },
          "Sujeto principal": { select: { options: SUJETO_OPTIONS } },
          "FUR registrada": { date: {} },
          Notas: { rich_text: {} }
        }
      );
      const valoresLab = await createDatabase(
        env.NOTION_TOKEN,
        parentPageId,
        "Fertilidad \xB7 Valores Lab",
        {
          Nombre: { title: {} },
          Test: { rich_text: {} },
          Valor: { rich_text: {} },
          "Valor num\xE9rico": { number: { format: "number" } },
          Unidad: { rich_text: {} },
          "Rango bajo": { number: { format: "number" } },
          "Rango alto": { number: { format: "number" } },
          "Out of range": { select: { options: OUT_OF_RANGE_OPTIONS } },
          Fecha: { date: {} },
          Sujeto: { select: { options: SUJETO_OPTIONS } },
          Confianza: { select: { options: CONFIANZA_OPTIONS } },
          Notas: { rich_text: {} },
          P\u00E1gina: { rich_text: {} },
          "Client ID": { rich_text: {} }
        }
      );
      const medicamentos = await createDatabase(
        env.NOTION_TOKEN,
        parentPageId,
        "Fertilidad \xB7 Medicamentos",
        {
          Nombre: { title: {} },
          Dosis: { rich_text: {} },
          Frecuencia: { rich_text: {} },
          V\u00EDa: { select: { options: MED_VIA_OPTIONS } },
          "Fecha inicio": { date: {} },
          "Fecha fin": { date: {} },
          Estado: { select: { options: MED_ESTADO_OPTIONS } },
          Sujeto: { select: { options: SUJETO_OPTIONS } },
          Confianza: { select: { options: CONFIANZA_OPTIONS } },
          Notas: { rich_text: {} },
          "Client ID": { rich_text: {} }
        }
      );
      const sesiones = await createDatabase(
        env.NOTION_TOKEN,
        parentPageId,
        "Fertilidad \xB7 Sesiones",
        {
          Nombre: { title: {} },
          "Client ID": { rich_text: {} },
          Fecha: { date: {} },
          "Confianza fecha": { select: { options: CONFIANZA_OPTIONS } },
          Tipo: { select: { options: SESION_TIPO_OPTIONS } },
          Sujeto: { select: { options: SUJETO_OPTIONS } },
          Participantes: { multi_select: {} },
          Ciclo: {
            relation: { database_id: ciclos.id, single_property: {} }
          },
          "Valores Lab": {
            relation: { database_id: valoresLab.id, single_property: {} }
          },
          Medicamentos: {
            relation: { database_id: medicamentos.id, single_property: {} }
          },
          "Source type": { select: { options: SOURCE_TYPE_OPTIONS } },
          "Archivo original": { rich_text: {} },
          "Archivo split": { rich_text: {} },
          "P\xE1gina en original": { rich_text: {} },
          Resumen: { rich_text: {} },
          "Descripci\xF3n larga": { rich_text: {} },
          "Hallazgos clave": { rich_text: {} },
          "Pr\xF3ximos pasos": { rich_text: {} },
          "Notas de incertidumbre": { rich_text: {} },
          "Citas literales JSON": { rich_text: {} }
        }
      );
      return jsonResponse({
        created: {
          ciclos_db_id: ciclos.id,
          sesiones_db_id: sesiones.id,
          valores_lab_db_id: valoresLab.id,
          medicamentos_db_id: medicamentos.id
        },
        urls: {
          ciclos: ciclos.url,
          sesiones: sesiones.url,
          valores_lab: valoresLab.url,
          medicamentos: medicamentos.url
        },
        next_steps: [
          "Guard\xE1 estos IDs en los secretos de los workers de upsert:",
          `  echo '${ciclos.id}'        | npx wrangler secret put NOTION_CICLOS_DB_ID`,
          `  echo '${sesiones.id}'      | npx wrangler secret put NOTION_SESIONES_DB_ID`,
          `  echo '${valoresLab.id}'    | npx wrangler secret put NOTION_VALORES_LAB_DB_ID`,
          `  echo '${medicamentos.id}'  | npx wrangler secret put NOTION_MEDICAMENTOS_DB_ID`,
          "Tambi\xE9n configur\xE1 NOTION_TOKEN en cada worker de upsert (mismo token)."
        ]
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
