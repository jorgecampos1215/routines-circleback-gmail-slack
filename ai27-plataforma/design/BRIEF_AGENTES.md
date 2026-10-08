# Brief: convertir pantallas .dc.html a React (proyecto ai27-plataforma)

Proyecto: /home/user/routines-circleback-gmail-slack/ai27-plataforma (Vite + React 19 + TS + react-router-dom v7 HashRouter + recharts instalado).
Diseño fuente: design/fuente/<Nombre>.dc.html (marcado + estilos + datos + lógica en `class Component` / `renderVals()`).
Referencia visual: design/capturas/NN_<Nombre>.png (puedes abrirla con Read para ver la imagen) y design/html/<Nombre>.html (HTML estático renderizado).
Contexto funcional: design/ESPECIFICACION.md.

## Formato .dc.html
- `{{expr}}` = valor de renderVals(); `<sc-for list="{{xs}}" as="x">` = map; `<sc-if value="{{cond}}">` = condicional.
- `onClick="{{fn}}"` = handler. `style="{{s}}"` = string CSS dinámico.
- `<dc-import name="Nav" active="..."/>` = sidebar → usa el componente `Shell`.
- `<helmet><style>` = CSS de la pantalla.

## Reglas de conversión (OBLIGATORIAS)
1. Cada pantalla = `src/pages/<Nombre>.tsx` con `export default function <Nombre>()`. Reemplaza el placeholder.
2. Fidelidad pixel a pixel: conserva TODOS los textos, cifras, colores, SVGs, estructura y estilos inline exactos del .dc.html.
   - Estilos inline: usa `style={sx('...')}` con el string CSS original tal cual (`import { sx } from '../lib/sx'`). No reescribas a Tailwind.
   - CSS del <helmet>: cópialo en una constante `const CSS = \`...\`` SIN la regla `body{...}`, y pásalo a `<Shell active="..." css={CSS}>`. Pantallas sin Nav (Flujo, CotizacionPDF, CustodioMovil, PortalColaborador si aplica) renderizan su propio wrapper con `<style>{CSS}</style>` dentro.
   - `<Shell>` (src/components/Shell.tsx) ya pinta el wrapper `div` flex + sidebar + `<main>` con el estilo estándar `flex:999 1 560px;min-width:0;padding:28px 32px 48px;box-sizing:border-box;display:flex;flex-direction:column;gap:24px`. Si el `<main>` de tu pantalla tiene otro estilo, pásalo en `mainStyle="..."`. Revisa que el wrapper del .dc.html coincida con el de Shell; si difiere, ajusta con mainStyle o arma el wrapper a mano con `<Nav active>`.
   - Atributos SVG en camelCase (strokeWidth, strokeLinecap, fillOpacity, textAnchor, etc.). `class`→`className`, `for`→`htmlFor`, inputs con `value` → `defaultValue` (salvo que sean controlados).
3. Lógica: porta renderVals() a `useState` + valores derivados. Todas las interacciones del diseño deben funcionar (tabs, filtros, steppers, sliders, botones aceptar/descartar, etc.).
4. Navegación: los `href="X.dc.html"` se vuelven `<Link to={ROUTES.X}>` (`import { Link } from 'react-router-dom'`, `import { ROUTES } from '../lib/routes'`), conservando estilo/clase. `useNavigate` para botones que naveguen.
5. Estado compartido entre pantallas: `src/lib/store.ts` (`useStore`, `actions`): vacaciones (portal → RH), servicios creados (cotizador → servicios), decisiones IA (asignación). Úsalo donde aplique; puedes agregar campos/acciones si lo necesitas, sin romper lo existente.
6. Datos: usa los datos de ejemplo del renderVals() tal cual (son los que se ven en el diseño). `src/data/seed.ts` tiene volúmenes (400 custodios, 600 unidades, 300 servicios, 25 clientes) por si una tabla/filtro necesita más filas; `src/lib/telemetria.ts` tiene el adaptador Samsara/Ruptela simulado (útil en Monitoreo).
7. No edites archivos compartidos (App.tsx, Shell, Nav, sx, routes) salvo que sea imprescindible; si lo haces, que sea aditivo y menciónalo.
8. Verifica: `npx tsc --noEmit` sin errores en tus archivos. Después levanta `npx vite --port <PUERTO_ASIGNADO>` en background, toma screenshot con Playwright (chromium en /opt/pw-browsers; `const { chromium } = require('playwright')` — si no está instalado usa `npx -y playwright@1.56.1` o instala playwright-core en un dir del scratchpad, NO lo agregues al package.json del proyecto) a 1440px de ancho de `http://localhost:<PUERTO>/#/<ruta>` y compárala visualmente con la captura del diseño. Corrige diferencias. Revisa también la consola por errores de React. Apaga el servidor al terminar.
9. Responde al final con: pantallas hechas, interacciones implementadas, cualquier archivo compartido que tocaste, y diferencias conocidas.
