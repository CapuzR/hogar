/**
 * Semilla de vehiculos (PLAN.md §1 — ficha de vehiculos).
 * Ambos automaticos. Optra 2011 (segun titulo). Odometros pendientes.
 * Estos IDs son la convencion que usan el importador y la API.
 */
export interface VehiculoSeed {
  id: string;
  slug: string;
  nickname: string | null;
  make: string;
  model: string;
  year: number;
  trim: string;
  engine: string;
  transmissionType: "automatic" | "manual";
  oilSpec: string;
  plate: string;
  color: string;
  vin: string | null;
  ownerName: string;
  currentOdometer: number | null;
}

export const VEHICULOS: VehiculoSeed[] = [
  {
    id: "car_optra_2011",
    slug: "optra",
    nickname: "el negro",
    make: "Chevrolet",
    model: "Optra",
    year: 2011,
    trim: "1.8L Advance",
    engine: "1.8L I4",
    transmissionType: "automatic",
    oilSpec: "15W-40 sintetico",
    plate: "AC374GA",
    color: "Negro",
    vin: null,
    ownerName: "Ruben Jose Anzart Arasme",
    currentOdometer: null, // pendiente: el usuario baja a mirar el tablero
  },
  {
    id: "car_clio_2008",
    slug: "clio",
    nickname: "el azul",
    make: "Renault",
    model: "Clio",
    year: 2008,
    trim: "1.6L Hatchback",
    engine: "1.6L I4",
    transmissionType: "automatic",
    oilSpec: "15W-40 semi-sintetico",
    plate: "AHD31V",
    color: "Azul",
    vin: null,
    ownerName: "Maria Elena Alvarez Bermudez",
    currentOdometer: null,
  },
];

/** slug -> id (para resolver el carro en el importador y la ingesta). */
export const VEHICULO_ID_BY_SLUG: Record<string, string> = Object.fromEntries(
  VEHICULOS.map((v) => [v.slug, v.id]),
);
