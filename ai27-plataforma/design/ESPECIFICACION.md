# AI27 · Plataforma de operación de custodia — especificación para desarrollo

Este paquete trae el diseño completo del demo. Úsalo junto con las capturas (`capturas/`) y el HTML estático (`html/`), que son la referencia visual exacta.

## 1. Stack sugerido

- React + TypeScript + Vite, Tailwind CSS y shadcn/ui (el mismo stack de Lovable).
- Supabase para base de datos, auth y storage.
- Recharts para las gráficas.
- Mapbox GL (o Google Maps) para el mapa en vivo.
- Telemetría: un adaptador por proveedor (Samsara y Ruptela) que normaliza a un solo modelo de eventos. En el demo se simula.
- IA: un endpoint (edge function) que recibe la pregunta y el rol del usuario, consulta la base y devuelve `{texto, grafica?, tabla?, accion?}`.

## 2. Sistema visual

Los tokens están en `tokens/tokens.css`.

- Tema claro y limpio: fondo `#F6F7F9`, tarjetas blancas con borde `#E4E8ED` y radio de 10 px. Sin sombras.
- Tipografía: Archivo para títulos y KPIs, IBM Plex Sans para la interfaz, IBM Plex Mono para IDs, montos y horas.
- Acento ámbar `#F2A93B`, reservado para el botón primario, la selección activa y las alertas de IA. Los enlaces van en `#B36B00` por contraste.
- Estados como píldoras: ok (verde), advertencia (ámbar), crítico (rojo), info (azul), neutro (gris).
- Layout: sidebar de 240 px más contenido fluido con padding de 28/32 px. Las grillas usan `repeat(auto-fit, minmax(…, 1fr))` y en celular el menú se apila arriba.
- Los controles miden 40 px de alto (44 px en el portal y el móvil). Los iconos son de trazo, estilo Lucide, a 18 px.

### Componentes recurrentes

| Componente | Uso |
|---|---|
| Tarjeta KPI | Etiqueta en mayúsculas de 12 px, valor en Archivo de 26 a 32 px y nota de 13 px |
| Tarjeta de sugerencia IA | Fondo `#FFF8EC`, borde `#F3D9A8`, ícono de destello, título, texto, mini gráfica (220×64) y botón |
| Píldora de estado | `pill p-ok / p-warn / p-bad / p-info / p-mute` |
| Barra horizontal | Etiqueta, track gris, relleno de color y valor en mono |
| Tabla | Encabezados en mayúsculas de 12 px, filas de 12 px de padding y divisor `#EEF1F4`; scroll horizontal en móvil |
| Tabs | Botones; el activo con fondo `#FFF1DB` y borde ámbar |
| Kanban | Columnas `#F3F5F8` con tarjetas blancas (reclutamiento, pipeline comercial) |
| Bitácora o timeline | Hora en mono, punto de color y evento |

## 3. Navegación (sidebar)

- **Operación:** Dashboard · Asistente IA · Servicios · Asignación IA · Monitoreo en vivo · Reacción
- **Recursos:** Custodios · Flotilla y taller · Personas (RH)
- **Comercial:** Cotizador · Clientes y CRM · Finanzas
- **Administración:** Reportes · Mi portal · Usuarios y roles · Vista custodio

En la parte baja del sidebar van el estado de las fuentes de telemetría (Samsara principal, Ruptela secundaria) y el usuario con su rol.

## 4. Pantallas

