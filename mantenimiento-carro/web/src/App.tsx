import { NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  ChevronLeft,
  ClipboardCheck,
  Fuel,
  Home,
  Plus,
  Settings,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStats } from "@/lib/api";
import { usePageTitle } from "@/lib/title";
import { ThemeToggle } from "@/components/ThemeToggle";
import { EventDialog } from "@/components/EventDialog";
import { Button } from "@/components/ui/button";
import { VehiclesPage } from "@/pages/VehiclesPage";
import { VehicleDetailPage } from "@/pages/VehicleDetailPage";
import { EventsPage } from "@/pages/EventsPage";
import { ReviewPage } from "@/pages/ReviewPage";
import { FuelPage } from "@/pages/FuelPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { SettingsPage } from "@/pages/SettingsPage";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  review?: boolean; // muestra el contador de la cola de revisión
}

/** Barra inferior (móvil): 4 pestañas + FAB "+" central. */
const TAB_ITEMS: NavItem[] = [
  { to: "/", label: "Carros", icon: Home, end: true },
  { to: "/eventos", label: "Eventos", icon: Wrench, review: true },
  { to: "/gasolina", label: "Gasolina", icon: Fuel },
  { to: "/ajustes", label: "Ajustes", icon: Settings },
];

/** Sidebar (desktop): más destinos porque hay espacio. */
const SIDEBAR_ITEMS: NavItem[] = [
  { to: "/", label: "Carros", icon: Home, end: true },
  { to: "/eventos", label: "Eventos", icon: Wrench },
  { to: "/gasolina", label: "Gasolina", icon: Fuel },
  { to: "/revision", label: "Revisión", icon: ClipboardCheck, review: true },
  { to: "/reportes", label: "Reportes", icon: BarChart3 },
  { to: "/ajustes", label: "Ajustes", icon: Settings },
];

const TOP_LEVEL = ["/", "/eventos", "/gasolina", "/ajustes", "/revision", "/reportes"];

const ROUTE_TITLES: Record<string, string> = {
  "/": "Mis Carros",
  "/eventos": "Eventos",
  "/gasolina": "Gasolina",
  "/ajustes": "Ajustes",
  "/revision": "Cola de revisión",
  "/reportes": "Reportes",
};

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: stats } = useStats();
  const { title: pageTitle } = usePageTitle();
  const reviewCount = stats?.totals.needsReviewCount ?? 0;

  const path = location.pathname;
  const showBack = !TOP_LEVEL.includes(path);
  const title = pageTitle ?? ROUTE_TITLES[path] ?? "Mantenimiento";

  return (
    <div className="md:flex">
      {/* Sidebar — solo desktop */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-card/40 p-3 md:flex">
        <div className="flex items-center gap-2 px-2 py-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-lg" aria-hidden>
            🚗
          </span>
          <div>
            <div className="text-sm font-bold leading-tight">Mantenimiento</div>
            <div className="text-xs text-muted-foreground">Optra &amp; Clio</div>
          </div>
        </div>

        <EventDialog
          trigger={
            <Button className="my-3 w-full">
              <Plus className="h-4 w-4" /> Nuevo evento
            </Button>
          }
        />

        <nav className="flex flex-col gap-1">
          {SIDEBAR_ITEMS.map((n) => (
            <SidebarLink key={n.to} item={n} badge={n.review ? reviewCount : 0} />
          ))}
        </nav>

        <div className="mt-auto flex items-center justify-between rounded-xl px-2 py-1">
          <span className="text-xs font-medium text-muted-foreground">Tema</span>
          <ThemeToggle />
        </div>
      </aside>

      {/* Columna principal */}
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-1 border-b bg-background/80 px-3 py-2.5 backdrop-blur md:px-6">
          {showBack ? (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="grid h-9 w-9 place-items-center rounded-full text-foreground transition-colors hover:bg-accent"
              aria-label="Atrás"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : (
            <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-lg md:hidden" aria-hidden>
              🚗
            </span>
          )}
          <h1 className="min-w-0 flex-1 truncate text-center text-base font-bold md:text-left md:text-lg">{title}</h1>
          <div className="md:hidden">
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 px-4 pb-24 pt-4 md:px-6 md:pb-10 md:pt-6">
          <div className="w-full max-w-5xl">
            <Routes>
              <Route path="/" element={<VehiclesPage />} />
              <Route path="/carro/:slug" element={<VehicleDetailPage />} />
              <Route path="/eventos" element={<EventsPage />} />
              <Route path="/revision" element={<ReviewPage />} />
              <Route path="/gasolina" element={<FuelPage />} />
              <Route path="/reportes" element={<DashboardPage />} />
              <Route path="/ajustes" element={<SettingsPage />} />
              <Route path="*" element={<VehiclesPage />} />
            </Routes>
          </div>
        </main>
      </div>

      {/* Barra inferior + FAB — solo móvil */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t bg-card/90 px-1 pt-1.5 backdrop-blur md:hidden"
        style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}
      >
        <TabButton item={TAB_ITEMS[0]} />
        <TabButton item={TAB_ITEMS[1]} dot={reviewCount > 0} />

        <div className="flex w-16 shrink-0 items-start justify-center">
          <EventDialog
            trigger={
              <button
                type="button"
                className="-mt-7 grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-background transition active:scale-95"
                aria-label="Nuevo evento"
              >
                <Plus className="h-6 w-6" />
              </button>
            }
          />
        </div>

        <TabButton item={TAB_ITEMS[2]} />
        <TabButton item={TAB_ITEMS[3]} />
      </nav>
    </div>
  );
}

function SidebarLink({ item, badge }: { item: NavItem; badge: number }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )
      }
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      <span className="flex-1">{item.label}</span>
      {badge > 0 && (
        <span className="rounded-full bg-warning/20 px-1.5 py-0.5 text-[11px] font-bold text-warning">{badge}</span>
      )}
    </NavLink>
  );
}

function TabButton({ item, dot }: { item: NavItem; dot?: boolean }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          "relative flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[11px] font-medium transition-colors",
          isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
        )
      }
    >
      <Icon className="h-5 w-5" />
      <span>{item.label}</span>
      {dot && <span className="absolute right-2.5 top-0.5 h-2 w-2 rounded-full bg-warning ring-2 ring-card" />}
    </NavLink>
  );
}
