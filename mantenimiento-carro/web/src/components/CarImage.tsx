import * as React from "react";
import { Car as CarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Modelo del carro. Intenta cargar `/cars/<slug>.png` (imagen que el usuario deja
 * en web/public/cars/). Si aún no existe, muestra un ícono de carro tintado con el
 * color del vehículo como marcador de posición limpio (no un "imagen rota").
 *
 * Convención de archivos: web/public/cars/optra.png, web/public/cars/clio.png
 * (PNG con fondo transparente, perfil lateral).
 */
export function CarImage({
  slug,
  className,
  accent,
}: {
  slug: string;
  className?: string;
  accent?: string;
}) {
  const [failed, setFailed] = React.useState(false);
  const color =
    accent ??
    (slug === "optra"
      ? "hsl(var(--optra))"
      : slug === "clio"
        ? "hsl(var(--clio))"
        : "hsl(var(--primary))");

  if (failed) {
    return (
      <div className={cn("grid place-items-center", className)} aria-hidden>
        <CarIcon
          className="h-2/3 w-2/3"
          style={{ color, opacity: 0.6 }}
          strokeWidth={1.25}
        />
      </div>
    );
  }

  return (
    <img
      src={`/cars/${slug}.png`}
      alt={`Modelo ${slug}`}
      onError={() => setFailed(true)}
      draggable={false}
      className={cn("h-full w-full object-contain", className)}
    />
  );
}