| # | Pantalla | Archivo | Qué hace |
|---|---|---|---|
| 00 | Flujo del demo | Flujo | Mapa del guion de 15 a 20 min, con enlaces a cada pantalla |
| 01 | Dashboard directivo | Main | Filtros por periodo, zona, cliente y tipo; 6 KPIs; alertas priorizadas; custodios por zona con huecos; ingresos por tipo; seguridad; comercial y RH; asistente de preguntas rápidas |
| 01b | Asistente IA | AsistenteIA | Chat con preguntas sugeridas; responde con texto, gráfica (barras, barras agrupadas, línea) o tabla, y un botón de acción |
| 02 | Servicios | Servicios | Tabs Todos, Evento, Dedicado y Monitoreo; tabla de servicios; detalle del servicio con estatus, bitácora y evidencias; consola de monitoristas con su carga |
| 03 | Asignación IA | AsignacionIA | Datos del servicio y requisitos; ranking de custodios con puntaje, explicación y factores (cercanía, descanso, experiencia, desempeño); asignar o descartar (se registra para entrenar); unidad sugerida; detección de huecos a 48 h |
| 04 | Monitoreo en vivo | Monitoreo | Mapa con tráileres, custodios y desvíos; filtro por fuente; replay de ruta; alerta crítica; feed de eventos; contadores |
| 05 | Reacción | Reaccion | Stepper (detección → autoridades → equipo → búsqueda → recuperación → cierre); tiempos; bitácora minuto a minuto; resultado (total, parcial, pérdida); evidencias; mapa de calor por carretera y horario |
| 05b | Reporte post-incidente | ReporteIncidente | Documento para el cliente: resumen, línea de tiempo, evidencias, recomendaciones; enviar o descargar PDF |
| 06 | Custodios | Custodios | Contadores por estatus como filtro; tabla; expediente lateral (documentos y vigencias, historial); turnos de la semana |
| 07 | Flotilla y taller | Flotilla | KPIs; tabs Unidades, Taller y Combustible; vencimientos; costo total por unidad |
| 08 | Personas (RH) | RH | Toda la empresa: KPIs, altas y bajas por mes, personas por área; tabs Directorio (tarjetas con foto y perfil con sueldo, vacaciones, historial y documentos), Altas y bajas, Onboarding (checklist), Offboarding, Vacaciones (aprobar o rechazar), Reclutamiento (kanban) |
| 08b | Portal del colaborador | PortalColaborador | Autoservicio: inicio, solicitud de vacaciones, permisos e incapacidad, recibos de nómina PDF y XML, documentos y trámites a RH |
| 09 | Usuarios y roles | Usuarios | 9 roles; matriz de módulo × acción (ver, crear, editar, aprobar); alcance por zona y cliente; bitácora de auditoría |
| 10 | Cotizador | Cotizador | Tabs Evento, Dedicado y Monitoreo; distancia, tiempo, casetas y riesgo; custodios y unidades; horario; desglose de costos, margen 35% y precio; formato de cotización; generar PDF; aceptar y convertir en servicio; tarifas base por zona editables |
| 10b | Cotización PDF | CotizacionPDF | Hoja carta 816×1056 lista para PDF |
| 11 | Clientes y CRM | CRM | Lista de clientes y vista 360; tabla de todos los clientes; pipeline kanban |
| 12 | Finanzas | Finanzas | KPIs; rentabilidad por cliente, servicio o unidad; gastos por categoría; cuentas por cobrar con antigüedad |
| 14 | Reportes | Reportes | Reporte generado con IA; filtros; biblioteca por área; vista previa con KPIs, gráfica y lectura de IA; exportar PDF o Excel; envíos programados |
| 13 | Vista custodio | CustodioMovil | Web móvil 390×844: servicio actual, check-in, parada, evidencia, botón de pánico, próximo turno |

## 5. Flujo principal del demo

1. Dashboard
2. Cotizador (por evento) → PDF → aceptar
3. Asignación IA
4. Monitoreo: alerta de desvío de Samsara
5. Reacción
6. Reporte al cliente
7. Vistas rápidas: Flotilla, Personas y Finanzas

## 6. Modelo de datos (mínimo)

- `zonas` (Centro, Bajío, Occidente, Noreste, Golfo, Sureste, Noroeste)
- `clientes`, `contactos`, `contratos`, `tarifas` (por zona y por cliente)
- `cotizaciones` → `servicios` (tipo: evento, dedicado o monitoreo; estatus: cotizado, confirmado, en tránsito, entregado, con incidente, cerrado)
- `asignaciones` (servicio, custodio y unidad; decisión de la IA: aceptada, cambiada o rechazada)
- `colaboradores` (todas las áreas; los custodios tienen certificaciones, portación y evaluaciones de confianza), `documentos` (con vigencia), `turnos`, `sueldos_historial`, `vacaciones_solicitudes`, `movimientos` (alta o baja), `onboarding_tareas`, `vacantes`, `candidatos`
- `unidades`, `ordenes_taller`, `siniestros`, `cargas_combustible`
- `eventos_telemetria` (fuente: samsara o ruptela; tipo; lat/lng; velocidad; fecha), `geocercas`, `alertas`
- `incidentes`, `incidente_bitacora`, `evidencias`
- `facturas` (registro sin timbrado), `gastos`
- `usuarios`, `roles`, `permisos` (módulo × acción × alcance), `auditoria`
- `reportes_programados`

Datos dummy: 400 custodios en 7 zonas, 486 colaboradores en total, 600 unidades, 25 clientes (incluye Alpura y Marsh), 300 servicios del trimestre, 40 incidentes con 3 o 4 casos de reacción completos, y 3 meses de taller y combustible. Los valores de ejemplo están dentro de cada archivo de `fuente/`, en el bloque `renderVals()`.

## 7. IA en la plataforma

- Asignación de custodios: ranking con explicación según cercanía, disponibilidad, descanso, experiencia en la ruta o con el cliente, desempeño, certificaciones y riesgo.
- Detección de huecos de cobertura por zona.
- Asistente conversacional con gráficas, que respeta los permisos del rol.
- Sugerencias contextuales por módulo:
  - patrón de robo (Monitoreo)
  - ruta de escape (Reacción)
  - fatiga (Custodios)
  - mantenimiento predictivo y consumo anómalo (Flotilla)
  - riesgo de rotación (Personas)
  - siguiente mejor acción (CRM)
  - precio sugerido (Cotizador)
  - proyección de cobranza (Finanzas)
  - riesgo de retraso (Servicios)
- Reportes generados desde lenguaje natural.

## 8. Fuera del demo

Facturación CFDI real, nómina real, conexión productiva a Samsara y Ruptela, y app nativa para custodios (en el demo se muestra como web móvil).
