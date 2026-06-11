Genera un resumen ejecutivo diario y envíalo por Slack DM al usuario (Slack user ID: U02G57N1UDP).

## Instrucciones de recopilación

### 1. SLACK
- Busca conversaciones del día de hoy usando `mcp__Slack__slack_search_public_and_private` con `after:<fecha-de-hoy>` y también con query sobre temas de trabajo/proyecto/cliente.
- Resume las 5-8 conversaciones más importantes: canal, participantes, tema, decisiones o bloqueos.
- Ignora mensajes automáticos/bots.

### 2. CIRCLEBACK
- Busca emails de `notifications@circleback.ai` del día de hoy usando `mcp__Gmail__search_threads` con query: `from:notifications@circleback.ai newer_than:1d`
- Para cada reunión encontrada, usa `mcp__Gmail__get_thread` para obtener el contenido completo.
- Extrae: nombre de reunión, participantes, temas clave, acuerdos, próximos pasos.

### 3. GMAIL
- Busca con `mcp__Gmail__search_threads` usando query: `newer_than:1d -category:promotions -from:noreply -from:no-reply`
- Filtra SOLO correos relevantes que involucren:
  - Personas de DaCodes (dominio @dacodes.com o @dacodes.ai)
  - Clientes con los que DaCodes trabaja activamente
- IGNORA: correos de ventas/prospección enviados en secuencias automáticas (los que salen de jorge.campos@dacodes.ai a prospectos), newsletters, notificaciones de servicios (Airbnb, Vistage, etc.)

## Formato del mensaje Slack

Usa este formato exacto al enviar el DM:

```
📋 *Resumen Ejecutivo Diario — [FECHA]*

---

*📱 SLACK — Conversaciones Importantes*
• [bullet por conversación relevante]

---

*📞 CIRCLEBACK — Llamadas del Día*
[Por cada reunión:]
*🔵 [Nombre de reunión]*
Participantes: [lista]
• [temas clave]
Próximos pasos: [acciones]

---

*📧 GMAIL — Correos Relevantes (DaCodes + Clientes)*
• [emoji estado] *[Asunto]*: [resumen de 1 línea]

---
_Generado automáticamente por Claude | DaCodes Daily Briefing_
```

## Notas importantes
- Hoy es: usa la fecha actual del sistema
- Sé conciso: máximo 1-2 líneas por item
- Prioriza items con acciones pendientes, bloqueos o decisiones importantes
- El mensaje completo no debe superar 4000 caracteres
