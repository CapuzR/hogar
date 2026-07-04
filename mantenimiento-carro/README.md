# mantenimiento-carro

Ledger de mantenimiento **mecánico** de 2 carros (Optra + Clio). No captura gastos: los **jala/enlaza
desde YNAB**. Cloudflare Worker (Hono) que sirve API JSON en `/api/*` + SPA React (D1 + Drizzle).
Fase 1 construida y verificada.

**Captura por bot:** es el propio endpoint `POST /api/ingest` de la app (skill `car-maintenance`
compartido de Cap & Maruita). No hay worker separado para esto.

## ⚠️ La app todavía NO está movida aquí

La app vive en `C:\Users\capuz\Documents\mantenimiento-carro`. **No la moví** en esta sesión a
propósito: esa carpeta es la raíz del proyecto de Claude Code (y su carpeta de memoria está indexada
por ese path). Moverla ahora rompería esa asociación.

### Para integrarla como `app/` cuando quieras

1. Cierra la sesión de Claude Code abierta en `mantenimiento-carro`.
2. Mueve la carpeta:
   ```powershell
   Move-Item "C:\Users\capuz\Documents\mantenimiento-carro" `
             "C:\Users\capuz\Documents\hogar\mantenimiento-carro\app"
   ```
   (Mismo volumen C: → es un rename instantáneo, no re-instala `node_modules`.)
3. Reabre Claude Code apuntando a `hogar\mantenimiento-carro\app` (o a `hogar`).

`wrangler.jsonc` ya usa `name = "mantenimiento-carro"`, así que sigue deployando al mismo worker.
Root directory para Workers Builds: `mantenimiento-carro/app`.
