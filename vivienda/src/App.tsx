import { useMemo, useState } from "react";
import type { Assumptions } from "./model";
import { defaultAssumptions, runDeterministic, runScenarios } from "./model";
import type { MonteCarloResult } from "./model";
import { runMonteCarlo } from "./model";
import { TabSupuestos } from "./ui/TabSupuestos";
import { TabEscenarios } from "./ui/TabEscenarios";
import { TabMonteCarlo } from "./ui/TabMonteCarlo";
import { TabSensibilidad } from "./ui/TabSensibilidad";
import { TabLiquidez } from "./ui/TabLiquidez";
import { TabProsContras } from "./ui/TabProsContras";
import { TabVeredicto } from "./ui/TabVeredicto";

const TABS = [
  { id: "supuestos", label: "1 · Supuestos" },
  { id: "escenarios", label: "2 · Escenarios" },
  { id: "montecarlo", label: "3 · Monte Carlo" },
  { id: "sensibilidad", label: "4 · Sensibilidad" },
  { id: "liquidez", label: "5 · Liquidez" },
  { id: "proscontras", label: "6 · Pros/Contras" },
  { id: "veredicto", label: "7 · Veredicto" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function App() {
  const [a, setA] = useState<Assumptions>(() => defaultAssumptions());
  const [tab, setTab] = useState<TabId>("supuestos");
  const [mc, setMc] = useState<MonteCarloResult | null>(null);
  const [mcRunning, setMcRunning] = useState(false);
  const [mcStamp, setMcStamp] = useState<string>("");

  const patch = (p: Partial<Assumptions>) => {
    setA((prev) => ({ ...prev, ...p }));
    setMc(null); // los supuestos cambiaron: MC previo queda obsoleto
  };

  const deterministic = useMemo(() => runDeterministic(a), [a]);
  const scenarios = useMemo(() => runScenarios(a), [a]);

  const runMC = () => {
    setMcRunning(true);
    // permite renderizar el spinner antes del cálculo pesado
    setTimeout(() => {
      const res = runMonteCarlo(a);
      setMc(res);
      setMcStamp(`${res.paths.toLocaleString()} paths · horizonte ${res.horizonYears}a`);
      setMcRunning(false);
    }, 20);
  };

  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-line bg-panel/60 backdrop-blur px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <h1 className="text-base font-semibold text-slate-100">
              Rent vs Buy — Caracas <span className="text-muted font-normal">· modelo feo y honesto</span>
            </h1>
            <div className="text-[11px] text-muted">
              $70k cash · sin hipoteca · founder + bebé · <span className="text-slate-300">jul 2026</span>
            </div>
          </div>
          <nav className="flex gap-1 mt-3 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={
                  "px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition-colors " +
                  (tab === t.id ? "bg-accent text-white" : "text-slate-300 hover:bg-line/50")
                }
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-5">
        {tab === "supuestos" && <TabSupuestos a={a} patch={patch} deterministic={deterministic} />}
        {tab === "escenarios" && <TabEscenarios scenarios={scenarios} a={a} />}
        {tab === "montecarlo" && (
          <TabMonteCarlo a={a} mc={mc} running={mcRunning} onRun={runMC} stamp={mcStamp} />
        )}
        {tab === "sensibilidad" && <TabSensibilidad a={a} />}
        {tab === "liquidez" && <TabLiquidez deterministic={deterministic} a={a} />}
        {tab === "proscontras" && <TabProsContras />}
        {tab === "veredicto" && <TabVeredicto a={a} deterministic={deterministic} mc={mc} onRunMC={runMC} mcRunning={mcRunning} />}
      </main>

      <footer className="border-t border-line px-4 sm:px-6 py-3 text-[10px] text-muted">
        <div className="max-w-6xl mx-auto">
          Modelo determinista + Monte Carlo · parámetros en <code>assumptions.json</code> · fuentes en{" "}
          <code>RESEARCH.md</code>. Números marcados <span className="text-rose-400">adivinado</span> son
          especulación del autor. No es asesoría financiera.
        </div>
      </footer>
    </div>
  );
}
