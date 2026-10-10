# Fase 4: asignaciones, custodios, flotilla y clientes/oportunidades

Proyecto: /home/user/routines-circleback-gmail-slack/ai27-plataforma. Aplican las reglas de `design/BRIEF_UX.md` (PageHeader + 1 acción azul, Sections plegables, lenguaje llano, Notas, toasts, Pager) y la marca actual (azul #475CC7 / navy #0D1D41 / Montserrat). No cambies componentes compartidos (Shell, Nav, Page, ui, Tour, store, seed) salvo que sea aditivo e imprescindible; menciónalo.

## Modelo nuevo (léelo primero)
- `src/data/asignaciones.ts`: `asignaciones` (cliente ↔ servicio ↔ custodios[] ↔ unidades[] con inicio/fin ISO, horas, estatus Programada/En curso/Terminada, resultado), helpers `asignacionesDeCustodio(id)`, `asignacionesDeUnidad(id)`, `asignacionesDeCliente(nombre)`, `horasSemana(id)`, `inicioSemana(d)`, `consumoDiario(unidadId, dias)` (km, litros, costo, rendimiento, cargo por día) y `HOY_DEMO` (2026-10-07 14:32). Los custodios del diseño (C-1102, C-0877, C-1043, …) tienen agenda de esta semana e historial de 10+ asignaciones.
- `src/lib/store.ts` (acciones nuevas): `crearAsignacion({cliente, servicio, tipo, ruta, custodios[], unidades[], inicio, fin, notas})`, `cambiarEstatusAsignacion`, `enviarATaller({unidad, tipo, falla, proveedor, costo, diasFuera})` (crea orden y pone la unidad En taller), `cerrarOrden(id)` (regresa a Operando), `cambiarEstatusUnidad`, `registrarCarga({unidad, fecha, litros, costo, km, odometro?, nota?})`. Estado: `asignaciones`, `ordenesNuevas`, `cargasNuevas`, `estatusUnidades` (overrides por unidad: úsalo para mostrar el estatus real = override ?? seed).
- Regla de negocio: **a un cliente se le asignan uno o más custodios y una o más unidades, por un tiempo (días y horas)**. Toda pantalla debe hablar de "asignaciones", no de "turnos".

## Verificación
`npx tsc --noEmit` limpio; Playwright 1440×900 en tu puerto: captura inicial, clic en cada acción (modales, guardar, tabs, filtros, filas), consola sin errores; 1 botón azul por pantalla; apaga el servidor. Reporta qué quedó visible/plegado, acciones y archivos tocados.
