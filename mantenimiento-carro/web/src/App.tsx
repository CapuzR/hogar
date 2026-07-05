import { NavLink, Route, Routes } from "react-router-dom";
import { Car, ClipboardCheck, Fuel, LayoutDashboard, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStats } from "@/lib/api";
import { DashboardPage } from "@/pages/DashboardPage";
import { EventsPage } from "@/pages/EventsPage";
import { ReviewPage } from "@/pages/ReviewPage";
import { CarsPage } from "@/pages/CarsPage";
import { FuelPage } from "@/pages/FuelPage";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/eventos", label: "Mantenimiento", icon: Wrench, end: false },
  { to: "/revision", label: "Cola de revisión", icon: ClipboardCheck, end: false },
  { to: "/carros", label: "Carros", icon: Car, end: false },
  { to: "/gasolina", label: "Gasolina", icon: Fuel, end: false },
];

export default function App() {
  const { data: stats } = useStats();
  const reviewCount = stats?.totals.needsReviewCount ?? 0;

  return (
    <div className="min-h-full">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:flex-row">
        {/* Sidebar */}
        <aside className="md:w-56 md:shrink-0">
          <div className="flex items-center gap-2 px-2 pb-4">
            <span className="text-2xl">🚗</span>
            <div>
              <div className="text-sm font-bold leading-tight">Mantenimiento</div>
              <div className="text-xs text-muted-foreground">Optra & Clio</div>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto md:flex-col">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )
                }
              >
                <n.icon className="h-4 w-4" />
                <span>{n.label}</span>
                {n.to === "/revision" && reviewCount > 0 && (
                  <span className="ml-auto rounded-full bg-amber-400/90 px-1.5 py-0.5 text-[11px] font-bold text-amber-950">
                    {reviewCount}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Contenido */}
        <main className="min-w-0 flex-1">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/eventos" element={<EventsPage />} />
            <Route path="/revision" element={<ReviewPage />} />
            <Route path="/carros" element={<CarsPage />} />
            <Route path="/gasolina" element={<FuelPage />} />
            <Route path="*" element={<DashboardPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
