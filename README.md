# Rutina: Resumen Ejecutivo Diario

Rutina automática que genera y envía un resumen ejecutivo diario por Slack a las 6pm CDT.

## Fuentes

1. **Slack** — Actividad del día en canales relevantes
2. **Circleback** — Notas de reuniones (leídas desde Gmail via `notifications@circleback.ai`)
3. **Gmail** — Correos relevantes de DaCodes y clientes (excluye ventas/secuencias)

## Qué incluye el resumen

- Conversaciones importantes de Slack del día
- Por cada llamada Circleback: participantes, temas clave, acuerdos, próximos pasos
- Correos DaCodes + clientes con actividad relevante del día
- Se ignoran: newsletters, correos de ventas externas, secuencias automáticas

## Entrega

Slack DM a `U02G57N1UDP` (Jorge Campos) programado para las **6:00pm CDT** cada día.

## Configuración

La rutina usa los siguientes MCP servers:
- `Slack` — lectura de canales y envío de DM
- `Gmail` — búsqueda y lectura de hilos
- `Circleback` — notas de reuniones (accedido via Gmail)
