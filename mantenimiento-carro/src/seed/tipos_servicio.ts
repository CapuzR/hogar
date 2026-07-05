/**
 * Vocabulario controlado de servicios (PLAN.md §8) + sinonimos ES/EN para el
 * normalizador (texto libre -> key) y `default_interval_*` del Checklist (§ raw).
 *
 * Esta es la UNICA fuente de verdad de los sinonimos: `src/lib/normalize.ts`
 * construye el lexicon desde aqui, y el seed carga estas filas a `tipos_servicio`.
 * Los `key` deben coincidir con los service_type_key usados en data/events.csv.
 */
export type ServiceNature = "routine" | "repair" | "inspection" | "admin" | "other";

export interface TipoServicioSeed {
  key: string;
  labelEs: string;
  systemKey: string;
  nature: ServiceNature;
  synonyms: string[];
  defaultIntervalKm?: number | null;
  defaultIntervalMonths?: number | null;
}

/** Sistemas (system_key -> etiqueta ES) para agrupar gasto por sistema en la UI. */
export const SISTEMAS: Record<string, string> = {
  engine: "Motor",
  transmission: "Caja",
  brakes: "Frenos",
  suspension_steering: "Suspension / Direccion",
  electrical_battery: "Electrico / Bateria",
  cooling: "Refrigeracion / Radiador",
  fuel_system: "Combustible",
  body_paint: "Latoneria / Pintura",
  cleaning_detailing: "Limpieza",
  tires_wheels: "Cauchos",
  hvac: "Aire acondicionado",
  inspections: "General",
};

