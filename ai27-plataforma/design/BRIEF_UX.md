# Fase 3: UX simple de entender y explicar (sin perder funciones)

Proyecto: /home/user/routines-circleback-gmail-slack/ai27-plataforma. Ya está hecho el rebranding (logo `src/components/Logo.tsx`, azul #475CC7 / navy #0D1D41, Montserrat). NO cambies colores ni fuentes. Pedido del cliente: "hacer la plataforma más simple para que se pueda entender; mejorar todo el UX para que sea simple de entender, explicar y tenga todo".

## Principios (aplícalos en cada pantalla)
1. **Una pantalla, una idea.** Arriba un `PageHeader` (src/components/Page.tsx) con: sección, título corto en lenguaje llano, UNA frase que explique qué hace la pantalla y para quién, y UNA sola acción principal azul (`accion`). Las demás acciones van como secundarias (botón blanco) o dentro de la sección a la que pertenecen. Nunca más de un botón azul visible al mismo tiempo.
2. **Lo esencial primero, el detalle plegado.** Lo que el usuario necesita en el 80% de los casos va arriba y abierto. Paneles secundarios (tarifas editables, bitácoras largas, consola de monitoristas, auditoría, kanban, turnos, mapas de calor, etc.) van en `<Section plegable abierto={false}>` con un título claro y una línea de ayuda (`ayuda=`). Se conserva TODO lo que existe; solo se ordena.
3. **Lenguaje de la operación, no de sistema.** Títulos y etiquetas en palabras que diría un coordinador: "Asignar custodios" (no "Asignación IA"), "Mapa en vivo", "Incidentes", "Equipo", "Cotizaciones", "App del custodio". Nada de siglas sin explicar; "IA" solo como adjetivo ("sugerencia de la IA"). Cada tarjeta de IA empieza con qué recomienda y un botón con verbo ("Asignar a Rafael Uc").
4. **Guía del flujo.** En Cotizador, Asignación, Monitoreo y Reacción pon `<Pasos actual={N} />` debajo del header (1 Cotizar → 2 Asignar custodios → 3 Monitorear → 4 Atender incidente). Al terminar cada paso, el botón principal lleva al siguiente ("Aceptada → asignar custodios").
5. **Secciones con título y ayuda.** Usa `<Section titulo ayuda>` para cada bloque en vez de tarjetas sin título. Máximo 3 bloques visibles sin scroll a 1440×900 en la primera vista.
6. **Tablas legibles.** Buscador + 1–2 filtros máximo visibles; el resto dentro de "Más filtros". Columnas esenciales (5–7); el detalle al hacer clic en la fila (panel lateral o modal). Paginación con `Pager`.
7. **Estados vacíos y confirmaciones.** Cada acción confirma con `useToast` en una frase clara ("Cotización enviada a Marsh"). Si una lista queda vacía, texto de ayuda ("Sin custodios con este filtro. Prueba con otra zona.").
8. **Consistencia.** Mismo orden en todas las pantallas: Header → (Pasos) → sugerencia de IA (si aplica, una sola tarjeta) → KPIs (máx. 4–6) → contenido principal → secciones plegadas. Botón primario siempre arriba a la derecha.
9. **Ayuda inline.** Donde haya un concepto (riesgo 1.4, margen objetivo, huecos de cobertura, geocerca) agrega un `<Nota>` de una línea explicándolo.

## Reglas técnicas
- Edita solo tus pantallas en `src/pages/`. Componentes compartidos: `Shell`, `Nav`, `Logo`, `ui.tsx` (Modal, Field, Toast, Pager), `Page.tsx` (PageHeader, Pasos, Section, Nota). Si necesitas algo nuevo, créalo dentro de tu página.
- No elimines funcionalidad ni datos: todo botón que hoy funciona debe seguir funcionando (puede moverse a una sección plegada o a un menú "Más").
- Las clases `.card .lbl .mono .btn .btn-pri .pill .p-*` ya existen globalmente (`src/global.css`); puedes seguir usando el CSS propio de la pantalla.
- `npx tsc --noEmit` sin errores. Prueba con Playwright a 1440px (puerto asignado) tu pantalla: captura inicial + clic en cada botón principal/secundario, consola sin errores. Verifica a 1440×900 que la primera vista se entiende sola (header + explicación + acción principal). Apaga el servidor al terminar.
- Reporta: qué quedó visible en la primera vista, qué quedó plegado, cambios de texto/nombres, y archivos tocados.
