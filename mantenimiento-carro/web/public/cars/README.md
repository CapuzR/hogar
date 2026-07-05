# Imágenes de los carros

Deja aquí el **modelo** de cada carro. La app las carga por convención de nombre:

| Archivo | Carro |
|---|---|
| `optra.png` | Chevrolet Optra 2011 (negro) |
| `clio.png` | Renault Clio 2008 (azul) |

**Formato ideal:** PNG con **fondo transparente**, **perfil lateral**, ~1000px de ancho.
Si el carro mira hacia la derecha no importa: se puede reflejar por CSS.

Mientras un archivo no exista, la app muestra un ícono de carro tintado con el
color del vehículo (ver `web/src/components/CarImage.tsx`). Apenas dejes el `.png`
aquí, aparece automáticamente — no hay que tocar código.
