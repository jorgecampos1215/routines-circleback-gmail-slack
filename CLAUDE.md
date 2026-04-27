# Rutinas Diarias — DaCodes Executive Summary

## Resumen Ejecutivo Diario (6pm)

Genera y envía un resumen ejecutivo diario a Slack con la siguiente información:

### Instrucciones de ejecución

Correr este prompt en una sesión de Claude Code con los MCP de Slack, Circleback y Gmail activos:

```
Genera un resumen diario ejecutivo con la siguiente información:

1. **Slack**: Resume las conversaciones más importantes del día.

2. **Circleback**: Resume las llamadas del día.
   Incluye: participantes, temas clave, acuerdos y próximos pasos.

3. **Gmail**: Revisa correos del dia, mandame resumen de correos de todo lo que involucre gente de dacodes y clientes con los que interactuamos. Ignora gente que nos manda correos para vender o correos que mandamos en secuencias.

Formato: usa encabezados claros, bullet points y sé conciso.
Envía el resumen como DM en Slack al usuario U02G57N1UDP.
```

### MCP Servers requeridos
- **Slack** (`mcp__Slack__*`) — para leer y enviar mensajes
- **Circleback** (`mcp__Circleback__*`) — para obtener llamadas del día
- **Gmail** (`mcp__Gmail__*`) — para revisar correos relevantes

### Notas
- El usuario de Slack para DM es `U02G57N1UDP` (Jorge Campos)
- Ignorar: secuencias de ventas, newsletters, notificaciones automáticas, LinkedIn ads
- Incluir: threads con clientes, emails de/a @dacodes.com, acuerdos y acciones pendientes