export const TIPOS_SERVICIO: TipoServicioSeed[] = [
  /* ── engine (Motor) ── */
  {
    key: "oil_change",
    labelEs: "Cambio de aceite",
    systemKey: "engine",
    nature: "routine",
    synonyms: ["cambio de aceite", "aceite de motor", "oil change", "cambio aceite"],
    defaultIntervalKm: 6500,
    defaultIntervalMonths: 6,
  },
  {
    key: "oil_and_filter_change",
    labelEs: "Cambio de aceite y filtro",
    systemKey: "engine",
    nature: "routine",
    synonyms: [
      "aceite y filtro",
      "aceite + filtro",
      "aceite mas filtro",
      "oil and filter",
      "oil & filter",
      "cambio de aceite y filtro",
    ],
    defaultIntervalKm: 6500,
    defaultIntervalMonths: 6,
  },
  {
    key: "air_filter_replacement",
    labelEs: "Cambio de filtro de aire",
    systemKey: "engine",
    nature: "routine",
    synonyms: ["filtro de aire", "air filter", "filtro aire"],
    defaultIntervalKm: 12500,
    defaultIntervalMonths: 12,
  },
  {
    key: "spark_plugs_replacement",
    labelEs: "Cambio de bujias",
    systemKey: "engine",
    nature: "routine",
    synonyms: ["bujias", "bujía", "bujias", "spark plug", "spark plugs"],
    defaultIntervalKm: 40000,
  },
  {
    key: "timing_belt_replacement",
    labelEs: "Cambio de correa de tiempo",
    systemKey: "engine",
    nature: "repair",
    synonyms: [
      "correa de tiempo",
      "correa unica",
      "correa única",
      "timing belt",
      "correa dentada",
      "cadena de tiempo",
    ],
    defaultIntervalKm: 75000,
  },
  {
    key: "engine_tuneup",
    labelEs: "Afinamiento de motor",
    systemKey: "engine",
    nature: "routine",
    synonyms: ["afinamiento", "afinacion", "tune up", "tuneup", "tune-up"],
    defaultIntervalKm: 20000,
  },
  {
    key: "engine_repair_general",
    labelEs: "Reparacion de motor (general)",
    systemKey: "engine",
    nature: "repair",
    synonyms: [
      "reparacion de motor",
      "reparación de motor",
      "reparacion motor",
      "arreglo de motor",
      "engine repair",
      "biselado de pistones",
      "inyectores",
      "bobinas",
      "base de motor",
      "bases de motor",
    ],
  },
  {
    key: "engine_overhaul",
    labelEs: "Reparacion mayor / overhaul de motor",
    systemKey: "engine",
    nature: "repair",
    synonyms: [
      "overhaul",
      "reparacion mayor",
      "reparación mayor",
      "rectificacion",
      "rectificación",
      "anillado",
      "reparacion mayor de motor",
    ],
  },
  {
    key: "cylinder_head_repair",
    labelEs: "Reparacion de culata / empaque",
    systemKey: "engine",
    nature: "repair",
    synonyms: ["culata", "empacadura", "empaque de culata", "cylinder head", "junta de culata"],
  },
  {
    key: "oil_leak_repair",
    labelEs: "Reparacion de fuga de aceite",
    systemKey: "engine",
    nature: "repair",
    synonyms: ["fuga de aceite", "bote de aceite", "oil leak", "estoperas", "reten de aceite"],
  },

  /* ── transmission (Caja) ── */
  {
    key: "transmission_fluid_change",
    labelEs: "Cambio de aceite de caja",
    systemKey: "transmission",
    nature: "routine",
    synonyms: ["aceite de caja", "aceite caja", "transmission fluid", "atf", "liquido de caja"],
    defaultIntervalKm: 40000,
  },
  {
    key: "clutch_replacement",
    labelEs: "Cambio de embrague / croche",
    systemKey: "transmission",
    nature: "repair",
    synonyms: ["embrague", "croche", "clutch", "kit de croche"],
  },
  {
    key: "transmission_repair_general",
    labelEs: "Reparacion de caja (general)",
    systemKey: "transmission",
    nature: "repair",
    synonyms: [
      "reparacion de caja",
      "reparación de caja",
      "caja automatica",
      "caja automática",
      "cuerpo de valvula",
      "cuerpo de válvula",
      "solenoide",
      "solenoides",
      "pare neutro",
      "pareneutro",
      "interruptor de pare",
      "transmission repair",
    ],
  },
  {
    key: "transmission_rebuild",
    labelEs: "Reconstruccion de caja",
    systemKey: "transmission",
    nature: "repair",
    synonyms: ["reconstruccion de caja", "reconstrucción de caja", "rebuild"],
  },
  {
    key: "cv_axle_replacement",
    labelEs: "Cambio de homocinetica / palier",
    systemKey: "transmission",
    nature: "repair",
    synonyms: ["homocinetica", "homocinética", "palier", "cv axle", "junta homocinetica"],
  },

  /* ── brakes (Frenos) ── */
  {
    key: "brake_pads_replacement",
    labelEs: "Cambio de pastillas de freno",
    systemKey: "brakes",
    nature: "routine",
    synonyms: ["pastillas", "pastillas de freno", "brake pads", "pastas de freno"],
    defaultIntervalKm: 20000,
  },
  {
    key: "brake_rotors_replacement",
    labelEs: "Cambio de discos de freno",
    systemKey: "brakes",
    nature: "repair",
    synonyms: ["discos de freno", "rectificado de discos", "rectificar discos", "brake rotors", "brake discs"],
  },
  {
    key: "brake_shoes_replacement",
    labelEs: "Cambio de bandas / zapatas",
    systemKey: "brakes",
    nature: "repair",
    synonyms: ["bandas de freno", "zapatas", "brake shoes"],
  },
  {
    key: "brake_fluid_change",
    labelEs: "Cambio de liquido de frenos",
    systemKey: "brakes",
    nature: "routine",
    synonyms: ["liquido de frenos", "líquido de frenos", "liga de freno", "brake fluid"],
    defaultIntervalMonths: 24,
  },
  {
    key: "brake_caliper_repair",
    labelEs: "Reparacion de caliper",
    systemKey: "brakes",
    nature: "repair",
    synonyms: ["caliper", "cáliper", "mordaza de freno", "brake caliper"],
  },

  /* ── suspension_steering (Suspension / Direccion) ── */
  {
    key: "shock_absorber_replacement",
    labelEs: "Cambio de amortiguadores",
    systemKey: "suspension_steering",
    nature: "repair",
    synonyms: ["amortiguadores", "amortiguador", "shock absorber", "shocks"],
  },
  {
    key: "control_arm_replacement",
    labelEs: "Cambio de mesas / tijeretas",
    systemKey: "suspension_steering",
    nature: "repair",
    synonyms: ["mesas", "tijeretas", "control arm", "brazo de control"],
  },
  {
    key: "ball_joint_replacement",
    labelEs: "Cambio de rotulas",
    systemKey: "suspension_steering",
    nature: "repair",
    synonyms: ["rotulas", "rótulas", "ball joint"],
  },
  {
    key: "tie_rod_replacement",
    labelEs: "Cambio de terminales de direccion",
    systemKey: "suspension_steering",
    nature: "repair",
    synonyms: ["terminales de direccion", "terminales de dirección", "tie rod", "rotula axial"],
  },
  {
    key: "wheel_alignment",
    labelEs: "Alineacion",
    systemKey: "suspension_steering",
    nature: "routine",
    synonyms: ["alineacion", "alineación", "alignment", "alineado"],
    defaultIntervalKm: 10000,
  },
  {
    key: "steering_rack_repair",
    labelEs: "Reparacion de cremallera",
    systemKey: "suspension_steering",
    nature: "repair",
    synonyms: ["cremallera", "steering rack", "caja de direccion"],
  },
  {
    key: "bushings_replacement",
    labelEs: "Cambio de bujes / gomas",
    systemKey: "suspension_steering",
    nature: "repair",
    synonyms: ["bujes", "gomas de aguante", "bushings", "silent blocks", "cauchos de suspension"],
  },

  /* ── electrical_battery (Electrico / Bateria) ── */
  {
    key: "battery_replacement",
    labelEs: "Cambio de bateria",
    systemKey: "electrical_battery",
    nature: "routine",
    synonyms: ["bateria", "batería", "battery", "acumulador"],
    defaultIntervalMonths: 24,
  },
  {
    key: "alternator_repair",
    labelEs: "Reparacion de alternador",
    systemKey: "electrical_battery",
    nature: "repair",
    synonyms: ["alternador", "alternator"],
  },
  {
    key: "starter_repair",
    labelEs: "Reparacion de arranque",
    systemKey: "electrical_battery",
    nature: "repair",
    synonyms: ["arranque", "motor de arranque", "starter", "burro de arranque"],
  },
  {
    key: "fuse_relay_replacement",
    labelEs: "Cambio de fusibles / reles",
    systemKey: "electrical_battery",
    nature: "repair",
    synonyms: ["fusible", "fusibles", "rele", "relé", "reles", "relay", "pila rele"],
  },
  {
    key: "wiring_repair",
    labelEs: "Reparacion de cableado",
    systemKey: "electrical_battery",
    nature: "repair",
    synonyms: ["cableado", "wiring", "arnes", "arnés", "cortocircuito"],
  },
  {
    key: "lights_bulbs_replacement",
    labelEs: "Cambio de bombillos / luces",
    systemKey: "electrical_battery",
    nature: "routine",
    synonyms: ["bombillo", "bombillos", "luces", "faros", "bulb", "headlight", "bombillo aleman"],
  },
  {
    key: "ecu_diagnostics",
    labelEs: "Escaneo / diagnostico ECU",
    systemKey: "electrical_battery",
    nature: "inspection",
    synonyms: ["diagnostico de motor", "diagnóstico", "escaneo", "ecu", "check engine"],
  },

  /* ── cooling (Refrigeracion / Radiador) ── */
  {
    key: "coolant_change",
    labelEs: "Cambio de refrigerante",
    systemKey: "cooling",
    nature: "routine",
    synonyms: ["refrigerante", "coolant", "anticongelante", "liquido refrigerante"],
    defaultIntervalMonths: 18,
  },
  {
    key: "radiator_replacement",
    labelEs: "Cambio de radiador",
    systemKey: "cooling",
    nature: "repair",
    synonyms: ["cambio de radiador", "radiator replacement", "radiador nuevo"],
  },
  {
    key: "radiator_repair",
    labelEs: "Reparacion de radiador",
    systemKey: "cooling",
    nature: "repair",
    synonyms: ["reparacion de radiador", "baqueteo de radiador", "baqueteo", "radiator repair"],
  },
  {
    key: "water_pump_replacement",
    labelEs: "Cambio de bomba de agua",
    systemKey: "cooling",
    nature: "repair",
    synonyms: ["bomba de agua", "bba agua", "water pump"],
  },
  {
    key: "thermostat_replacement",
    labelEs: "Cambio de termostato",
    systemKey: "cooling",
    nature: "repair",
    synonyms: ["termostato", "thermostat"],
  },
  {
    key: "cooling_hose_replacement",
    labelEs: "Cambio de mangueras",
    systemKey: "cooling",
    nature: "repair",
    synonyms: ["mangueras", "manguera de agua", "tubo de agua", "cooling hose"],
  },

  /* ── fuel_system (Combustible) ── */
  {
    key: "fuel_pump_replacement",
    labelEs: "Cambio de bomba de gasolina",
    systemKey: "fuel_system",
    nature: "repair",
    synonyms: ["bomba de gasolina", "bomba de combustible", "fuel pump"],
  },
  {
    key: "fuel_pump_relay_replacement",
    labelEs: "Cambio de pila / rele de la bomba",
    systemKey: "fuel_system",
    nature: "repair",
    synonyms: ["pila de la bomba", "rele de la bomba", "relé de la bomba", "pila rele bomba"],
  },
  {
    key: "fuel_filter_replacement",
    labelEs: "Cambio de filtro de gasolina",
    systemKey: "fuel_system",
    nature: "routine",
    synonyms: ["filtro de gasolina", "filtro de combustible", "fuel filter"],
    defaultIntervalKm: 20000,
  },
  {
    key: "fuel_injector_service",
    labelEs: "Limpieza / cambio de inyectores",
    systemKey: "fuel_system",
    nature: "routine",
    synonyms: ["limpieza de inyectores", "inyectores", "injector", "lavado de inyectores"],
  },
  {
    key: "throttle_body_cleaning",
    labelEs: "Limpieza de cuerpo de aceleracion",
    systemKey: "fuel_system",
    nature: "routine",
    synonyms: ["cuerpo de aceleracion", "cuerpo de aceleración", "throttle body", "mariposa"],
  },

  /* ── body_paint (Latoneria / Pintura) ── */
  {
    key: "bodywork_and_paint",
    labelEs: "Latoneria y pintura",
    systemKey: "body_paint",
    nature: "repair",
    synonyms: ["latoneria", "latonería", "pintura", "bodywork", "paint job", "pintar"],
  },
  {
    key: "dent_repair",
    labelEs: "Reparacion de abolladuras",
    systemKey: "body_paint",
    nature: "repair",
    synonyms: ["abolladura", "abolladuras", "golpe", "dent", "sacabocado"],
  },
  {
    key: "bumper_repair",
    labelEs: "Reparacion de parachoques",
    systemKey: "body_paint",
    nature: "repair",
    synonyms: ["parachoque", "parachoques", "bumper", "paragolpe"],
  },
  {
    key: "windshield_glass_replacement",
    labelEs: "Cambio de parabrisas / vidrios",
    systemKey: "body_paint",
    nature: "repair",
    synonyms: ["parabrisas", "vidrio", "windshield", "glass"],
  },

  /* ── cleaning_detailing (Limpieza) ── */
  {
    key: "car_wash",
    labelEs: "Autolavado",
    systemKey: "cleaning_detailing",
    nature: "routine",
    synonyms: ["autolavado", "lavado", "car wash", "lavada", "lavado de carro"],
  },
  {
    key: "full_detailing",
    labelEs: "Detallado completo / pulitura",
    systemKey: "cleaning_detailing",
    nature: "routine",
    synonyms: ["detallado", "pulitura", "pulido", "detailing", "pulir faros", "restauracion de faros"],
  },
  {
    key: "interior_cleaning",
    labelEs: "Limpieza de interiores",
    systemKey: "cleaning_detailing",
    nature: "routine",
    synonyms: ["limpieza de interiores", "interiores", "interior cleaning", "tapiceria"],
  },
  {
    key: "engine_bay_cleaning",
    labelEs: "Lavado de motor",
    systemKey: "cleaning_detailing",
    nature: "routine",
    synonyms: ["lavado de motor", "engine bay", "limpieza de motor"],
  },

  /* ── tires_wheels (Cauchos) ── */
  {
    key: "tire_replacement",
    labelEs: "Cambio de cauchos",
    systemKey: "tires_wheels",
    nature: "repair",
    synonyms: ["caucho", "cauchos", "neumatico", "neumático", "tire", "llanta"],
    defaultIntervalKm: 50000,
  },
  {
    key: "tire_rotation",
    labelEs: "Rotacion de cauchos",
    systemKey: "tires_wheels",
    nature: "routine",
    synonyms: ["rotacion de cauchos", "rotación de cauchos", "tire rotation"],
    defaultIntervalKm: 10000,
  },
  {
    key: "tire_balancing",
    labelEs: "Balanceo",
    systemKey: "tires_wheels",
    nature: "routine",
    synonyms: ["balanceo", "balancear", "balancing"],
    defaultIntervalKm: 10000,
  },
  {
    key: "flat_tire_repair",
    labelEs: "Reparacion de pinchazo",
    systemKey: "tires_wheels",
    nature: "repair",
    synonyms: ["pinchazo", "reparacion de caucho", "montaje de caucho", "flat tire", "ponchado"],
  },

  /* ── hvac (Aire acondicionado) ── */
  {
    key: "ac_recharge",
    labelEs: "Recarga de gas del aire",
    systemKey: "hvac",
    nature: "routine",
    synonyms: ["recarga de gas", "gas del aire", "ac recharge", "recarga de aire"],
  },
  {
    key: "ac_compressor_repair",
    labelEs: "Reparacion de compresor A/C",
    systemKey: "hvac",
    nature: "repair",
    synonyms: ["compresor de aire", "compresor a/c", "ac compressor"],
  },
  {
    key: "ac_system_repair",
    labelEs: "Reparacion del sistema de A/C",
    systemKey: "hvac",
    nature: "repair",
    synonyms: [
      "aire acondicionado",
      "sistema de a/c",
      "reparacion de aire",
      "evaporador",
      "ac repair",
      "a/c",
    ],
  },

  /* ── inspections (General) ── */
  {
    key: "general_inspection",
    labelEs: "Revision general",
    systemKey: "inspections",
    nature: "inspection",
    synonyms: ["revision general", "revisión general", "chequeo general", "inspection"],
  },
  {
    key: "ecu_diagnostics_scan",
    labelEs: "Scanner / diagnostico",
    systemKey: "inspections",
    nature: "inspection",
    synonyms: ["scanner", "scaner", "diagnostico computarizado"],
  },
  {
    key: "insurance",
    labelEs: "Seguro / poliza",
    systemKey: "inspections",
    nature: "admin",
    synonyms: ["seguro", "poliza", "póliza", "insurance"],
  },
  {
    key: "other_service",
    labelEs: "Otro servicio",
    systemKey: "inspections",
    nature: "other",
    synonyms: ["grua", "grúa", "remolque", "traslado", "escape", "tubo de escape", "propina"],
  },
];

/** key -> tipo, para lookups O(1) en el importador y la API. */
export const TIPO_BY_KEY: Record<string, TipoServicioSeed> = Object.fromEntries(
  TIPOS_SERVICIO.map((t) => [t.key, t]),
);
