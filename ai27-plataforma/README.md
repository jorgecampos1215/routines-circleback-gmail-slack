# AI27 · Plataforma de operación de custodia (demo)

Demo navegable con datos ficticios. Lo construí a partir del diseño (`design/`) y del documento de requerimientos.

## Correr local

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # genera dist/ estático (se puede abrir desde cualquier hosting)
npm run preview
```

## Stack
React 19 + TypeScript + Vite, react-router (HashRouter), Recharts. No hay backend: el estado del demo vive en `src/lib/store.ts`, en memoria y en localStorage. Está hecho para cambiarlo por Supabase sin tocar las pantallas.

## Estructura
- `src/pages/` tiene una pantalla por archivo y replica el `.dc.html` correspondiente de `design/fuente/`.
- `src/components/Shell.tsx` y `Nav.tsx` son el layout con el sidebar de 4 grupos.
- `src/lib/sx.ts` convierte los estilos inline del diseño en objetos de React, para que los estilos queden igual al diseño.
- `src/lib/store.ts` guarda el estado compartido: las vacaciones que se piden en el portal llegan a RH, los servicios creados en el cotizador aparecen en Servicios y se registran las decisiones de la asignación IA.
- `src/lib/telemetria.ts` es el adaptador común de Samsara y Ruptela, con un simulador de eventos.
- `src/data/seed.ts` tiene la seed data: 400 custodios en 7 zonas, 600 unidades, 25 clientes, 300 servicios y 40 incidentes.

## Rutas
| Ruta | Pantalla |
|---|---|
| `#/` | Dashboard directivo |
| `#/flujo` | Flujo del demo (guion) |
| `#/asistente` | Asistente IA |
| `#/servicios` | Servicios |
| `#/asignacion` | Asignación IA |
| `#/monitoreo` | Monitoreo en vivo |
| `#/reaccion` · `#/reaccion/reporte` | Reacción y reporte post-incidente |
| `#/custodios` | Custodios |
| `#/flotilla` | Flotilla y taller |
| `#/personas` · `#/mi-portal` | RH y portal del colaborador |
| `#/usuarios` | Usuarios y roles |
| `#/cotizador` · `#/cotizador/pdf` | Cotizador y cotización PDF |
| `#/clientes` | Clientes y CRM |
| `#/finanzas` | Finanzas |
| `#/reportes` | Reportes |
| `#/custodio` | Vista móvil del custodio |
