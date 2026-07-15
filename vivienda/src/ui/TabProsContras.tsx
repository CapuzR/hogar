import { STRAT_COLORS } from "./format";

interface Row {
  id: string;
  label: string;
  pros: string[];
  contras: string[];
}

const ROWS: Row[] = [
  {
    id: "A",
    label: "A · Comprar-para-vivir (corridor)",
    pros: [
      "Mayor patrimonio esperado SI reinviertes el ahorro con disciplina",
      "Techo sobre tu cabeza: estabilidad familiar con bebé",
      "Sin riesgo de que te suban la renta o te saquen",
      "Forcing function de ahorro (no pagas renta Solar)",
    ],
    contras: [
      "Vives en corridor, no en el Solar que quieres (−$700/mes de calidad)",
      "Runway ~0 por años: capital atrapado justo cuando el startup lo puede necesitar",
      "Iliquidez: 6–12 meses para vender, −10% haircut",
      "Riesgo jurisdiccional (jump) cae 100% sobre el apto",
      "La 'victoria' depende de invertir $1,274/mes 10 años sin fallar",
    ],
  },
  {
    id: "B",
    label: "B · Alquilar Solar + portafolio (65% cripto)",
    pros: [
      "100% líquido y portátil: metes plata a la empresa o te vas del país sin fricción",
      "Vives en el Solar (mejor calidad de vida ya)",
      "Cola derecha gorda: si cripto vuela, superas a A ampliamente",
      "Cero riesgo de landlord / expropiación de inmueble",
    ],
    contras: [
      "Menor patrimonio esperado (gana solo ~30% de las veces en modo decisión-de-vida)",
      "Drawdowns brutales: −45%+ probable, −70/90% posible en cripto",
      "Renta Solar sale del ingreso todos los meses (no del portafolio)",
      "65% cripto BTC-ETH 0.85 = una sola apuesta, no diversificación",
      "Carga mental: aguantar un −60% sin vender es difícil",
    ],
  },
  {
    id: "C1",
    label: "C1 · Rentvesting (compras corridor, alquilas)",
    pros: [
      "Vives en Solar y eres dueño de un activo",
      "Ingreso pasivo (cuando el inquilino paga)",
    ],
    contras: [
      "Dominado en casi todos los escenarios: el spread renta corridor − Solar es negativo",
      "Riesgo landlord real: SUNAVI, desalojo casi imposible, año de renta perdido",
      "Doble exposición: iliquidez del apto + volatilidad del lateral",
      "Carga mental de ser arrendador en Caracas",
    ],
  },
  {
    id: "C2",
    label: "C2 · Compra diferida (portafolio → comprar en N años)",
    pros: [
      "Capturas crecimiento del portafolio primero, luego fijas en inmueble",
      "Flexibilidad: si el startup despega, no compras y sigues líquido",
      "Buen compromiso: 2º mejor patrimonio esperado en base",
    ],
    contras: [
      "Timing risk: si cripto cae justo antes de comprar, compras poco",
      "Sigues pagando renta Solar mientras esperas",
      "Terminas en corridor igual (downgrade diferido)",
    ],
  },
  {
    id: "D",
    label: "D · All-stables / T-bills",
    pros: [
      "Cero drawdown nominal, 100% líquido",
      "Duermes tranquilo; runway estable",
    ],
    contras: [
      "Retorno real ~0 tras inflación: no construyes patrimonio",
      "Pierde contra casi todo en horizontes largos",
    ],
  },
  {
    id: "E",
    label: "E · 60/40 boring (SPX/T-bills)",
    pros: [
      "Diversificación real, líquido y portátil",
      "Drawdowns manejables (~−6% mediana), sin ruina",
      "Casi empata a B en mediana con MUCHO menos riesgo",
    ],
    contras: [
      "Sin la cola derecha de cripto (no 'te haces rico')",
      "Menor patrimonio esperado que A en modo decisión-de-vida",
    ],
  },
];

export function TabProsContras() {
  return (
    <div>
      <p className="text-xs text-muted mb-4">
        Financiero <b>y</b> no-financiero. Un modelo honesto reconoce que "vivir en el Solar", "poder irme del país" y
        "no ser landlord en Caracas" son valores reales que no salen en el IRR.
      </p>
      <div className="grid md:grid-cols-2 gap-3">
        {ROWS.map((r) => (
          <div key={r.id} className="rounded-lg border border-line bg-panel p-3.5">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: STRAT_COLORS[r.id] }} />
              <h3 className="text-sm font-semibold text-slate-100">{r.label}</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] uppercase text-emerald-400 mb-1">Pros</div>
                <ul className="space-y-1">
                  {r.pros.map((p, i) => (
                    <li key={i} className="text-[11px] text-slate-300 leading-snug flex gap-1"><span className="text-emerald-400">+</span>{p}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-[10px] uppercase text-rose-400 mb-1">Contras</div>
                <ul className="space-y-1">
                  {r.contras.map((c, i) => (
                    <li key={i} className="text-[11px] text-slate-300 leading-snug flex gap-1"><span className="text-rose-400">−</span>{c}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
