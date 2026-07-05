/**
 * Semilla de talleres / vendors (PLAN.md §11.0).
 * `aliases` incluye las variantes crudas vistas en WhatsApp/YNAB/Notion para
 * que el importador resuelva vendor_name -> taller por match (case-insensitive).
 * Yirmen Pachecos (Multiservicios Pachecos) es el taller principal.
 */
export interface TallerSeed {
  id: string;
  name: string;
  aliases: string[];
  vendorType:
    | "dealer"
    | "independent_shop"
    | "chain"
    | "parts_store"
    | "mobile"
    | "diy";
  location?: string;
  notes?: string;
}

export const TALLERES: TallerSeed[] = [
  {
    id: "shop_pachecos",
    name: "Multiservicios Pachecos (Yirmen)",
    aliases: ["Yirmen Pachecos", "Multiservicios Pachecos", "Pachecos", "Yirmen"],
    vendorType: "independent_shop",
    notes: "Taller principal (mecanica general).",
  },
  {
    id: "shop_yeiker",
    name: "Latoneria y Pintura Yeiker",
    aliases: ["Latonería y Pintura - Yeiker", "Latoneria y Pintura Yeiker", "Yeiker"],
    vendorType: "independent_shop",
    notes: "Latoneria y pintura.",
  },
  {
    id: "shop_carlos_azuaje_ac",
    name: "Carlos Azuaje A/C",
    aliases: ["Carlos Azuaje A/C", "Carlos Azuaje", "Azuaje"],
    vendorType: "independent_shop",
    notes: "Aire acondicionado.",
  },
  {
    id: "shop_barutech",
    name: "Multiservicios Barutech",
    aliases: ["Multiservicios Barutech", "Barutech"],
    vendorType: "independent_shop",
  },
  {
    id: "parts_la_guairita",
    name: "Multirepuestos La Guairita",
    aliases: ["Multirepuestos La Guairita", "La Guairita"],
    vendorType: "parts_store",
  },
  {
    id: "parts_casa_repuestos",
    name: "Casa Repuestos Varios",
    aliases: ["Casa Repuestos Varios"],
    vendorType: "parts_store",
  },
  {
    id: "parts_duncan",
    name: "Duncan (baterias)",
    aliases: ["Duncan"],
    vendorType: "parts_store",
    notes: "Baterias.",
  },
  {
    id: "tire_cauchera_baruta",
    name: "Cauchera Baruta",
    aliases: ["Cauchera Baruta", "Alineación Baruta", "Alineacion Baruta"],
    vendorType: "independent_shop",
    notes: "Cauchos y alineacion.",
  },
  {
    id: "tire_cauchera_la_boyera",
    name: "Cauchera La Boyera",
    aliases: ["Cauchera La Boyera", "La Boyera"],
    vendorType: "independent_shop",
    notes: "Cauchos / escape.",
  },
  {
    id: "tire_cauchera_temporal",
    name: "Cauchera (temporal)",
    aliases: ["Cauchera TEMPORAL", "Cauchera Temporal"],
    vendorType: "independent_shop",
    notes: "Vendor temporal / no confirmado.",
  },
  {
    id: "wash_piedra_azul",
    name: "Autolavado Piedra Azul",
    aliases: ["Autolavado Piedra Azul", "Piedra Azul"],
    vendorType: "chain",
    notes: "Autolavado.",
  },
  {
    id: "mobile_gruas",
    name: "Gruas (remolque)",
    aliases: ["Gruas", "Grúas", "Grua", "Grúa"],
    vendorType: "mobile",
    notes: "Servicio de grua / remolque.",
  },
  {
    id: "mobile_transporte_raudo",
    name: "Transporte Raudo",
    aliases: ["Transporte Raudo"],
    vendorType: "mobile",
    notes: "Cauchos a domicilio / traslado.",
  },
  {
    id: "shop_ferdoma",
    name: "Ferdoma",
    aliases: ["Ferdoma"],
    vendorType: "independent_shop",
    notes: "Sin detalle (memo generico).",
  },
  {
    id: "fuel_bomba_trinidad",
    name: "Bomba Gasolina Trinidad",
    aliases: ["Bomba Gasolina Trinidad", "Bomba de Gasolina Trinidad", "La Trinidad"],
    vendorType: "chain",
    location: "La Trinidad",
    notes: "Bomba de gasolina (tambien vendio plumillas).",
  },
];

/** Mapa alias/nombre (normalizado) -> taller id, para resolver vendor_name. */
export const TALLER_ID_BY_ALIAS: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  const norm = (s: string) => s.trim().toLowerCase();
  for (const t of TALLERES) {
    map[norm(t.name)] = t.id;
    for (const a of t.aliases) map[norm(a)] = t.id;
  }
  return map;
})();
