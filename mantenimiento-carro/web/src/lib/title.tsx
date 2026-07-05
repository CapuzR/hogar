/**
 * Título de la barra superior manejado por contexto: cada página puede fijar el
 * título del app-bar (p. ej. el detalle de un carro pone el nombre del carro).
 * El shell lee este contexto y, si ninguna página fijó título, cae al mapa de rutas.
 */
import * as React from "react";

interface TitleCtx {
  title: string | null;
  setTitle: (t: string | null) => void;
}

const Ctx = React.createContext<TitleCtx>({ title: null, setTitle: () => {} });

export function TitleProvider({ children }: { children: React.ReactNode }) {
  const [title, setTitle] = React.useState<string | null>(null);
  const value = React.useMemo(() => ({ title, setTitle }), [title]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePageTitle(): TitleCtx {
  return React.useContext(Ctx);
}

/** Fija el título del app-bar mientras la página esté montada. */
export function useSetTitle(title: string | null): void {
  const { setTitle } = usePageTitle();
  React.useEffect(() => {
    setTitle(title);
    return () => setTitle(null);
  }, [title, setTitle]);
}
