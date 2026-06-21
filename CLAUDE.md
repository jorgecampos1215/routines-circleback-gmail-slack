# Resumen Ejecutivo Diario — Routine 6 PM

Este routine se ejecuta todos los días a las **6:00 PM** y genera un resumen ejecutivo diario enviado por Slack DM al usuario.

## Qué hacer en cada ejecución

### 1. Obtener actividad de Slack del día
- Usar `mcp__Slack__slack_search_public_and_private` con `after:<fecha_hoy>` para buscar mensajes del día.
- Si no hay actividad hoy (fin de semana o día sin mensajes), buscar con `after:<fecha_ayer>` para incluir lo más reciente.
- Enfocarse en: DMs con mencionas de clientes, leads, candidatos, negociaciones. Ignorar mensajes de bots y notificaciones automáticas.

### 2. Obtener llamadas de Circleback
- Usar las herramientas `mcp__Circleback__*` para listar las llamadas/notas del día.
- Para cada llamada incluir: participantes, temas clave, acuerdos alcanzados, próximos pasos.
- Si Circleback no está disponible, indicarlo claramente en el resumen.

### 3. Obtener correos relevantes de Gmail
- Usar `mcp__Gmail__search_threads` con query: `after:<fecha_hoy> in:inbox -category:promotions -category:social`
- **Incluir solo** correos que involucren:
  - Personas con dominio `@dacodes.com` o `@dacodes`
  - Clientes o prospectos con los que DaCodes interactúa
  - Temas operativos: staffing, proyectos, facturación, RRHH
- **Excluir** correos de:
  - Servicios de ventas/outreach (LeadVista, HubSpot sequences, etc.)
  - Servicios personales (Airbnb, Telcel, CFE, servicios de streaming)
  - Notificaciones automáticas sin acción (Workable candidate digests, recibos de SaaS tools)
  - Newsletters y promociones

### 4. Armar y enviar el resumen por Slack
- Enviar DM al usuario (`channel_id: U02G57N1UDP`) con el resumen en el siguiente formato:
  - Emojis de encabezado para escaneo rápido
  - Bullet points concisos
  - Sección de "Próximo paso" `:pushpin:` para cada item accionable
  - Indicar si alguna fuente (Circleback, etc.) no estuvo disponible
- **No enviar notificación** si no hay nada relevante que reportar ese día.

## Formato del mensaje

```
:clipboard: *Resumen Ejecutivo Diario — [Día] [Fecha]*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

:speech_balloon: *SLACK — Conversaciones Relevantes*
[contenido]

:phone: *CIRCLEBACK — Llamadas del Día*
[contenido o aviso de no disponibilidad]

:email: *GMAIL — Correos Relevantes (DaCodes y Clientes)*
[contenido]

_Resumen generado automáticamente a las 6:00 PM_
```

## Prioridades de contenido

- 🔴 **Alta**: bajas de personal, pendientes urgentes con clientes, problemas de facturación
- 🟡 **Media**: seguimiento de leads, candidatos en proceso, renovaciones de contratos
- 🟢 **Baja**: menciones en canales, cumpleaños de equipo, notificaciones informativas

## Notas importantes
- El usuario es **Jorge Campos** (`jorge.campos@dacodes.com`)
- Su Slack user_id es `U02G57N1UDP`
- DaCodes es una empresa de staffing tecnológico / nearshore
- Clientes clave recurrentes: Simplificamos tu Mundo, The Mice Group, TD Synnex, entre otros
- Si el servidor de Circleback no está disponible, indicarlo y continuar con Slack y Gmail
