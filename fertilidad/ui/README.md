# fertilidad/ui — `emb-maru-capu` (Cloudflare Pages)

Proyecto Pages `emb-maru-capu.pages.dev`, actualmente **sin conexión Git** (deploy manual/directo).
Probable UI del proceso de fertilidad que creías perdido.

## Cómo recuperar el código antes de que se pierda

El source de un Pages sin Git no se descarga desde el dashboard. Opciones:

1. **Bajar el build ya desplegado** (HTML/JS/CSS compilado) para al menos conservarlo:
   ```
   # navega el sitio y guarda assets, o usa wget/httrack contra emb-maru-capu.pages.dev
   ```
   Esto recupera el **build**, no el fuente original.
2. **Buscar el fuente en disco**: revisa `~/Documents`, `temp/`, WSL (`DESKTOP-E12CJVO`) por la carpeta
   del proyecto (Vite/React?). Si aparece, muévelo aquí y conéctalo a Git.
3. Si no hay fuente: reconstruir la UI aquí desde cero cuando toque.

Una vez tengas el fuente aquí, conéctalo a Pages con Git (build watch path `fertilidad/ui/*`).

> Nota: `emb` sugiere "embarazo" — confirma si este Pages es de fertilidad o del proyecto embarazo
> que arranca la próxima semana; si es lo segundo, muévelo a [`../../embarazo/`](../../embarazo/).
