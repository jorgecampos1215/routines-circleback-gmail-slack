# Fase 2: datos reales en las tablas y todos los botones funcionando

Proyecto: /home/user/routines-circleback-gmail-slack/ai27-plataforma (Vite + React 19 + TS). Las pantallas ya existen en `src/pages/` y coinciden con el diseño (`design/capturas`). NO cambies el diseño visual; solo conecta datos y haz que todo funcione.

Pedido del cliente (textual): "poder ver data más real al darle click a Disponible y así, que salgan los números reales. Igual que todos los botones sirvan".

## 1. Datos reales: `src/data/seed.ts` (léelo completo primero)
Ya trae listas completas y determinísticas cuyos totales coinciden con los números del diseño:
- `custodios` (400; `conteoCustodios()` da 400/65/54/258/14/6/3; por zona coincide con el Dashboard). Las 10 filas del diseño van primero con sus datos exactos. Cada custodio trae `documentos`, `turnos`, `telefono`, `ingreso`, etc.
- `unidades` (600: 546 operando, 31 taller), `ordenesTaller` (48), `cargasCombustible` (120).
- `servicios` (300; 86 activos = 34 evento + 41 dedicado + 11 monitoreo), `incidentes` (40), `colaboradores` (486, por área), `clientes` (25 con contacto, ingresos, margen, CxC).
Regla: toda tabla, contador, filtro o KPI que en el diseño tenía filas fijas ahora se calcula desde estas listas. Al hacer clic en un contador/filtro/tab la tabla muestra TODAS las filas reales de ese filtro (con paginación `usePagination`/`Pager` de `src/components/ui.tsx`, 25 por página, o scroll). Los textos/cifras "hero" del diseño (p. ej. SRV-24817 de Alpura, la alerta de desvío, el caso de Reacción) se conservan: las filas del diseño ya están al inicio de las listas; si una pantalla tiene datos que no están en seed (p. ej. bitácoras, kanban), mantenlos en la página.
Si necesitas datos adicionales, créalos en `src/data/<pantalla>.ts` derivándolos de seed; NO edites seed.ts (lo comparten varios agentes).

## 2. Todos los botones sirven
Recorre TODA tu pantalla y lista cada botón, link, select, input, pill clicable, ícono de acción y fila. Ninguno puede quedar sin efecto. Efectos válidos:
- Navegar a otra ruta (`Link`/`useNavigate`, `ROUTES`).
- Abrir un `Modal` (de `src/components/ui.tsx`) con un formulario realista (`Field`, `inputStyle`, `btnStyle`, `btnPriStyle`) que al guardar agrega/modifica datos en la pantalla (estado local o `store.ts`) y confirma con `useToast()`.
- Cambiar estado visible (filtrar, ordenar, seleccionar, expandir, marcar).
- Acciones "externas" (enviar correo, llamar, exportar, imprimir): ejecuta lo que se pueda (window.print(), descarga CSV) Y muestra un toast que lo confirme ("Cotización enviada a Marsh por correo").
Los `<select>` de filtros deben filtrar de verdad (periodo, zona, cliente, tipo). Los campos de búsqueda buscan. Los encabezados de tabla ordenan al hacer clic si es razonable.
Nada de `alert()`/`confirm()`. No cambies estilos salvo lo mínimo para estados nuevos (hover/activo ya existen en el diseño).

## 3. Reglas
- Solo edita tus pantallas en `src/pages/`. `main.tsx` ya monta `ToastProvider`. Puedes agregar acciones/campos a `src/lib/store.ts` SOLO de forma aditiva y mencionándolo.
- `npx tsc --noEmit` sin errores. Levanta `npx vite --port <PUERTO>` en background, prueba con Playwright (`require('/opt/node-tools/node_modules/playwright')`, chromium en /opt/pw-browsers) a 1440px: haz clic en cada botón/filtro de tu pantalla por script y verifica que cambia algo; revisa consola sin errores; captura final para comparar con `design/capturas`. Apaga el servidor al terminar.
- Reporta al final: lista de botones y qué hace cada uno, qué datos ahora vienen de seed, archivos tocados.
