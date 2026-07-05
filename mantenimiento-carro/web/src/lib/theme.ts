/**
 * Manejo de tema claro/oscuro. El tema efectivo se aplica poniendo/quitando la
 * clase `dark` en <html> (Tailwind darkMode: "class"). El valor persiste en
 * localStorage bajo "theme": "light" | "dark" | "system" (system sigue al SO).
 *
 * Para evitar el "flash" claro→oscuro al cargar, index.html aplica la clase en un
 * script inline ANTES de pintar; este módulo la mantiene sincronizada en runtime.
 */
import * as React from "react";

export type Theme = "light" | "dark" | "system";
const KEY = "theme";

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function getStoredTheme(): Theme {
  const v = (typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null) as Theme | null;
  return v === "light" || v === "dark" || v === "system" ? v : "system";
}

export function resolveTheme(theme: Theme): "light" | "dark" {
  return theme === "system" ? (systemPrefersDark() ? "dark" : "light") : theme;
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", resolveTheme(theme) === "dark");
}

/** Hook de tema: expone el modo guardado, el resuelto (light|dark) y un setter. */
export function useTheme() {
  const [theme, setThemeState] = React.useState<Theme>(() => getStoredTheme());

  React.useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Si el usuario está en "system", seguir los cambios del SO en vivo.
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (getStoredTheme() === "system") applyTheme("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const setTheme = React.useCallback((t: Theme) => {
    try {
      localStorage.setItem(KEY, t);
    } catch {
      /* ignore (modo privado / storage lleno) */
    }
    setThemeState(t);
  }, []);

  return { theme, resolved: resolveTheme(theme), setTheme };
}
